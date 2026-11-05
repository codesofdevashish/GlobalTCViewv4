/* GlobalTCView shell: views (Today, Live map, Storm analysis, Learn), plain-language storm summaries,
   the "is a cyclone heading for you" check, live-map controls and the Learn diagrams. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, attrs = {}, kids = []) => { const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k === "text") n.textContent = v; else if (k === "html") n.innerHTML = v; else n.setAttribute(k, v); }
    for (const k of [].concat(kids)) if (k != null) n.append(k); return n; };
  const KMH = 1.852, MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const toMs = (s) => Date.parse(String(s).replace(" ", "T").replace(/(\d)$/, "$1Z"));
  const when = (ms) => { const d = new Date(ms); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}, ${String(d.getUTCHours()).padStart(2, "0")}:00 UTC`; };
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const catVar = (kt) => kt >= 137 ? "--c5" : kt >= 113 ? "--c4" : kt >= 96 ? "--c3" : kt >= 83 ? "--c2" : kt >= 64 ? "--c1" : kt >= 34 ? "--ts" : "--td";
  const IMD = [[120, "Super Cyclonic Storm"], [90, "Extremely Severe Cyclonic Storm"], [64, "Very Severe Cyclonic Storm"], [48, "Severe Cyclonic Storm"], [34, "Cyclonic Storm"], [28, "Deep Depression"], [17, "Depression"]];
  const className = (s, kt) => {
    if (s.basin === "A" || s.basin === "B") { const c = IMD.find(([t]) => kt * 0.93 >= t); return c ? c[1] : "Low pressure area"; }
    if (kt >= 64) return `${["L", "E", "C"].includes(s.basin) ? "Hurricane" : s.basin === "W" ? "Typhoon" : "Severe tropical cyclone"}, category ${kt < 83 ? 1 : kt < 96 ? 2 : kt < 113 ? 3 : kt < 137 ? 4 : 5}`;
    return kt >= 34 ? "Tropical storm" : "Tropical depression";
  };
  const km = (a, b) => { const p = Math.PI / 180, dl = (b[1] - a[1]) * p, dn = (b[0] - a[0]) * p;
    const h = Math.sin(dl / 2) ** 2 + Math.cos(a[1] * p) * Math.cos(b[1] * p) * Math.sin(dn / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
  const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  const bearing = (a, b) => { const p = Math.PI / 180, y = Math.sin((b[0] - a[0]) * p) * Math.cos(b[1] * p),
    x = Math.cos(a[1] * p) * Math.sin(b[1] * p) - Math.sin(a[1] * p) * Math.cos(b[1] * p) * Math.cos((b[0] - a[0]) * p); return (Math.atan2(y, x) / p + 360) % 360; };
  const dir8 = (deg) => COMPASS[Math.round(deg / 45) % 8];
  const fmtKm = (d) => (d >= 1000 ? `${(Math.round(d / 50) * 50).toLocaleString("en")} km` : `${Math.round(d / 10) * 10} km`);

  // coastal towns most exposed to tropical cyclones, [name, country, lat, lon]
  const TOWNS = [["Chennai", "India", 13.08, 80.27], ["Puducherry", "India", 11.93, 79.83], ["Nellore", "India", 14.44, 79.99], ["Machilipatnam", "India", 16.19, 81.14],
    ["Kakinada", "India", 16.99, 82.25], ["Visakhapatnam", "India", 17.69, 83.22], ["Srikakulam", "India", 18.3, 83.9], ["Gopalpur", "India", 19.26, 84.9],
    ["Puri", "India", 19.81, 85.83], ["Bhubaneswar", "India", 20.3, 85.82], ["Paradip", "India", 20.32, 86.61], ["Balasore", "India", 21.49, 86.93],
    ["Digha", "India", 21.63, 87.51], ["Kolkata", "India", 22.57, 88.36], ["Port Blair", "India", 11.62, 92.73], ["Kanyakumari", "India", 8.08, 77.55],
    ["Thiruvananthapuram", "India", 8.52, 76.94], ["Kochi", "India", 9.93, 76.27], ["Mangaluru", "India", 12.91, 74.86], ["Panaji", "India", 15.49, 73.83],
    ["Mumbai", "India", 19.08, 72.88], ["Veraval", "India", 20.91, 70.37], ["Porbandar", "India", 21.64, 69.6], ["Kandla", "India", 23.03, 70.22],
    ["Khulna", "Bangladesh", 22.85, 89.54], ["Barishal", "Bangladesh", 22.7, 90.37], ["Dhaka", "Bangladesh", 23.81, 90.41], ["Chattogram", "Bangladesh", 22.36, 91.78],
    ["Cox's Bazar", "Bangladesh", 21.43, 92.0], ["Sittwe", "Myanmar", 20.15, 92.9], ["Yangon", "Myanmar", 16.87, 96.2], ["Colombo", "Sri Lanka", 6.93, 79.86],
    ["Trincomalee", "Sri Lanka", 8.59, 81.23], ["Karachi", "Pakistan", 24.86, 67.0], ["Muscat", "Oman", 23.59, 58.41], ["Salalah", "Oman", 17.02, 54.09],
    ["Aden", "Yemen", 12.79, 45.02], ["Manila", "Philippines", 14.6, 120.98], ["Tacloban", "Philippines", 11.24, 125.0], ["Da Nang", "Vietnam", 16.05, 108.2],
    ["Hanoi", "Vietnam", 21.03, 105.85], ["Hong Kong", "China", 22.32, 114.17], ["Haikou", "China", 20.04, 110.32], ["Shanghai", "China", 31.23, 121.47],
    ["Taipei", "Taiwan", 25.03, 121.57], ["Naha", "Japan", 26.21, 127.68], ["Tokyo", "Japan", 35.68, 139.69], ["Busan", "South Korea", 35.18, 129.08],
    ["Guam", "USA", 13.44, 144.79], ["Darwin", "Australia", -12.46, 130.84], ["Cairns", "Australia", -16.92, 145.77], ["Broome", "Australia", -17.96, 122.24],
    ["Suva", "Fiji", -18.14, 178.44], ["Nouméa", "New Caledonia", -22.27, 166.46], ["Port Vila", "Vanuatu", -17.73, 168.32], ["Apia", "Samoa", -13.83, -171.76],
    ["Port Louis", "Mauritius", -20.16, 57.5], ["Saint-Denis", "Réunion", -20.88, 55.45], ["Antananarivo", "Madagascar", -18.88, 47.51], ["Beira", "Mozambique", -19.84, 34.84],
    ["Maputo", "Mozambique", -25.97, 32.57], ["Miami", "USA", 25.76, -80.19], ["Tampa", "USA", 27.95, -82.46], ["New Orleans", "USA", 29.95, -90.07],
    ["Houston", "USA", 29.76, -95.37], ["San Juan", "Puerto Rico", 18.47, -66.11], ["Havana", "Cuba", 23.11, -82.37], ["Kingston", "Jamaica", 17.97, -76.79],
    ["Santo Domingo", "Dominican Republic", 18.49, -69.93], ["Cancún", "Mexico", 21.16, -86.85], ["Acapulco", "Mexico", 16.85, -99.82], ["Cabo San Lucas", "Mexico", 22.89, -109.92],
    ["Honolulu", "USA", 21.31, -157.86], ["Hamilton", "Bermuda", 32.29, -64.78]];
  const AGENCY = (lat, lon) => {
    const l = ((lon + 540) % 360) - 180;
    if (lat >= 0 && l >= 30 && l < 100) return ["India Meteorological Department (RSMC New Delhi)", "https://rsmcnewdelhi.imd.gov.in/", "national weather services of the region"];
    if (lat >= 0 && l >= 100) return ["Japan Meteorological Agency (RSMC Tokyo)", "https://www.jma.go.jp/bosai/map.html#contents=typhoon&lang=en", "your national weather service"];
    if (lat >= 0 && l < -140) return ["Central Pacific Hurricane Center", "https://www.nhc.noaa.gov/?cpac", "the National Weather Service"];
    if (lat >= 0) return ["US National Hurricane Center", "https://www.nhc.noaa.gov/", "your national weather service"];
    if (l >= 30 && l < 90) return ["Météo-France La Réunion (RSMC)", "https://meteofrance.re/fr/cyclone", "your national weather service"];
    if (l >= 90 && l < 160) return ["Australian Bureau of Meteorology", "https://www.bom.gov.au/cyclone/", "the Bureau of Meteorology"];
    return ["Fiji Meteorological Service (RSMC Nadi)", "https://www.met.gov.fj/", "your national weather service"];
  };
  const nearestTown = (lon, lat) => { let best = null;
    for (const t of TOWNS) { const d = km([lon, lat], [t[3], t[2]]); if (!best || d < best.d) best = { t, d }; } return best; };

  // ---------------------------------------------------------------- data
  let DATA = null, ACTIVE = [], CLIMO = null; const FCS = {};
  const getJSON = (u) => fetch(`${u}${u.includes("?") ? "&" : "?"}v=${Date.now() / 6e5 | 0}`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  function where(s) {
    const n = nearestTown(s.lon, s.lat); if (!n || n.d > 2500) return "over the open ocean";
    return `${fmtKm(n.d)} ${dir8(bearing([n.t[3], n.t[2]], [s.lon, s.lat]))} of ${n.t[0]}, ${n.t[1]}`;
  }
  function motion(s) {
    const tr = s.track || []; if (tr.length < 3) return "";
    const a = tr[tr.length - 3], b = tr[tr.length - 1], h = (toMs(b[0]) - toMs(a[0])) / 36e5; if (!h) return "";
    const d = km([a[2], a[1]], [b[2], b[1]]), v = d / h; if (v < 3) return "almost stationary";
    return `moving ${dir8(bearing([a[2], a[1]], [b[2], b[1]]))} at ${Math.round(v)} km/h`;
  }
  const strengthWord = (s) => (s.dv24 >= 30 ? "and strengthening rapidly" : s.dv24 >= 10 ? "and strengthening" : s.dv24 <= -10 ? "and weakening" : "");

  // ---------------------------------------------------------------- Today
  function today() {
    const n = ACTIVE.filter((s) => !s.invest).length, inv = ACTIVE.filter((s) => s.invest).length, W = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const top = ACTIVE.filter((s) => !s.invest).sort((a, b) => b.vmax_kt - a.vmax_kt)[0];
    let h = !n ? "No tropical cyclones are active anywhere right now." : n === 1
      ? `One tropical cyclone is active: ${top.name}, ${article(className(top, top.vmax_kt))} ${className(top, top.vmax_kt).toLowerCase()} ${where(top)}.`
      : `${W[n] || n} tropical cyclones are active. The strongest is ${top.name}, ${where(top)}.`;
    $("#t-headline").textContent = h;
    $("#t-sub").textContent = inv ? `${inv === 1 ? "One more developing system is" : `${inv} more developing systems are`} being watched and could become cyclones.` : "";
    const gen = DATA && DATA.generated ? toMs(DATA.generated) : NaN;
    $("#t-updated").textContent = isFinite(gen) ? `Updated ${when(gen)} from NOAA's GFS model and the latest official advisories.` : "";
    const ol = $("#t-storms"); ol.textContent = "";
    if (!ACTIVE.length) ol.append(el("li", { class: "row empty" }, [el("p", { text: "Nothing to show today. Past storms are in Storm analysis, under Archive." })]));
    for (const s of ACTIVE.slice().sort((a, b) => b.vmax_kt - a.vmax_kt)) {
      const kmh = Math.round(s.vmax_kt * KMH), mv = motion(s), sw = strengthWord(s);
      const li = el("li", { class: "row", style: `--c:var(${catVar(s.vmax_kt)})` }, [
        el("div", { class: "r-name" }, [el("h3", { text: s.name }), el("p", { text: `${className(s, s.vmax_kt)}${s.invest ? ", not yet named or numbered" : ""}` })]),
        el("p", { class: "r-wind" }, [el("strong", { text: kmh }), el("span", { text: " km/h winds" })]),
        el("p", { class: "r-where", text: `${capital(where(s))}. ${capital(mv)}${mv && sw ? " " : ""}${sw}${mv || sw ? "." : ""}` }),
        el("div", { class: "r-act" }, [btn("Show on live map", () => { show("map"); setTimeout(() => wx && wx.focus(s.lon, s.lat, 2.2), 60); }),
          btn("Open storm analysis", () => openStorm(s.key), "ghost")])]);
      ol.append(li);
    }
  }
  const article = (w) => (/^[aeiou]/i.test(w) ? "an" : "a");
  const capital = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
  const btn = (text, fn, cls = "") => { const b = el("button", { type: "button", class: `btn ${cls}`.trim(), text }); b.addEventListener("click", fn); return b; };

  // ---- is a cyclone heading for you?
  const city = $("#city");
  for (const t of TOWNS.slice().sort((a, b) => a[0].localeCompare(b[0]))) city.append(el("option", { value: `${t[2]},${t[3]},${t[0]}`, text: `${t[0]}, ${t[1]}` }));
  city.addEventListener("change", () => { if (!city.value) return; const [la, lo, nm] = city.value.split(","); setPlace({ lat: +la, lon: +lo, name: nm }); });
  $("#geo").addEventListener("click", () => {
    if (!navigator.geolocation) { place("Your browser cannot share its location. Choose a town instead."); return; }
    place("Finding your location…");
    navigator.geolocation.getCurrentPosition((p) => setPlace({ lat: p.coords.latitude, lon: p.coords.longitude, name: "your location" }),
      () => place("Location was not shared. Choose a town from the list instead."), { timeout: 10000, maximumAge: 6e5 });
  });
  const place = (t) => { const b = $("#place-result"); b.className = "place-result"; b.textContent = t; };
  function setPlace(p) { try { localStorage.setItem("tc-place", JSON.stringify(p)); } catch (e) { /* ignore */ } assess(p); }
  async function assess(p) {
    const box = $("#place-result"); box.textContent = ""; const here = [p.lon, p.lat];
    const rows = [];
    for (const s of ACTIVE) {
      let fc = FCS[s.key]; if (s.forecast && fc === undefined) { try { fc = FCS[s.key] = await getJSON(s.forecast); } catch (e) { fc = FCS[s.key] = null; } }
      const d0 = km(here, [s.lon, s.lat]); let dmin = d0, tmin = 0, src = "now";
      if (fc && fc.mean) for (const [tau, la, lo] of fc.mean) { if (tau > 120) break; const d = km(here, [lo, la]); if (d < dmin) { dmin = d; tmin = tau; src = "forecast"; } }
      rows.push({ s, d0, dmin, tmin, src, fc: !!(fc && fc.mean) });
    }
    rows.sort((a, b) => a.dmin - b.dmin);
    const [ag, agUrl, local] = AGENCY(p.lat, p.lon), r = rows[0];
    let level = "green", head, body;
    if (!r) { head = `No tropical cyclone is active anywhere. Nothing is heading for ${p.name}.`; body = "This page updates several times a day."; }
    else {
      const days = r.tmin ? Math.max(1, Math.round(r.tmin / 24)) : 0, inDays = days ? `in about ${days} day${days > 1 ? "s" : ""}` : "now";
      if (r.dmin <= 150 && r.tmin <= 72 || r.d0 <= 200) level = "red"; else if (r.dmin <= 300 && r.tmin <= 72 || r.dmin <= 150) level = "orange"; else if (r.dmin <= 600) level = "yellow";
      head = level === "green" ? `No cyclone is expected near ${p.name} in the next five days.`
        : `${r.s.name} ${r.src === "forecast" ? `may pass about ${fmtKm(r.dmin)} from ${p.name} ${inDays}` : `is ${fmtKm(r.d0)} from ${p.name}`}.`;
      body = level === "red" ? `This is close enough for dangerous wind, rain and sea. Follow ${ag} and ${local} now and be ready to move to a shelter.`
        : level === "orange" ? `Heavy rain, strong wind and rough sea are possible. Watch the bulletins of ${ag} closely.`
        : level === "yellow" ? `It is still far away, but forecasts can change. Check again tomorrow and follow ${ag}.`
        : `The nearest storm, ${r.s.name}, is ${fmtKm(r.d0)} away${r.fc ? " and is not forecast to come within 600 km" : ""}.`;
    }
    box.className = `place-result lvl-${level}`;
    box.append(el("p", { class: "pr-head", text: head }), el("p", { text: body }),
      el("p", { class: "small" }, ["Official warnings: ", el("a", { href: agUrl, target: "_blank", rel: "noopener", text: ag }), "."]),
      el("p", { class: "small muted", text: r && r.src === "forecast" ? "Based on the average of 31 GFS ensemble forecasts. Distances are to the storm's centre; its winds and rain reach hundreds of kilometres further." : "Distances are to the storm's centre; its winds and rain reach hundreds of kilometres further." }));
  }

  // ---------------------------------------------------------------- live map
  let wx = null;
  const SCALAR_NOTE = { speed: "Wind speed at this height", pwat: "Water vapour in the whole air column", rh: "Relative humidity at this height", sst: "Sea surface temperature (dashed line: 26.5 °C, warm enough for cyclones)" };
  async function initMap() {
    if (wx || !window.WxMap) return;
    wx = window.WxMap.create($("#wx"), { onPick: info, onStorm: (k) => openStorm(k), onRegion: region });
    try {
      const meta = await wx.load("data/wx/");
      const lv = meta.levels; const slider = $("#lv"); slider.max = lv.length - 1; slider.value = Math.max(0, lv.indexOf(850));
      $("#wx-time").textContent = `Weather from NOAA's GFS analysis of ${when(toMs(meta.cycle))}.`;
      levelLabel();
    } catch (e) {
      $("#wx-time").textContent = "Weather layers appear after the next update of the site.";
    }
    wx.setStorms(ACTIVE.map((s) => ({ key: s.key, name: s.name, lon: s.lon, lat: s.lat, vmax_kt: s.vmax_kt, track: s.track, color: css(catVar(s.vmax_kt)) || "#fff" })));
    if (CLIMO && CLIMO.climate) wx.setClimate(CLIMO.climate);
    legend();
  }
  function levelLabel() {
    const lv = wx.levels(), p = lv[+$("#lv").value]; if (!p) return;
    $("#lv-out").textContent = p === 1000 ? "Near the surface (10 m)" : `${p} hPa, ${wx.LEVEL_INFO[p]}`;
    $("#ly-cont-label").textContent = p === 1000 ? "Pressure: isobars, highs and lows" : "Height of this level: troughs and ridges";
  }
  $("#lv").addEventListener("input", async () => { if (!wx) return; levelLabel(); $("#wx-info").hidden = true; await wx.set("level", wx.levels()[+$("#lv").value]); legend(); });
  $("#ly-wind").addEventListener("change", (e) => wx && wx.set("wind", e.target.checked));
  $("#ly-cont").addEventListener("change", (e) => wx && wx.set("contours", e.target.checked));
  $("#ly-storms").addEventListener("change", (e) => wx && wx.set("storms", e.target.checked));
  $$('input[name="scalar"]').forEach((r) => r.addEventListener("change", () => { if (wx && r.checked) { wx.set("scalar", r.value); legend(); } }));
  $$(".chip[data-ov]").forEach((b) => b.addEventListener("click", () => {
    const on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(on)); if (wx) wx.set(b.dataset.ov, on); $("#wx-info").hidden = true;
  }));
  $("#wz-in").addEventListener("click", () => wx && wx.zoomIn()); $("#wz-out").addEventListener("click", () => wx && wx.zoomOut());
  $("#wx-info-x").addEventListener("click", () => { $("#wx-info").hidden = true; });
  function legend() {
    const box = $("#wx-legend"); box.textContent = ""; if (!wx) return;
    const s = wx.get("scalar"); if (s === "none") return; const R = wx.RAMPS[s];
    box.append(el("p", { text: SCALAR_NOTE[s] }), el("div", { class: "bar", style: `background:linear-gradient(90deg,${R.stops.join(",")})` }),
      el("div", { class: "ends" }, [el("span", { text: `${R.lo} ${R.unit}` }), el("span", { text: `${Math.round((R.lo + R.hi) / 2)}` }), el("span", { text: `${R.hi} ${R.unit}` })]));
  }
  function info(r) {
    const b = $("#wx-info-body"); b.textContent = ""; $("#wx-info").hidden = false;
    const lat = `${Math.abs(r.lat).toFixed(1)}°${r.lat >= 0 ? "N" : "S"}`, lo = ((r.lon + 540) % 360) - 180, lon = `${Math.abs(lo).toFixed(1)}°${lo >= 0 ? "E" : "W"}`;
    b.append(el("h3", { text: `${lat}, ${lon}` }),
      el("p", { text: r.wind_kmh != null ? `${r.level === 1000 ? "Near the surface" : `At ${r.level} hPa (${r.levelInfo})`}: wind ${r.wind_kmh} km/h from the ${r.from}${isFinite(r.rh) ? `, humidity ${r.rh}%` : ""}${r.hgt ? `, level height ${r.hgt.toLocaleString("en")} m` : ""}.` : "No wind data here." }),
      el("p", { text: [r.mslp ? `Sea-level pressure ${r.mslp} hPa` : "", isFinite(r.pwat) ? `water vapour ${r.pwat} mm` : "", r.sst != null && isFinite(r.sst) ? `sea temperature ${r.sst.toFixed(1)} °C${r.sst >= 26.5 ? " (warm enough for cyclones)" : ""}` : ""].filter(Boolean).join(", ") + "." }));
  }
  const REGION_TEXT = {
    hadley: () => ["Hadley cell", "Air rises near the equator in the ITCZ, flows poleward high up, sinks around 30° and returns along the surface as the trade winds. Tropical cyclones live inside this cell: they form in its moist air and are steered by the winds around the subtropical highs. Set the height to “Near the surface” to see the trades."],
    ferrel: () => ["Ferrel cell", "Between about 30° and 60°, this cell is driven by the Hadley and polar cells. At the surface it gives the westerlies, which carry weather systems from west to east and often turn tropical cyclones away from the tropics (recurvature)."],
    polar: () => ["Polar cell", "Cold, dense air sinks over the poles and spreads towards lower latitudes as the polar easterlies, meeting milder air at the polar front around 60°."],
    walker: () => { const e = CLIMO && CLIMO.climate && CLIMO.climate.enso;
      return ["Walker circulation", `Along the equatorial Pacific, trade winds push warm water west. Air rises over the warm western Pacific and Maritime Continent, flows east high up, and sinks over the cool eastern Pacific.${e ? ` Right now ENSO is ${e.phase} (Niño 3.4 index ${e.value > 0 ? "+" : ""}${e.value} °C, ${e.season}).` : ""} In El Niño the loop weakens and its rising branch moves east; in La Niña it strengthens.`]; },
    nino34: () => { const e = CLIMO && CLIMO.climate && CLIMO.climate.enso;
      return ["Niño 3.4 region", `5°S–5°N, 170°W–120°W. Its sea temperature compared with normal is the standard measure of El Niño (0.5 °C or more above normal) and La Niña (0.5 °C or more below).${e ? ` Latest value: ${e.value > 0 ? "+" : ""}${e.value} °C (${e.season}), ${e.phase}.` : ""}`]; },
    iodw: () => iodText("west"), iode: () => iodText("east") };
  function iodText(side) { const i = CLIMO && CLIMO.climate && CLIMO.climate.iod;
    return [`Indian Ocean Dipole, ${side} box`, `The dipole index is the sea-temperature difference between the western box (50–70°E, 10°S–10°N) and the eastern box (90–110°E, 10°S–0°). A positive dipole (west warmer) tends to bring more rain to East Africa and India and less to Indonesia and Australia.${i ? ` Latest value: ${i.value > 0 ? "+" : ""}${i.value} (${i.month}), ${i.phase}.` : ""}`]; }
  function region(k) { const [t, x] = REGION_TEXT[k](); const b = $("#wx-info-body"); b.textContent = ""; $("#wx-info").hidden = false; b.append(el("h3", { text: t }), el("p", { text: x })); }

  // ---------------------------------------------------------------- Learn diagrams
  function diagrams() {
    const lab = (x, y, t, a = "middle", c = "var(--ink-2)") => `<text x="${x}" y="${y}" text-anchor="${a}" fill="${c}">${t}</text>`;
    const loop = (x0, x1, up, color) => {                       // one cell: rising at x(up), sinking at the other end
      const xu = up === "l" ? x0 : x1, xd = up === "l" ? x1 : x0, top = 70, bot = 220, r = 22;
      return `<path d="M${xu},${bot - 10} L${xu},${top + r} Q${xu},${top} ${xu + (xd > xu ? r : -r)},${top} L${xd + (xd > xu ? -r : r)},${top} Q${xd},${top} ${xd},${top + r} L${xd},${bot - r} Q${xd},${bot} ${xd + (xd > xu ? -r : r)},${bot} L${xu + (xd > xu ? r : -r)},${bot}"
        fill="none" stroke="${color}" stroke-width="3" marker-end="url(#ah)"/>`;
    };
    const X = (lat) => 40 + (lat + 90) / 180 * 640;
    $("#fig-cells").innerHTML = `<svg viewBox="0 0 720 300" role="img" aria-label="Cross-section of the atmosphere from pole to pole showing the Hadley, Ferrel and polar cells">
      <defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink)"/></marker></defs>
      <rect x="40" y="240" width="640" height="10" fill="var(--soft)"/><path d="M40,95 Q360,30 680,95" fill="none" stroke="var(--line)" stroke-dasharray="4 4"/>
      ${lab(560, 44, "tropopause, the top of the weather layer")}
      ${loop(X(0), X(30), "l", "#e8a33d")}${loop(X(-30), X(0), "r", "#e8a33d")}${loop(X(30), X(60), "r", "#2fa39a")}${loop(X(-60), X(-30), "l", "#2fa39a")}
      ${loop(X(60), X(90) - 6, "l", "#7aa0d6")}${loop(X(-90) + 6, X(-60), "r", "#7aa0d6")}
      ${lab(X(15), 150, "Hadley", "middle", "#b8741c")}${lab(X(-15), 150, "Hadley", "middle", "#b8741c")}${lab(X(45), 150, "Ferrel", "middle", "#1f7d76")}${lab(X(-45), 150, "Ferrel", "middle", "#1f7d76")}
      ${lab(X(75), 150, "Polar", "middle", "#4a72aa")}${lab(X(-75), 150, "Polar", "middle", "#4a72aa")}
      ${[-90, -60, -30, 0, 30, 60, 90].map((l) => lab(X(l), 266, l ? `${Math.abs(l)}°${l > 0 ? "N" : "S"}` : "Equator", "middle", "var(--ink)")).join("")}
      ${lab(X(-75), 286, "polar easterlies")}${lab(X(-45), 286, "westerlies")}${lab(X(-15), 286, "trade winds")}${lab(X(15), 286, "trade winds")}${lab(X(45), 286, "westerlies")}${lab(X(75), 286, "polar easterlies")}
      ${lab(X(0), 60, "ITCZ: rising air", "middle", "var(--ink)")}${lab(X(30), 232, "high: sinking", "middle")}${lab(X(-30), 232, "high: sinking", "middle")}</svg>`;
    const walker = (y0, el) => { const xr = el ? 330 : 150, xs = el ? 600 : 560;
      return `<g transform="translate(0,${y0})"><rect x="40" y="110" width="640" height="10" fill="var(--soft)"/>
        <path d="M${xs},100 L${xr + 30},100" stroke="var(--ink)" stroke-width="${el ? 2 : 3.5}" fill="none" marker-end="url(#ah)"/>
        <path d="M${xr},95 L${xr},25 L${xs - 20},25 L${xs},45 L${xs},90" stroke="#e8a33d" stroke-width="3" fill="none" marker-end="url(#ah)"/>
        <g fill="var(--panel)" stroke="var(--ink-2)"><ellipse cx="${xr}" cy="30" rx="34" ry="14"/><ellipse cx="${xr - 22}" cy="42" rx="24" ry="12"/><ellipse cx="${xr + 24}" cy="42" rx="24" ry="12"/></g>
        ${lab(xr, 68, "rising air, rain")}${lab(xs, 68, "sinking, dry")}${lab((xr + xs) / 2, 140, el ? "weak trade winds: El Niño" : "strong easterly trade winds: normal or La Niña")}
        ${lab(60, 140, "Indonesia", "start")}${lab(670, 140, "South America", "end")}</g>`; };
    $("#fig-walker").innerHTML = `<svg viewBox="0 0 720 330" role="img" aria-label="The Walker circulation in normal conditions and during El Niño">
      <defs><marker id="ah2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink)"/></marker></defs>
      ${walker(5, false).replaceAll("url(#ah)", "url(#ah2)")}${walker(170, true).replaceAll("url(#ah)", "url(#ah2)")}</svg>`;
    $("#fig-tc").innerHTML = `<svg viewBox="0 0 720 260" role="img" aria-label="Cross-section of a tropical cyclone with the eye, eyewall, rain bands, inflow near the sea and outflow aloft">
      <defs><marker id="ah3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink)"/></marker></defs>
      <rect x="20" y="215" width="680" height="16" fill="#2f8fc4" opacity=".55"/>${lab(360, 252, "warm sea, at least about 26.5 °C: the storm's fuel")}
      <g fill="var(--panel)" stroke="var(--ink-2)"><path d="M300,210 C290,120 300,60 330,40 L340,210 Z"/><path d="M420,210 C430,120 420,60 390,40 L380,210 Z"/>
      <path d="M150,210 C150,170 170,140 200,135 L215,210 Z"/><path d="M570,210 C570,170 550,140 520,135 L505,210 Z"/><path d="M70,210 C75,185 90,175 110,172 L120,210 Z"/><path d="M650,210 C645,185 630,175 610,172 L600,210 Z"/></g>
      <path d="M40,205 L285,205" stroke="var(--ink)" stroke-width="2.5" marker-end="url(#ah3)"/><path d="M680,205 L435,205" stroke="var(--ink)" stroke-width="2.5" marker-end="url(#ah3)"/>
      <path d="M335,32 C300,15 200,15 90,40" stroke="#e8a33d" stroke-width="2.5" fill="none" marker-end="url(#ah3)"/><path d="M385,32 C420,15 520,15 630,40" stroke="#e8a33d" stroke-width="2.5" fill="none" marker-end="url(#ah3)"/>
      ${lab(360, 130, "eye: calm,")}${lab(360, 146, "sinking air")}${lab(255, 100, "eyewall", "end")}${lab(465, 100, "eyewall", "start")}${lab(180, 125, "rain bands")}
      ${lab(140, 197, "moist air spirals in")}${lab(560, 12, "outflow aloft")}</svg>`;
  }

  // ---------------------------------------------------------------- navigation
  const VIEWS = { today: "today", map: "map", storms: "analysis", learn: "learn" };
  function show(v) {
    document.body.dataset.view = v;
    for (const s of $$(".view")) s.hidden = s.id !== `view-${v}`;
    for (const a of $$(".views a")) a.setAttribute("aria-current", a.dataset.view === v ? "page" : "false");
    if (v === "map") { initMap(); if (wx) { wx.pause(false); requestAnimationFrame(() => wx.redraw()); } } else if (wx) wx.pause(true);
    if (v === "analysis") requestAnimationFrame(() => { window.dispatchEvent(new Event("resize")); if (window.TCDash) window.TCDash.refresh(); });
    const want = v === "analysis" ? null : `#${Object.keys(VIEWS).find((k) => VIEWS[k] === v)}`;
    if (want && location.hash !== want) history.replaceState(null, "", want);
    window.scrollTo(0, 0);
  }
  function route() {
    const h = location.hash.slice(1);
    if (/(^|&)storm=/.test(h)) { show("analysis"); return; }
    show(VIEWS[h] || "today");
  }
  function openStorm(key) { show("analysis"); const go = () => { if (window.TCDash && window.TCDash.open(key)) return; setTimeout(go, 200); }; go(); }
  window.addEventListener("hashchange", route);
  $$(".views a").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); show(a.dataset.view); }));
  $("#brand").addEventListener("click", (e) => { e.preventDefault(); show("today"); });
  $$("[data-goto]").forEach((b) => b.addEventListener("click", async () => {
    show("map"); await initMap(); if (!wx) return; const g = b.dataset.goto;
    const press = (ov) => { const c = $(`.chip[data-ov="${ov}"]`); if (c && c.getAttribute("aria-pressed") !== "true") c.click(); };
    if (g === "cells") { press("cells"); const i = wx.levels().indexOf(1000); if (i >= 0) { $("#lv").value = i; $("#lv").dispatchEvent(new Event("input")); } setScalar("pwat"); wx.focus(30, 5, 1); }
    if (g === "walker") { press("walker"); wx.focus(-160, 0, 1.2); }
    if (g === "nino") { press("nino"); setScalar("sst"); wx.focus(-150, 0, 1); }
    if (g === "sst") { setScalar("sst"); wx.focus(88, 12, 1.3); }
  }));
  function setScalar(v) { const r = $(`input[name="scalar"][value="${v}"]`); if (r) { r.checked = true; r.dispatchEvent(new Event("change")); } }

  // ---------------------------------------------------------------- start
  diagrams(); route();
  getJSON("data/storms.json").then((d) => {
    DATA = d; ACTIVE = (d.storms || []).filter((s) => s.status === "active" && s.track && s.track.length);
    today();
    try { const p = JSON.parse(localStorage.getItem("tc-place") || "null"); if (p) { assess(p); const o = [...city.options].find((x) => x.value.endsWith(`,${p.name}`)); if (o) city.value = o.value; } } catch (e) { /* ignore */ }
    if (wx) wx.setStorms(ACTIVE.map((s) => ({ key: s.key, name: s.name, lon: s.lon, lat: s.lat, vmax_kt: s.vmax_kt, track: s.track, color: css(catVar(s.vmax_kt)) || "#fff" })));
  }).catch(() => { $("#t-headline").textContent = "The storm list could not be loaded. It is created by the site's regular update."; });
  getJSON("data/climo.json").then((d) => {
    CLIMO = d; if (wx && d.climate) wx.setClimate(d.climate);
    const e = d.climate && d.climate.enso, n = $("#l-enso-now");
    if (e) { n.hidden = false; n.textContent = `Right now: ${e.phase} (Niño 3.4 index ${e.value > 0 ? "+" : ""}${e.value} °C, ${e.season}).`; }
  }).catch(() => {});
  window.TCShell = { show };
})();
