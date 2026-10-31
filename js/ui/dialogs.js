/* Dialogs (native <dialog>) and toast messages. */

const dlg = document.getElementById("dlg");
function openDialog(title, body, foot) {
  dlg.innerHTML = `<div class="dlg-head"><h2 id="dlg-title">${esc(title)}</h2><button class="icon-btn" data-act="closeDlg" aria-label="${esc(t("close"))}">${icon("x")}</button></div><div class="dlg-body">${body}</div>${foot ? `<div class="dlg-foot">${foot}</div>` : ""}`;
  if (!dlg.open) dlg.showModal();
  dlg.querySelector("input:not([type=hidden]), select, textarea")?.focus();
}
const closeDialog = () => dlg.open && dlg.close();
// action: { label, act, data: { key: value } } adds one button that runs a normal data-act action.
function toast(msg, tone = "success", action = null) {
  const el = document.createElement("div");
  el.className = `toast ${tone}`;
  el.textContent = msg;
  if (action) {
    const b = document.createElement("button");
    b.className = "toast-btn";
    b.textContent = action.label;
    b.dataset.act = action.act;
    Object.entries(action.data || {}).forEach(([k, v]) => { b.dataset[k] = v; });
    b.addEventListener("click", () => el.remove());
    el.appendChild(b);
  }
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), action ? 9000 : tone === "success" ? 4500 : 8000);
}
const fieldError = (id, msg) => { const e = dlg.querySelector(`#${id}-err`); if (e) e.textContent = msg || ""; const i = dlg.querySelector(`#${id}`); if (i) i.setAttribute("aria-invalid", msg ? "true" : "false"); };
const field = (id, label, extra = "", hint = "") => `<div><label class="label" for="${id}">${esc(label)}</label><input id="${id}" class="input num" ${extra} aria-describedby="${id}-err ${id}-hint">${hint ? `<p class="hint" id="${id}-hint">${esc(hint)}</p>` : ""}<p class="error" id="${id}-err" role="alert"></p></div>`;
function weightOk(id, value) {
  if (!(value > 0)) { fieldError(id, t("v.weight")); return false; }
  if (value > 500) { fieldError(id, t("v.high")); return false; }
  fieldError(id, ""); return true;
}

