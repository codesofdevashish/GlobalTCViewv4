"""
Global weather fields for the live map (GFS 1-degree analysis, NOAA, free, no key).

Downloads only the needed messages of gfs.tHHz.pgrb2.1p00.f000 using its .idx byte index
(NOMADS first, then the NOAA open-data mirror on AWS), and writes compact files for the browser:

  public/data/wx/meta.json        cycle time, grid, levels, value ranges
  public/data/wx/surface.json     mslp (hPa), pwat (mm), sst (deg C, land = missing), u10/v10 (m/s)
  public/data/wx/lev_<p>.json     u, v (m/s), hgt (m), rh (%) at p hPa, p in LEVELS

Each field is quantised to 8 bits between its min and max (value = min + byte / 254 * (max - min);
255 = missing) and base64-encoded. Grid: 181 x 360, row 0 = 90 N, column 0 = 0 E, 1-degree spacing.
"""
import base64, json, os
import numpy as np
import pandas as pd
import requests

LEVELS = [1000, 850, 700, 500, 300, 200]
SOURCES = ["https://nomads.ncep.noaa.gov/pub/data/nccf/com/gfs/prod", "https://noaa-gfs-bdp-pds.s3.amazonaws.com"]
WANT = [(v, f"{p} mb") for p in LEVELS for v in ("UGRD", "VGRD", "HGT", "RH")] + [
    ("PRMSL", "mean sea level"), ("PWAT", "entire atmosphere (considered as a single layer)"),
    ("TMP", "surface"), ("LAND", "surface"), ("UGRD", "10 m above ground"), ("VGRD", "10 m above ground")]
NY, NX = 181, 360


def _decode(msg):
    import eccodes
    h = eccodes.codes_new_from_message(msg)
    try:
        ni, nj = eccodes.codes_get(h, "Ni"), eccodes.codes_get(h, "Nj")
        v = eccodes.codes_get_values(h).reshape(nj, ni).astype("float32")
        la0 = eccodes.codes_get(h, "latitudeOfFirstGridPointInDegrees")
        if la0 < 0: v = v[::-1]                                   # make row 0 = 90 N
        return v
    finally:
        eccodes.codes_release(h)


def fetch(cycle, sess=None):
    """{(var, level): 2-D array} for one GFS cycle, or None."""
    sess = sess or requests.Session(); sess.headers.setdefault("User-Agent", "tc3d-site/1.0")
    d, h = f"{cycle:%Y%m%d}", f"{cycle:%H}"
    name = f"gfs.t{h}z.pgrb2.1p00.f000"
    for base in SOURCES:
        url = f"{base}/gfs.{d}/{h}/atmos/{name}"
        try:
            r = sess.get(url + ".idx", timeout=60)
            if r.status_code != 200: continue
            lines = [l.split(":") for l in r.text.strip().splitlines()]
            out = {}
            for i, l in enumerate(lines):
                if len(l) < 6: continue
                key = (l[3], l[4])
                if key not in WANT or key in out or l[5] != "anl": continue
                start = int(l[1]); end = int(lines[i + 1][1]) - 1 if i + 1 < len(lines) else ""
                g = sess.get(url, headers={"Range": f"bytes={start}-{end}"}, timeout=120)
                if g.status_code in (200, 206): out[key] = _decode(g.content)
            if len(out) >= len(WANT) - 2:
                print(f"weather fields: {len(out)} messages from {base.split('/')[2]} for {cycle:%Y-%m-%d %H} UTC")
                return out
        except Exception as e:
            print("  weather fields:", type(e).__name__, e)
    return None


def _enc(a, lo=None, hi=None, mask=None):
    a = np.asarray(a, "float64")
    good = np.isfinite(a) if mask is None else (np.isfinite(a) & ~mask)
    lo = float(np.nanmin(a[good])) if lo is None else lo; hi = float(np.nanmax(a[good])) if hi is None else hi
    q = np.clip(np.round((a - lo) / max(hi - lo, 1e-6) * 254), 0, 254)
    q[~good] = 255
    return dict(min=round(lo, 3), max=round(hi, 3), b64=base64.b64encode(q.astype(np.uint8).tobytes()).decode())


def write(fields, cycle, public):
    out = os.path.join(public, "data", "wx"); os.makedirs(out, exist_ok=True)
    F = lambda v, l: fields.get((v, l))
    land = F("LAND", "surface"); land = (land > 0.5) if land is not None else None
    surf = {}
    if F("PRMSL", "mean sea level") is not None: surf["mslp"] = _enc(F("PRMSL", "mean sea level") / 100)
    if F("PWAT", "entire atmosphere (considered as a single layer)") is not None:
        surf["pwat"] = _enc(F("PWAT", "entire atmosphere (considered as a single layer)"), 0, 80)
    if F("TMP", "surface") is not None:
        sst = F("TMP", "surface") - 273.15
        surf["sst"] = _enc(sst, -2, 34, mask=(land if land is not None else np.zeros(sst.shape, bool)) | (sst < -2.5))
    if F("UGRD", "10 m above ground") is not None:
        surf["u"] = _enc(F("UGRD", "10 m above ground"), -40, 40); surf["v"] = _enc(F("VGRD", "10 m above ground"), -40, 40)
    json.dump(surf, open(os.path.join(out, "surface.json"), "w"), separators=(",", ":"))
    done = []
    for p in LEVELS:
        lv = {}
        for key, var, lo, hi in (("u", "UGRD", -100, 100), ("v", "VGRD", -100, 100), ("hgt", "HGT", None, None), ("rh", "RH", 0, 100)):
            a = F(var, f"{p} mb")
            if a is not None: lv[key] = _enc(a, lo, hi)
        if "u" in lv and "v" in lv:
            json.dump(lv, open(os.path.join(out, f"lev_{p}.json"), "w"), separators=(",", ":")); done.append(p)
    meta = dict(cycle=pd.Timestamp(cycle).strftime("%Y-%m-%dT%H:%MZ"), levels=done, grid=dict(ny=NY, nx=NX, lat0=90, lon0=0, d=1),
                surface=sorted(surf), source="NOAA GFS 1-degree analysis")
    json.dump(meta, open(os.path.join(out, "meta.json"), "w"))
    return meta


def build(public, latest=None):
    """Newest cycle with data (tries the last 4 cycles from `latest`, or from now)."""
    t = pd.Timestamp(latest) if latest is not None else (pd.Timestamp.now("UTC").tz_localize(None) - pd.Timedelta(hours=4)).floor("6h")
    for k in range(4):
        cyc = t - pd.Timedelta(hours=6 * k)
        f = fetch(cyc)
        if f: return write(f, cyc, public)
    print("weather fields: no GFS 1-degree analysis found")
    return None
