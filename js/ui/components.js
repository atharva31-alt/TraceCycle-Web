/* Icons, status chips, QR codes, breadcrumbs and page headers. */

const ICON = {
  check: "M5 12l5 5L19 7", alert: "M12 4l9 16H3z M12 10v4 M12 17.5v.5", truck: "M3 7h11v9H3z M14 10h4l3 3v3h-7 M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4z M10 20a2 2 0 0 0 4 0", box: "M3 8l9-5 9 5v8l-9 5-9-5z M3 8l9 5 9-5 M12 13v8", scale: "M12 3v3 M5 7h14 M7 7l-3 7a3 3 0 0 0 6 0z M17 7l-3 7a3 3 0 0 0 6 0z M8 21h8 M12 7v14",
  shield: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z M9 12l2 2 4-4", shieldOff: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z M9.5 9.5l5 5 M14.5 9.5l-5 5",
  camera: "M4 8h3l2-3h6l2 3h3v11H4z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", volume: "M4 9v6h4l5 4V5L8 9z M16 9a4 4 0 0 1 0 6", printer: "M7 9V3h10v6 M7 17H4v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6h-3 M7 14h10v7H7z",
  x: "M6 6l12 12 M18 6L6 18", logout: "M15 4h4v16h-4 M10 8l-4 4 4 4 M6 12h10", factory: "M3 21V11l6 3V11l6 3V7l6 3v11z", qr: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h2v2h-2z M18 18h2v2h-2z",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7 M20 5v6h-6",
  download: "M12 4v11 M7 10l5 5 5-5 M4 20h16",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M5 11a7 7 0 0 0 14 0 M12 18v3",
  locate: "M12 2v3 M12 19v3 M2 12h3 M19 12h3 M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  home: "M4 11l8-7 8 7v9h-5v-6H9v6H4z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4",
  share: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M8.6 13.5l6.8 4 M15.4 6.5l-6.8 4",
  plus: "M12 5v14 M5 12h14",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  leaf: "M5 19c0-8 6-14 15-14 0 9-6 15-14 15 M5 19l7-7",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z", info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v6 M12 7.5v.5", route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7",
};
const icon = (n, size = 18) => !ICON[n] ? "" : `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:0 0 auto"><path d="${ICON[n]}"/></svg>`;
const LOGO = `<svg width="46" height="46" viewBox="0 0 52 52" aria-hidden="true"><rect width="52" height="52" rx="6" fill="#1A3A6B"/><path d="M17 27a9 9 0 1 1 3.4 7" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M15 31.5l5.6 3.2 1.4-6" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="26" cy="26" r="3" fill="#7FC28F"/></svg>`;
const STATUS_LOOK = { requested: ["warning", "truck"], scheduled: ["warning", "scale"], picked_up: ["info", "scale"], in_transit: ["warning", "truck"], at_aggregator: ["info", "box"], merged: ["", "box"], at_recycler: ["info", "factory"], processed: ["success", "check"], open: ["warning", "alert"], resolved: ["success", "check"] };
const chip = (st) => { const [tone, ic] = STATUS_LOOK[st] || ["", "info"]; return `<span class="pill ${tone}">${icon(ic, 13)}${esc(t("st." + st))}</span>`; };
const pill = (text, tone = "") => `<span class="pill ${tone}">${esc(text)}</span>`;

function qrSvg(text) {
  if (!window.qrcode) return `<div class="muted small" style="width:132px;height:132px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line)">QR</div>`;
  const q = window.qrcode(0, "M"); q.addData(text); q.make();
  return q.createSvgTag(4, 2);
}

function crumbs(items) {
  return `<nav class="crumbs" aria-label="Breadcrumb"><button data-act="go" data-view="home">${esc(t("nav.home"))}</button>${items.map(([label, view]) => ` / ${view ? `<button data-act="go" data-view="${view}">${esc(label)}</button>` : `<span aria-current="page">${esc(label)}</span>`}`).join("")}</nav>`;
}
function header(title, sub, actions = "", trail = []) {
  return `${crumbs([...trail, [title]])}<div class="head"><div><h1>${esc(title)}</h1>${sub ? `<p class="muted" style="margin-top:4px">${esc(sub)}</p>` : ""}</div>${actions ? `<div style="display:flex;flex-wrap:wrap;gap:8px">${actions}</div>` : ""}</div>`;
}

// Compact summary strip used at the top of the role pages. items: [{ k: label, v: value, n: note, tone }]
function tiles(items) {
  const colour = { success: "var(--leaf-ink)", danger: "var(--danger-ink)", warning: "var(--saffron-ink)" };
  return `<dl class="summary">${items.map((i) => `
    <div><dt>${esc(i.k)}</dt><dd class="num" ${i.tone ? `style="color:${colour[i.tone]}"` : ""}>${i.v}</dd>${i.n ? `<dd class="note">${esc(i.n)}</dd>` : ""}</div>`).join("")}</dl>`;
}

// Camera scan area used in the receive dialog and on the track page.
function scanBlock(targetId) {
  return `<div class="scan">
    <button type="button" class="btn secondary sm" data-act="scanStart" data-target="${targetId}">${icon("camera", 16)}${esc(t("scan.start"))}</button>
    <div class="scan-view" id="scan-${targetId}" hidden><video muted playsinline aria-label="${esc(t("scan.video"))}"></video>
      <button type="button" class="btn ghost sm" data-act="scanStop">${esc(t("scan.stop"))}</button></div>
    <p class="hint" id="scan-msg-${targetId}" role="status"></p>
  </div>`;
}
