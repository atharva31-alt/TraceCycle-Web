/* Maps. One description (points, lines, areas) is drawn two ways:
   - a real, zoomable map (Leaflet with OpenStreetMap and satellite tiles) when Leaflet has loaded;
   - a simple SVG village sketch otherwise (offline, or inside claude.ai where map tiles are blocked).
   Views call mapBlock(config); render() calls mountMaps() afterwards. */

// The sample village. D.geoOffset moves the whole demo village (for "show around my location").
const BASE_BOX = { latMin: 30.2835, latMax: 30.2995, lngMin: 78.0800, lngMax: 78.1080 };
const BASE_WARDS = { 1: [30.2960, 78.0860], 2: [30.2960, 78.0950], 3: [30.2960, 78.1040], 4: [30.2880, 78.0860], 5: [30.2880, 78.0950], 6: [30.2880, 78.1040] };
const BOX = { ...BASE_BOX, w: 640, h: 380 };
const WARD_CENTRES = {};
function applyGeoOffset() {
  const o = (typeof D !== "undefined" && D?.geoOffset) || { lat: 0, lng: 0 };
  Object.assign(BOX, { latMin: BASE_BOX.latMin + o.lat, latMax: BASE_BOX.latMax + o.lat, lngMin: BASE_BOX.lngMin + o.lng, lngMax: BASE_BOX.lngMax + o.lng });
  Object.entries(BASE_WARDS).forEach(([w, [lat, lng]]) => { WARD_CENTRES[w] = [lat + o.lat, lng + o.lng]; });
}
applyGeoOffset();

// Moves every place in the demo data so the village sits around (lat, lng). Distances stay the same.
function relocateVillage(lat, lng) {
  const centreLat = (BOX.latMin + BOX.latMax) / 2, centreLng = (BOX.lngMin + BOX.lngMax) / 2;
  const dLat = lat - centreLat, dLng = lng - centreLng;
  const move = (p) => { if (typeof p.lat === "number") { p.lat = +(p.lat + dLat).toFixed(6); p.lng = +(p.lng + dLng).toFixed(6); } };
  D.users.forEach(move);
  D.requests.forEach(move);
  D.geoOffset = { lat: (D.geoOffset?.lat || 0) + dLat, lng: (D.geoOffset?.lng || 0) + dLng };
  applyGeoOffset();
  MEMO.clear();
}
// Which ward a point is in (nearest ward centre); null when it is far outside the village.
function wardAt(p) {
  let best = null, bestKm = Infinity;
  Object.entries(WARD_CENTRES).forEach(([w, [lat, lng]]) => { const km = haversine(p, { lat, lng }); if (km < bestKm) { bestKm = km; best = +w; } });
  return bestKm <= 1.5 ? best : null;
}
const insideVillage = (lat, lng) => lat >= BOX.latMin - 0.01 && lat <= BOX.latMax + 0.01 && lng >= BOX.lngMin - 0.01 && lng <= BOX.lngMax + 0.01;
const xy = (p) => [((p.lng - BOX.lngMin) / (BOX.lngMax - BOX.lngMin)) * BOX.w, ((BOX.latMax - p.lat) / (BOX.latMax - BOX.latMin)) * BOX.h];

let MAP_CONFIGS = [];
let LIVE_MAPS = [];

// Live maps need the internet for tiles; claude.ai blocks outside tiles, so the sketch is used there.
const canLiveMap = () => !window.claude?.use && !S.leafletFailed && (typeof navigator === "undefined" || navigator.onLine !== false);
const liveMapsOn = () => Boolean(window.L) && canLiveMap();

let leafletLoading = null;
function ensureLeaflet() {
  if (window.L) return Promise.resolve();
  if (!leafletLoading) {
    leafletLoading = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
      js.onload = () => (window.L ? resolve() : reject(new Error("leaflet")));
      js.onerror = () => reject(new Error("leaflet"));
      document.head.appendChild(js);
    });
  }
  return leafletLoading;
}

/* ---------------------------------------------------------------- SVG sketch */

function mapBase() {
  return `<rect width="640" height="380" fill="var(--map-bg)"/>
    <rect x="20" y="20" width="120" height="70" fill="var(--map-field)"/><rect x="470" y="250" width="150" height="90" fill="var(--map-field)"/><rect x="250" y="290" width="110" height="70" fill="var(--map-field)"/>
    <path d="M0 200 C120 180 200 225 320 195 S520 160 640 185" stroke="var(--map-water)" stroke-width="14" fill="none"/>
    <path d="M0 262 L640 238" stroke="var(--map-edge)" stroke-width="12" fill="none"/><path d="M0 262 L640 238" stroke="var(--map-road)" stroke-width="9" fill="none"/>
    <path d="M318 0 L332 380" stroke="var(--map-edge)" stroke-width="12" fill="none"/><path d="M318 0 L332 380" stroke="var(--map-road)" stroke-width="9" fill="none"/>
    <path d="M70 0 L190 380" stroke="var(--map-road)" stroke-width="6" fill="none"/><path d="M332 110 L640 80" stroke="var(--map-road)" stroke-width="6" fill="none"/><path d="M0 70 L318 110" stroke="var(--map-road)" stroke-width="6" fill="none"/>`;
}

