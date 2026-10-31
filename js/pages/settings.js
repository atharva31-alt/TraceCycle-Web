/* Settings: language, text size, contrast, the optional AI key and demo data. */

function viewSettings() {
  const hasKey = Boolean(aiSettings.key());
  return `<div class="page" style="padding-top:32px">${header(t("se.title"), t("se.sub"))}
    <div class="stack" style="max-width:760px">
      <section class="card pad">
        <h2 style="margin-bottom:12px">${esc(t("se.display"))}</h2>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          <div class="seg" role="group" aria-label="${esc(t("se.lang"))}">${[["en", "English"], ["hi", "हिंदी"]].map(([c, l]) => `<button data-act="lang" data-lang="${c}" lang="${c}" aria-pressed="${S.lang === c}">${l}</button>`).join("")}</div>
          <div class="seg" role="group" aria-label="${esc(t("se.size"))}">${[["-1", "A-"], ["0", "A"], ["1", "A+"]].map(([d, l]) => `<button data-act="font" data-dir="${d}">${l}</button>`).join("")}</div>
          <button class="btn secondary sm" data-act="contrast" aria-pressed="${S.contrast}">${esc(t("contrast"))}</button>
        </div>
      </section>

      ${window.claude?.use ? `<section class="card pad"><h2>${esc(t("se.ai"))}</h2><p class="small soft" style="margin-top:4px">${esc(t("se.inClaude"))}</p></section>` : `
      <form class="card pad stack" data-form="ai" novalidate>
        <div><h2>${esc(t("se.ai"))}</h2><p class="small soft" style="margin-top:4px">${esc(t("se.aiHelp"))}</p></div>
        <div><label class="label" for="ai-key">${esc(t("se.key"))}</label>
          <input id="ai-key" name="key" class="input" type="password" autocomplete="off" placeholder="${hasKey ? "••••••••••••" : "AIza…"}" aria-describedby="ai-key-hint">
          <p class="hint" id="ai-key-hint">${esc(t(hasKey ? "se.keySaved" : "se.keyHint"))}</p></div>
        <div><label class="label" for="ai-model">${esc(t("se.model"))}</label><input id="ai-model" name="model" class="input" value="${esc(aiSettings.model())}"></div>
        <div class="notice warn small">${icon("alert")}<span>${esc(t("se.keyWarn"))}</span></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" type="submit">${esc(t("se.saveKey"))}</button>${hasKey ? `<button type="button" class="btn ghost" data-act="clearKey">${esc(t("se.removeKey"))}</button>` : ""}</div>
      </form>`}

      <section class="card pad">
        <h2 style="margin-bottom:6px">${esc(t("se.data"))}</h2>
        <p class="small soft" style="margin-bottom:12px">${esc(t("se.dataHelp"))}</p>
        <button class="btn danger" data-act="confirmReset">${icon("refresh", 16)}${esc(t("resetPreview"))}</button>
      </section>
    </div></div>`;
}