const dialogs = {
  confirmPickup(id) {
    const r = D.requests.find((x) => x.id === id);
    openDialog(t("col.confirmTitle"), `<form id="f-pick" data-form="pick" data-id="${id}" novalidate class="stack"><p class="card small" style="padding:12px;background:var(--surface)"><b>${hhLabel(r.household)}, ${esc(t("ward", { w: r.ward }))}</b><br><span class="soft">${esc(t("m." + r.material))}${r.landmark ? ", " + esc(r.landmark) : ""}</span></p>
      ${field("w", t("col.weight"), 'type="number" inputmode="decimal" step="0.1" min="0.1"', t("col.estWas", { v: kg(r.est) }))}
      ${field("hc", t("hs.label"), 'inputmode="numeric" maxlength="4" pattern="[0-9]*" autocomplete="off" style="max-width:10rem;letter-spacing:3px"', t("hs.hint"))}</form>`,
      `<button class="btn ghost" data-act="closeDlg">${esc(t("cancel"))}</button><button class="btn" type="submit" form="f-pick">${esc(t("col.create"))}</button>`);
  },
  qr(b) {
    openDialog(t("col.created", { code: b.code }), `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center"><div class="qr">${qrSvg(b.code)}</div><b class="num" style="font-size:1.5rem;color:var(--heading)">${b.code}</b><p class="small muted">${esc(t("m." + b.material))}, ${kg(b.measured)}</p><p class="small soft">${esc(t("col.qrHelp"))}</p></div>`,
      `<button class="btn wa" data-act="whatsapp" data-code="${b.code}">${icon("share")}${esc(t("share.wa"))}</button><button class="btn secondary" data-act="sticker" data-code="${b.code}">${icon("printer")}${esc(t("col.print"))}</button><button class="btn" data-act="closeDlg">${esc(t("col.doneBtn"))}</button>`);
  },
  handoff(code) {
    const b = bag(code);
    const matches = receiversFor(S.user, b);
    const first = matches.find((m) => m.room) || matches[0];
    openDialog(t("ho.handTitle", { code }), `<form id="f-hand" data-form="hand" data-code="${code}" novalidate><p class="small soft" style="margin-bottom:12px">${esc(t("m." + b.material))}, ${kg(b.current)}</p>
      <fieldset><legend class="label">${esc(t("ho.choose"))}</legend>${matches.length ? `<div class="choices">${matches.map((m) => `<label class="choice ${m === first ? "on" : ""}"><input type="radio" name="to" value="${m.u.id}" ${m === first ? "checked" : ""} data-change="radioCard"><span><b style="color:var(--heading)">${esc(m.u.name)}</b><small>${esc(t("role." + m.u.role))}</small>
        <span style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${pill("✓ " + t("ho.accepts", { m: t("m." + b.material) }), "success")}${pill(t("ho.km", { km: m.km }))}${pill(m.room ? t("ho.space", { kg: m.left }) : t("ho.noRoom"), m.room ? "" : "warning")}${pill(t("ho.verified"), "info")}</span></span></label>`).join("")}</div>` : `<p class="muted">${esc(t("ho.noMatch"))}</p>`}</fieldset></form>`,
      `<button class="btn ghost" data-act="closeDlg">${esc(t("cancel"))}</button><button class="btn" type="submit" form="f-hand" ${matches.length ? "" : "disabled"}>${esc(t("ho.send"))}</button>`);
  },
  receive(code = "") {
    openDialog(t("ho.recTitle"), `<form id="f-rec" data-form="rec" novalidate class="stack"><p class="small muted">${esc(t("ho.scanType"))}</p>
      ${field("code", t("ho.code"), `value="${esc(code)}" autocomplete="off" style="text-transform:uppercase" placeholder="TC-2026-0143"`)}
      ${scanBlock("code")}
      ${field("w", t("ho.recWeight"), 'type="number" inputmode="decimal" step="0.1" min="0.1"', t("ho.weighSelf"))}<p class="error" id="submit-err" role="alert"></p></form>`,
      `<button class="btn ghost" data-act="closeDlg">${esc(t("cancel"))}</button><button class="btn" type="submit" form="f-rec">${esc(t("ho.recBtn"))}</button>`);
    if (code) dlg.querySelector("#w")?.focus();
  },
  merge() {
    const chosen = S.selected.map(bag);
    openDialog(t("ho.mergeTitle"), `<p class="small soft" style="margin-bottom:12px">${esc(t("ho.mergeHelp"))}</p><ul class="num small card" style="list-style:none;padding:0;margin:0">${chosen.map((b) => `<li style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--line)"><span>${b.code}</span><span>${kg(b.current)}</span></li>`).join("")}
      <li style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--surface);font-weight:600"><span>${esc(t("ho.total"))}</span><span>${kg(chosen.reduce((s, b) => s + b.current, 0))}</span></li></ul><p class="error" id="submit-err" role="alert"></p>`,
      `<button class="btn ghost" data-act="closeDlg">${esc(t("cancel"))}</button><button class="btn" data-act="doMerge">${esc(t("ho.mergeBtn"))}</button>`);
  },
  outcome(code) {
    const b = bag(code);
    openDialog(t("rec.recTitle", { code }), `<form id="f-out" data-form="out" data-code="${code}" novalidate class="stack"><p class="card small" style="padding:12px;background:var(--surface)">${esc(t("m." + b.material))}, ${esc(t("pp.received"))} ${kg(b.current)}</p>
      <div class="grid2">${field("rec", t("rec.recovered"), `type="number" inputmode="decimal" step="0.1" min="0" value="${b.current}"`)}${field("rej", t("rec.rejected"), 'type="number" inputmode="decimal" step="0.1" min="0" value="0"')}</div>
      <p class="small muted num" id="sum">${esc(t("rec.sum", { t: kg(b.current), r: kg(b.current) }))}</p>
      <div><label class="label" for="reason">${esc(t("rec.reason"))}</label><select id="reason" class="input" aria-describedby="reason-err"><option value="">${esc(t("rec.chooseReason"))}</option>${["mixed_waste", "wet_or_dirty", "wrong_material", "other"].map((r) => `<option value="${r}">${esc(t("reason." + r))}</option>`).join("")}</select><p class="error" id="reason-err" role="alert"></p></div>
      <p class="error" id="submit-err" role="alert"></p></form>`,
      `<button class="btn ghost" data-act="closeDlg">${esc(t("cancel"))}</button><button class="btn" type="submit" form="f-out">${esc(t("rec.save"))}</button>`);
  },
  assistant() {
    const examples = S.user?.role === "collector" ? ["va.ex.route", "va.ex.where", "va.ex.lang"]
      : S.user?.role === "household" ? ["va.ex.book", "va.ex.status", "va.ex.where", "va.ex.score"]
      : ["va.ex.where", "va.ex.track", "va.ex.lang"];
    openDialog(t("va.title"), `
      <p class="small soft">${esc(t("va.intro"))}</p>
      <div class="va-log" id="va-log" aria-live="polite">${(S.vaLog || []).map(vaLine).join("") || `<p class="xs muted">${esc(t("va.empty"))}</p>`}</div>
      <form data-form="assistant" class="va-form" novalidate>
        ${voiceSupported() ? `<button type="button" class="btn" data-act="vaListen" aria-label="${esc(t("va.speak"))}">${icon("mic", 18)}${esc(t("va.speak"))}</button>` : ""}
        <label class="sr" for="va-q">${esc(t("va.type"))}</label>
        <input id="va-q" name="q" class="input" placeholder="${esc(t("va.placeholder"))}" autocomplete="off">
        <button class="btn secondary" type="submit">${esc(t("va.send"))}</button>
      </form>
      <p class="xs muted" style="margin:12px 0 6px">${esc(t("va.try"))}</p>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${examples.map((k) => `<button type="button" class="chip-btn" data-act="vaExample" data-text="${esc(t(k))}">${esc(t(k))}</button>`).join("")}</div>
      ${voiceSupported() ? "" : `<p class="xs muted" style="margin-top:10px">${esc(t("va.noMic"))}</p>`}`);
  },
  staffHelp() {
    openDialog(t("auth.howAdd"), `<ol class="how-list" style="margin:0">${[1, 2, 3].map((n) => `<li>${esc(t("help.staff" + n))}</li>`).join("")}</ol>`,
      `<button class="btn ghost" data-act="closeDlg">${esc(t("close"))}</button><button class="btn" data-act="pickRole" data-role="admin">${esc(t("auth.switchTo", { r: t("role.admin") }))}</button>`);
  },
  confirmReset() {
    openDialog(t("resetPreview"), `<p>${esc(t("se.resetConfirm"))}</p>`,
      `<button class="btn ghost" data-act="closeDlg">${esc(t("cancel"))}</button><button class="btn danger" data-act="doReset">${esc(t("resetPreview"))}</button>`);
  },
  resolve(id) {
    const f = D.flags.find((x) => x.id === id);
    openDialog(t("fl.resolveTitle"), `<form id="f-res" data-form="res" data-id="${id}" novalidate class="stack"><p class="card small" style="padding:12px;background:var(--surface)">${esc(f.detail)}</p>
      <div><label class="label" for="note">${esc(t("fl.note"))}</label><textarea id="note" class="input" style="min-height:96px" maxlength="240" aria-describedby="note-err"></textarea><p class="error" id="note-err" role="alert"></p></div></form>`,
      `<button class="btn ghost" data-act="closeDlg">${esc(t("cancel"))}</button><button class="btn" type="submit" form="f-res">${esc(t("fl.markBtn"))}</button>`);
  },
};

