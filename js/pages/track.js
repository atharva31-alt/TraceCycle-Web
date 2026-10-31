/* Track a bag by batch ID: type it or scan the QR sticker. */

function viewTrack() {
  return `<div class="page" style="padding-top:32px">${header(t("nav.track"), t("home.trackHelp"))}
    <form class="card pad stack" style="max-width:600px" data-form="track" novalidate><div><label class="label" for="track-code">${esc(t("home.trackLabel"))}</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px"><input id="track-code" name="code" class="input num" style="flex:1 1 11rem;text-transform:uppercase" placeholder="TC-2026-0088" autocomplete="off"><button class="btn success" type="submit">${esc(t("home.track"))}</button></div>
      <p class="hint" id="track-hint">${esc(t("home.trackHint"))}</p></div>
      ${scanBlock("track-code")}</form></div>`;
}
