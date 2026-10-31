/* Page chrome: accessibility bar, header, main navigation and footer. */

const NAV = {
  guest: [["home", "nav.home"], ["features", "nav.features"], ["track", "nav.track"], ["about", "nav.about"]],
  household: [["household", "nav.myPickups"], ["book", "nav.book"], ["rewards", "nav.rewards"], ["track", "nav.track"], ["features", "nav.features"]],
  collector: [["collector", "nav.route"], ["bags", "nav.bags"], ["track", "nav.track"], ["features", "nav.features"]],
  aggregator: [["aggregator", "nav.stock"], ["track", "nav.track"], ["features", "nav.features"]],
  recycler: [["recycler", "nav.process"], ["track", "nav.track"], ["features", "nav.features"]],
  admin: [["admin", "nav.overview"], ["analytics", "nav.analytics"], ["wards", "nav.wards"], ["flags", "nav.flags"], ["people", "nav.people"], ["audit", "nav.audit"], ["demo", "nav.demo"], ["track", "nav.track"], ["features", "nav.features"]],
};
function pageShell(content) {
  const u = S.user;
  const unread = u ? D.notes.filter((n) => n.user === u.id && !n.read).length : 0;
  const links = NAV[u ? u.role : "guest"];
  return `
  <div class="a11y no-print"><div class="page">
    <button class="skip" data-act="skip">${esc(t("skip"))}</button>
    <div class="tools">
      <button data-act="font" data-dir="-1" aria-label="${esc(t("smaller"))}">A-</button>
      <button data-act="font" data-dir="0" aria-label="${esc(t("normal"))}">A</button>
      <button data-act="font" data-dir="1" aria-label="${esc(t("bigger"))}">A+</button>
      <button data-act="contrast" aria-pressed="${S.contrast}">${esc(t("contrast"))}</button>
      <span aria-hidden="true" style="width:1px;height:18px;background:var(--navy-line);margin:0 4px"></span>
      <button class="lang" data-act="lang" data-lang="en" lang="en" aria-pressed="${S.lang === "en"}">English</button>
      <button class="lang" data-act="lang" data-lang="hi" lang="hi" aria-pressed="${S.lang === "hi"}">हिंदी</button>
    </div>
  </div></div>
  <div class="tri" aria-hidden="true"><span></span><span></span><span></span></div>
  <header class="site"><div class="page">
    <button class="brand" data-act="go" data-view="home">${LOGO}<span><b>${esc(t("app"))}</b><small>${esc(t("tagline"))}</small></span></button>
    <form class="hsearch no-print" data-form="search" role="search" novalidate>
      <label class="sr" for="hsearch">${esc(t("search.label"))}</label>
      <input id="hsearch" name="q" class="input num" placeholder="${esc(t("search.ph"))}" autocomplete="off" maxlength="20">
      <button class="icon-btn" type="submit" aria-label="${esc(t("search.go"))}">${icon("search", 20)}</button>
    </form>
    <div class="who no-print">${u ? `
      <button class="icon-btn" data-act="go" data-view="notes" aria-label="${esc(t("notifications"))}${unread ? ` (${unread})` : ""}">${icon("bell", 22)}${unread ? `<span class="badge-count num">${unread > 9 ? "9+" : unread}</span>` : ""}</button>
      <div class="meta"><b>${esc(u.name)}</b><span>${esc(t("role." + u.role))}</span></div>
      <button class="icon-btn" data-act="go" data-view="settings" aria-label="${esc(t("nav.settings"))}">${icon("gear", 22)}</button>
      <button class="btn ghost sm" data-act="switchAccount" title="${esc(t("switch.title"))}">${icon("refresh", 16)}<span class="hide-sm">${esc(t("switch"))}</span></button>
      <button class="btn ghost sm" data-act="logout">${icon("logout", 16)}<span class="hide-sm">${esc(t("logout"))}</span></button>` : `<button class="icon-btn" data-act="go" data-view="settings" aria-label="${esc(t("nav.settings"))}">${icon("gear", 22)}</button><button class="btn" data-act="go" data-view="login">${esc(t("login"))}</button>`}
    </div>
  </div></header>
  <nav class="main no-print" aria-label="Main"><div class="page" style="padding:0"><ul>
    ${links.map(([v, k]) => `<li><button data-act="go" data-view="${v}" ${S.view === v ? 'aria-current="page"' : ""}>${esc(t(k))}</button></li>`).join("")}
  </ul></div></nav>
  <div class="preview-bar no-print"><div class="page"><span>${icon("info", 16)} ${esc(t("preview"))}</span><button class="btn ghost sm" data-act="confirmReset">${icon("refresh", 16)}${esc(t("resetPreview"))}</button></div></div>
  <main id="main" tabindex="-1">${content}</main>
  ${bottomBar(links)}
  <button class="assist-fab no-print" data-act="assistant" aria-haspopup="dialog">${icon("mic", 20)}<span>${esc(t("va.fab"))}</span></button>
  <footer class="site no-print"><div class="page">
    <ul class="footer-links">${["privacy", "accessibility", "terms", "help"].map((k) => `<li><button data-act="about" data-section="${k}">${esc(t("about." + k))}</button></li>`).join("")}</ul>
    <div class="row"><span>${esc(t("footer.disc"))}</span><span>${esc(t("footer.tz"))}</span></div>
  </div></footer>`;
}

const NAV_ICON = { home: "home", features: "info", track: "qr", about: "info", household: "home", book: "plus", rewards: "star", collector: "route",
  bags: "box", aggregator: "box", recycler: "factory", admin: "home", analytics: "info", wards: "alert", flags: "alert", people: "home", audit: "info", demo: "refresh" };

// Phones get the first four menu items as big buttons at the bottom of the screen.
function bottomBar(links) {
  const shown = links.length <= 4 ? links : links.slice(0, 3);
  const more = links.length > 4 ? `<button data-act="moreNav" aria-haspopup="dialog">${icon("menu", 22)}<span>${esc(t("nav.more"))}</span></button>` : "";
  return `<nav class="bottom-bar no-print" aria-label="${esc(t("nav.quick"))}">${shown.map(([v, k]) => `
    <button data-act="go" data-view="${v}" ${S.view === v ? 'aria-current="page"' : ""}>${icon(NAV_ICON[v] || "info", 22)}<span>${esc(t(k))}</span></button>`).join("")}${more}</nav>`;
}
