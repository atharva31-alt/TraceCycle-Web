/* Household: book a pickup.
   Step 1 checks the waste (AI photo check, or four quick questions without AI) and gives a quality score.
   Step 2 is type, size and time (type can also be spoken). Step 3 is the map pin. */

function qualityBadge(q, label) {
  const tone = { A: "success", B: "info", C: "warning", D: "danger" }[q.grade];
  return `<div class="score-ring ${tone}" role="img" aria-label="${esc(label)}: ${q.score} / 100, ${esc(t("q.grade"))} ${q.grade}">
    <b class="num">${q.score}</b><span>${esc(t("q.grade"))} ${q.grade}</span></div>`;
}

function checkResult(r, source) {
  const q = qualityScore(r.material, r.contamination);
  const tone = { low: "success", medium: "warning", high: "danger" }[r.contamination];
  const used = S.book.material === r.material;
  return `
    <div class="check-result" aria-live="polite">
      <div class="check-head">
        ${qualityBadge(q, t("q.title"))}
        <div style="flex:1;min-width:12rem">
          <div class="muted small">${esc(t(source === "ai" ? "book.ai" : "gq.title"))}</div>
          <b style="font-size:1.15rem;color:var(--heading)">${esc(t("m." + r.material))}</b>
          ${r.confidence != null ? `<div class="small soft">${esc(t("book.conf", { v: Math.round(r.confidence * 100) }))}</div>` : ""}
          <div class="small soft" style="margin-top:2px">${esc(t("q.title"))}: <b>${q.score}/100</b> · ${esc(t("q.meaning." + q.grade))}</div>
        </div>
        ${source === "ai" ? `<button type="button" class="btn ${used ? "success" : ""} sm" data-act="useAi" ${used ? "disabled" : ""}>${icon("check", 16)}${esc(t(used ? "book.used" : "book.use"))}</button>` : ""}
      </div>
      <div class="grid2" style="margin-top:14px">
        <div><div style="display:flex;gap:8px;align-items:center"><h3>${esc(t("book.contam"))}</h3>${pill(t("lvl." + r.contamination), tone)}</div>
          ${r.issues.length ? `<ul class="small soft" style="margin:6px 0 0;padding-left:20px">${r.issues.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="small soft" style="margin-top:6px">${esc(t("gq.none"))}</p>`}</div>
        <div><div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><h3>${esc(t("book.instr"))}</h3>${"speechSynthesis" in window ? `<button type="button" class="btn ghost sm" data-act="speak">${icon("volume", 16)}${esc(t("book.listen"))}</button>` : ""}</div>
          <ol class="small soft" style="margin:6px 0 0;padding-left:20px">${r.instructions.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></div>
      </div>
      <p class="xs muted" style="margin-top:10px">${esc(t(source === "ai" ? "book.aiNote" : "gq.note"))}</p>
    </div>`;
}

function aiStatus(f) {
  const notice = (key) => `<div class="notice warn" role="status" style="margin-top:14px">${icon("info")}<span>${esc(t(key))}</span></div>`;
  switch (f.aiState) {
    case "checking": return `<p class="muted" role="status" style="margin-top:14px">${esc(t("book.checking"))}</p>`;
    case "none": return notice("book.noAi");
    case "low": return notice("book.lowConf");
    case "failed": return notice("book.aiFailed");
    case "badType": return notice("book.badType");
    case "tooBig": return notice("book.tooBig");
    case "done": return checkResult(f.ai, "ai");
    default: return "";
  }
}

function guidedPanel(f) {
  if (!f.guidedOpen) return "";
  const qs = GUIDED_QUESTIONS.map((q) => `
    <fieldset class="gq"><legend>${esc(t("gq.q." + q))}</legend>
      ${["yes", "no"].map((v) => `<label class="choice ${f.guided[q] === v ? "on" : ""}"><input type="radio" name="gq-${q}" value="${v}" ${f.guided[q] === v ? "checked" : ""} data-change="guided" data-q="${q}"><span><b>${esc(t("gq." + v))}</b></span></label>`).join("")}
    </fieldset>`).join("");
  const done = GUIDED_QUESTIONS.every((q) => f.guided[q]);
  return `<div class="guided">
      <p class="small soft" style="margin-bottom:10px">${esc(t(f.material ? "gq.intro" : "gq.pickType"))}</p>
      <div class="gq-grid">${qs}</div>
      ${done && f.material ? checkResult(guidedCheck(f.material, f.guided), "guided") : ""}
    </div>`;
}

function choiceGroup(name, legend, options, value, cols = "c2") {
  return `<fieldset><legend class="label">${esc(legend)}</legend><div class="choices ${cols}">${options.map(([v, label, sub]) => `
    <label class="choice ${value === v ? "on" : ""}"><input type="radio" name="${name}" value="${v}" ${value === v ? "checked" : ""} data-change="field"><span><b>${label}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span></label>`).join("")}</div></fieldset>`;
}

function viewBook() {
  if (!S.book) {
    S.book = { material: "", size: "M", day: "today", slot: "morning", lat: S.user.lat, lng: S.user.lng, landmark: "", ai: null, aiState: "idle",
      guidedOpen: false, guided: {}, errors: {}, voice: "" };
    if (S.prefill) {
      if (S.prefill.material) S.book.material = S.prefill.material;
      if (S.prefill.size) S.book.size = S.prefill.size;
      S.prefill = null;
    }
  }
  const f = S.book;
  const materials = MATERIALS.map((m) => [m, `${esc(t("m." + m))} <span class="pill ${m === "organic" ? "success" : "info"}">${esc(t(m === "organic" ? "s.wet" : "s.dry"))}</span>`, t("ex." + m)]);

  return `<div class="page" style="padding-top:32px">${header(t("book.title"), t("book.sub"), "", [[t("hh.title"), "household"]])}
  <form class="stack" data-form="book" novalidate>
    <section class="card pad">
      <h2>${esc(t("book.check"))}</h2><p class="muted small" style="margin:4px 0 14px">${esc(t("book.checkHelp"))}</p>
      <input type="file" id="photo" accept="image/jpeg,image/png,image/webp" capture="environment" class="sr" data-change="photo">
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
        <label for="photo" class="btn secondary" role="button" tabindex="0">${icon("camera")}${esc(t("book.photo"))}</label>
        <button type="button" class="btn ghost" data-act="toggleGuided" aria-expanded="${Boolean(f.guidedOpen)}">${icon("info")}${esc(t(f.guidedOpen ? "gq.hide" : "gq.open"))}</button>
        ${f.preview ? `<img src="${f.preview}" alt="${esc(t("book.photoAlt"))}" style="width:72px;height:72px;object-fit:cover;border:1px solid var(--line);border-radius:4px">` : ""}
      </div>
      ${aiStatus(f)}
      ${guidedPanel(f)}
    </section>

    <section class="card pad stack" id="details">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:center">
        <h2>${esc(t("book.details"))}</h2>
        ${voiceSupported() ? `<button type="button" class="btn ghost sm" data-act="voice">${icon("mic", 16)}${esc(t("voice.btn"))}</button>` : ""}
      </div>
      ${f.voice ? `<p class="notice ${f.voiceOk ? "ok" : "warn"} small" role="status">${esc(f.voice)}</p>` : ""}
      ${choiceGroup("material", t("book.type"), materials, f.material, "c3")}
      ${f.errors.material ? `<p class="error" role="alert">${esc(f.errors.material)}</p>` : ""}
      ${choiceGroup("size", t("book.size"), ["S", "M", "L"].map((s) => [s, esc(t("size." + s))]), f.size, "c3")}
      <div class="grid2">
        ${choiceGroup("day", t("book.date"), ["today", "tomorrow"].map((d) => [d, esc(t("book." + d))]), f.day)}
        ${choiceGroup("slot", t("book.slot"), ["morning", "afternoon"].map((s) => [s, esc(t("slot." + s))]), f.slot)}
      </div>
    </section>

    <section class="card pad stack">
      <div><h2>${esc(t("book.loc"))}</h2><p class="muted small">${esc(t("book.locHelp"))}</p></div>
      ${bookingMap(f)}
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
        ${"geolocation" in navigator ? `<button type="button" class="btn secondary sm" data-act="locate">${icon("locate", 16)}${esc(t("book.myLoc"))}</button>` : ""}
        <span class="num muted small" id="pin-coords">${f.lat.toFixed(5)}, ${f.lng.toFixed(5)}</span>
      </div>
      ${f.locMsg ? `<div class="notice warn small" role="status">${icon("info")}<span>${esc(f.locMsg)}</span>${f.farAway ? `<button type="button" class="btn sm" data-act="relocate">${esc(t("geo.moveHere"))}</button>` : ""}</div>` : ""}
      <div id="nearby" aria-live="polite">${nearbyList(f)}</div>
      <div><label class="label" for="landmark">${esc(t("book.landmark"))}</label><input id="landmark" name="landmark" class="input" maxlength="160" value="${esc(f.landmark)}" data-change="field" aria-describedby="lm-hint"><p class="hint" id="lm-hint">${esc(t("book.landmarkHint"))}</p></div>
    </section>

    <div style="display:flex;gap:12px;flex-wrap:wrap"><button class="btn" type="submit">${esc(t("book.submit"))}</button><button class="btn ghost" type="button" data-act="go" data-view="household">${esc(t("cancel"))}</button></div>
  </form></div>`;
}

// What was checked before booking, saved with the request.
function bookingCheck(f) {
  if (f.ai) return { source: "ai", contamination: f.ai.contamination, ...qualityScore(f.ai.material, f.ai.contamination) };
  if (f.material && GUIDED_QUESTIONS.every((q) => f.guided[q])) {
    const g = guidedCheck(f.material, f.guided);
    return { source: "guided", contamination: g.contamination, score: g.score, grade: g.grade };
  }
  return null;
}

const pinWard = (f) => wardAt(f) || S.user.ward;

// The map: your pin, and the trucks of the collectors who serve that ward. Only the nearest is named.
function bookingMap(f) {
  const ward = pinWard(f);
  f.shownWard = ward;
  const trucks = wardCollectors(f, ward);
  return mapBlock({ label: t("book.locHelp"), height: 380, pin: true, points: [
    { lat: f.lat, lng: f.lng, type: "pin", tip: t("book.pinTip") },
    ...trucks.map((n, i) => ({ lat: n.pos.lat, lng: n.pos.lng, type: "tag", text: i === 0 ? `🚚 ${shown(n.c)}` : "🚚", color: i === 0 ? "#1F7A3D" : "#1A3A6B", tip: `${n.c.name} · ${n.km} km` })),
  ] });
}

// One line under the map: the ward of the pin and the nearest collector there.
function nearbyList(f) {
  const ward = pinWard(f);
  const trucks = wardCollectors(f, ward);
  const first = trucks[0];
  return `<div class="nearest-line">
    <span class="pill info">${esc(t("ward", { w: ward }))}</span>
    ${first ? `<span><b>🚚 ${esc(first.c.name)}</b> · <span class="num">${first.km} km</span> · ~${esc(etaText((first.km / SPEED_KMH) * 60))}</span>
      <span class="small soft">${esc(trucks.length > 1 ? t("nb.firstMore", { n: trucks.length - 1 }) : t("nb.firstOnly"))}</span>`
      : `<span class="small soft">${esc(t("nb.none"))}</span>`}
  </div>`;
}
const dayTime = (ts) => new Date(ts).toLocaleTimeString(S.lang === "hi" ? "hi-IN" : "en-IN", { hour: "numeric", minute: "2-digit" });