function svgPoint(p) {
  const [x, y] = xy(p).map((v) => v.toFixed(1));
  const label = esc(p.text ?? "");
  if (p.type === "num") {
    return `<g><circle cx="${x}" cy="${y}" r="13" fill="${p.color}" stroke="#fff" stroke-width="2.5"/><text x="${x}" y="${(+y + 4.5).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="600" fill="${p.fg || "#fff"}" font-family="Noto Sans, sans-serif">${label}</text></g>`;
  }
  if (p.type === "tag") {
    const w = Math.max(28, String(p.text).length * 9 + 12);
    return `<g><rect x="${(x - w / 2).toFixed(1)}" y="${(y - 14).toFixed(1)}" width="${w}" height="28" rx="4" fill="${p.color}" stroke="#fff" stroke-width="2.5"/><text x="${x}" y="${(+y + 4.5).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="600" fill="#fff" font-family="Noto Sans, sans-serif">${label}</text></g>`;
  }
  if (p.type === "ring") return `<circle cx="${x}" cy="${y}" r="8" fill="#fff" stroke="${p.color}" stroke-width="3"/>`;
  if (p.type === "pin") {
    return `<path transform="translate(${(x - 17).toFixed(1)} ${(y - 43).toFixed(1)})" d="M17 43C17 43 3 26 3 16a14 14 0 0 1 28 0c0 10-14 27-14 27z" fill="#B42318" stroke="#fff" stroke-width="2"/><circle cx="${x}" cy="${(y - 27).toFixed(1)}" r="5" fill="#fff"/>`;
  }
  return `<circle cx="${x}" cy="${y}" r="6" fill="${p.color}" stroke="#fff" stroke-width="1.5"/>`;
}

function svgMap(cfg) {
  const areas = (cfg.areas || []).map((a) => {
    const [x, y] = xy(a);
    return `<g><rect x="${(x - 95).toFixed(0)}" y="${(y - 75).toFixed(0)}" width="190" height="145" fill="${a.color}" fill-opacity="${a.opacity}" stroke="var(--line-strong)" stroke-dasharray="4 4"/>
      <text x="${(x - 85).toFixed(0)}" y="${(y - 55).toFixed(0)}" font-size="13" font-weight="600" fill="#1C2430" font-family="Noto Sans">${esc(a.text)}</text></g>`;
  }).join("");
  const lines = (cfg.lines || []).map((l) => {
    const pts = l.path.map((p) => xy(p).map((v) => v.toFixed(1)).join(",")).join(" ");
    return `<polyline points="${pts}" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>
      <polyline points="${pts}" fill="none" stroke="${l.color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" ${l.dash ? 'stroke-dasharray="9 7"' : ""}/>`;
  }).join("");
  return `<svg class="map" viewBox="0 0 640 380" role="img" aria-label="${esc(cfg.label)}" ${cfg.pin ? 'data-act="pin" style="cursor:crosshair"' : ""}>${mapBase()}${areas}${lines}${(cfg.points || []).map(svgPoint).join("")}</svg>`;
}

/* ---------------------------------------------------------------- live map */

function mapBlock(cfg) {
  const id = `map-${MAP_CONFIGS.length}`;
  MAP_CONFIGS.push({ ...cfg, id });
  const height = cfg.height || 380;
  return `<div class="map-wrap" id="${id}" style="--map-h:${height}px" role="region" aria-label="${esc(cfg.label)}">${svgMap(cfg)}</div>
    ${canLiveMap() ? "" : `<p class="xs muted" style="margin-top:6px">${esc(t("map.sketch"))}</p>`}`;
}

function divIcon(html, size) {
  return L.divIcon({ className: "tc-marker", html, iconSize: size, iconAnchor: [size[0] / 2, size[1] / 2] });
}

