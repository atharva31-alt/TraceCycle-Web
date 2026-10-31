/* Notifications with filters and read / unread state. */

const NOTE_ICON = { pickup: "scale", handoff: "truck", flag: "alert", processed: "factory", system: "bell", request: "truck" };

function viewNotes() {
  const mine = D.notes.filter((n) => n.user === S.user.id);
  const filter = S.noteFilter || "all";
  const shownNotes = mine.filter((n) => filter === "all" || (filter === "unread" ? !n.read : (n.kind || "system") === filter));
  const kinds = ["all", "unread", "request", "pickup", "handoff", "flag", "processed"].filter((k) => k === "all" || k === "unread" || mine.some((n) => (n.kind || "system") === k));
  return `<div class="page" style="padding-top:32px">${header(t("nt.title"), t("nt.sub", { n: mine.filter((n) => !n.read).length }), mine.some((n) => !n.read) ? `<button class="btn secondary" data-act="readAll">${icon("check")}${esc(t("nt.markAll"))}</button>` : "")}
    <div class="seg" role="group" aria-label="${esc(t("nt.filter"))}" style="margin-bottom:14px;flex-wrap:wrap">${kinds.map((k) => `<button data-act="noteFilter" data-k="${k}" aria-pressed="${filter === k}">${esc(t("nt.k." + k))}</button>`).join("")}</div>
    ${shownNotes.length ? `<ul class="list card" style="padding:0">${shownNotes.slice(0, 100).map((n) => `
      <li class="row-item" style="margin:0;border-bottom:1px solid var(--line)">
        <span style="color:${(n.kind || "system") === "flag" ? "var(--danger-ink)" : "var(--link)"}">${icon(NOTE_ICON[n.kind || "system"])}</span>
        <span class="grow"><span style="${n.read ? "" : "font-weight:600"}">${esc(n.msg)}</span><br><time class="small muted">${esc(when(n.at))}</time>
          ${noteActions(n)}</span>
        ${n.code && bag(n.code) && n.kind === "pickup" ? `<span class="note-qr" aria-hidden="true">${qrSvg(n.code)}</span>` : ""}
        ${n.read ? "" : `<button class="btn ghost sm" data-act="readOne" data-id="${n.id}">${esc(t("nt.markOne"))}</button>`}
      </li>`).join("")}</ul>` : `<div class="empty">${esc(t("nt.empty"))}</div>`}</div>`;
}

function noteActions(n) {
  const out = [];
  if (n.code && bag(n.code)) {
    out.push(`<button class="btn secondary sm" data-act="passport" data-code="${n.code}">${icon("route", 14)}${esc(t("nt.passport"))}</button>`);
    out.push(`<button class="btn wa sm" data-act="whatsapp" data-code="${n.code}">${icon("share", 14)}WhatsApp</button>`);
  }
  if (n.kind === "request" && n.req) {
    const r = D.requests.find((x) => x.id === n.req);
    if (r && r.status === "requested" && r.dispatch.offeredTo === S.user.id) out.push(`<button class="btn success sm" data-act="go" data-view="collector">${esc(t("nt.openRequest"))}</button>`);
    else if (r) out.push(`<span class="xs muted">${esc(t(r.collector === S.user.id ? "nt.reqYours" : "nt.reqGone"))}</span>`);
  }
  return out.length ? `<span class="note-actions">${out.join("")}</span>` : "";
}