function printSticker(code) {
  const b = bag(code);
  const win = window.open("", "_blank", "width=420,height=560");
  if (!win) { window.print(); return; }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(code)}</title>
    <style>body{font-family:"Noto Sans",system-ui,sans-serif;text-align:center;padding:24px}.box{display:inline-block;border:2px solid #0F2547;padding:16px}
    .box svg{width:220px;height:220px}h1{margin:8px 0 2px;font-size:26px;letter-spacing:1px}p{margin:0;color:#3A4556}</style></head>
    <body><div class="box">${qrSvg(code)}<h1>${esc(code)}</h1><p>${esc(t("m." + b.material))}, ${kg(b.measured)}</p><p>${esc(t("app"))}</p></div>
    <script>window.onload=function(){window.print()}<\/script></body></html>`);
  win.document.close();
}

// A notification for the person who is looking at the screen right now.
function liveToast(msg, kind) {
  toast(msg, kind === "flag" ? "warning" : "info");
}

function vaLine(entry) {
  return `<div class="va-you"><span>${esc(entry.you)}</span></div><div class="va-bot"><span>${esc(entry.bot)}</span></div>`;
}

function passportLink(code) {
  return `${String(location.href || "").split("#")[0]}#/passport/${code}`;
}
function shareWhatsApp(code) {
  const b = bag(code);
  const text = t("share.text", { code, m: b ? t("m." + b.material) : "", url: passportLink(code) });
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}