function leafletPoint(p) {
  const tip = p.tip || p.text || "";
  let layer;
  if (p.type === "num") {
    layer = L.marker([p.lat, p.lng], { icon: divIcon(`<span class="mk-num" style="background:${p.color};color:${p.fg || "#fff"}">${esc(p.text)}</span>`, [30, 30]), keyboard: true, title: tip });
  } else if (p.type === "tag") {
    const w = Math.max(30, String(p.text).length * 9 + 14);
    layer = L.marker([p.lat, p.lng], { icon: divIcon(`<span class="mk-tag" style="background:${p.color}">${esc(p.text)}</span>`, [w, 30]), keyboard: true, title: tip });
  } else if (p.type === "pin") {
    layer = L.marker([p.lat, p.lng], {
      draggable: true, keyboard: true, title: tip,
      icon: L.divIcon({ className: "tc-marker", iconSize: [34, 44], iconAnchor: [17, 43],
        html: `<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 43C17 43 3 26 3 16a14 14 0 0 1 28 0c0 10-14 27-14 27z" fill="#B42318" stroke="#fff" stroke-width="2"/><circle cx="17" cy="16" r="5" fill="#fff"/></svg>` }),
    });
  } else if (p.type === "ring") {
    layer = L.circleMarker([p.lat, p.lng], { radius: 8, color: p.color, weight: 3, fillColor: "#fff", fillOpacity: 1 });
  } else {
    layer = L.circleMarker([p.lat, p.lng], { radius: 6, color: "#fff", weight: 1.5, fillColor: p.color, fillOpacity: 0.95 });
  }
  if (tip) layer.bindTooltip(esc(tip), { direction: "top" });
  return layer;
}

function mountMaps() {
  LIVE_MAPS.forEach((m) => m.remove());
  LIVE_MAPS = [];
  if (!MAP_CONFIGS.length || !canLiveMap()) return;
  if (!window.L) {
    const pending = MAP_CONFIGS;
    ensureLeaflet()
      .then(() => { if (MAP_CONFIGS === pending) mountMaps(); }) // still on the same screen
      .catch(() => { S.leafletFailed = true; });
    return;
  }

  MAP_CONFIGS.forEach((cfg) => {
    const el = document.getElementById(cfg.id);
    if (!el) return;
    el.innerHTML = "";
    el.classList.add("live");
    const map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
    const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" });
    const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Tiles &copy; Esri" });
    const labels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Labels &copy; Esri" });
    const useStreet = S.mapLayer === "street";
    (useStreet ? street : satellite).addTo(map);
    if (!useStreet) labels.addTo(map);
    L.control.layers({ [t("map.satellite")]: satellite, [t("map.street")]: street }, { [t("map.labels")]: labels }, { position: "topright" }).addTo(map);
    map.on("baselayerchange", (e) => { S.mapLayer = e.layer === satellite ? "satellite" : "street"; });

    const coords = [];
    (cfg.areas || []).forEach((a) => {
      L.circle([a.lat, a.lng], { radius: a.radius || 350, color: a.color, weight: 1, fillColor: a.color, fillOpacity: a.opacity })
        .bindTooltip(esc(a.text), { permanent: true, direction: "center", className: "tc-area-label" }).addTo(map);
      coords.push([a.lat, a.lng]);
    });
    (cfg.lines || []).forEach((l) => {
      const path = l.path.map((p) => [p.lat, p.lng]);
      L.polyline(path, { color: "#fff", weight: 8, opacity: 0.9 }).addTo(map);
      L.polyline(path, { color: l.color, weight: 4, dashArray: l.dash ? "9 7" : null }).addTo(map);
      coords.push(...path);
    });
    (cfg.points || []).forEach((p) => {
      const layer = leafletPoint(p).addTo(map);
      coords.push([p.lat, p.lng]);
      if (p.type === "pin") {
        layer.on("dragend", () => { const ll = layer.getLatLng(); setPin(ll.lat, ll.lng); });
        map.on("click", (e) => { layer.setLatLng(e.latlng); setPin(e.latlng.lat, e.latlng.lng); });
      }
    });

    if (cfg.pin) map.setView(coords[0], 17);
    else if (coords.length > 1) map.fitBounds(coords, { padding: [30, 30], maxZoom: 17 });
    else if (coords.length === 1) map.setView(coords[0], 16);
    else map.setView([30.2915, 78.0940], 15);
    LIVE_MAPS.push(map);
  });
}

// Moving the pin updates the form without redrawing the page (so the map keeps its zoom).
function setPin(lat, lng) {
  if (!S.book) return;
  S.book.lat = +lat.toFixed(6);
  S.book.lng = +lng.toFixed(6);
  S.book.locMsg = "";
  const label = document.getElementById("pin-coords");
  if (label) label.textContent = `${S.book.lat.toFixed(5)}, ${S.book.lng.toFixed(5)}`;
  const ward = wardAt(S.book) || S.user?.ward;
  if (S.book.shownWard && ward !== S.book.shownWard) { S.book.shownWard = ward; render(); return; }
  S.book.shownWard = ward;
  const nearby = document.getElementById("nearby");
  if (nearby && typeof nearbyList === "function") nearby.innerHTML = nearbyList(S.book);
}
