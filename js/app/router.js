/* Hash router: #/collector, #/passport/TC-2026-0088 ...
   Hash routing works from a plain file, Live Server, GitHub Pages or Netlify without any server config. */

const VIEWS = {
  home: viewHome, features: viewFeatures, login: viewLogin, about: viewAbout, track: viewTrack, passport: viewPassport, notes: viewNotes,
  household: viewHousehold, book: viewBook,
  collector: viewCollector, bags: viewBags,
  aggregator: viewAggregator,
  recycler: viewRecycler,
  rewards: viewRewards, settings: viewSettings,
  admin: viewAdmin, analytics: viewAnalytics, wards: viewWards, flags: viewFlags, people: viewPeople, audit: viewAudit, demo: viewDemo,
};

// Which role may open which page. Pages not listed are public.
const ACCESS = {
  household: ["household"], book: ["household"], rewards: ["household"],
  collector: ["collector"], bags: ["collector"],
  aggregator: ["aggregator"], recycler: ["recycler"],
  admin: ["admin"], analytics: ["admin"], wards: ["admin"], flags: ["admin"], people: ["admin"], audit: ["admin"], demo: ["admin"],
  notes: ["household", "collector", "aggregator", "recycler", "admin"],
};

const HOME_FOR = { household: "household", collector: "collector", aggregator: "aggregator", recycler: "recycler", admin: "admin" };

function render() {
  document.documentElement.lang = S.lang;
  document.documentElement.dataset.theme = "light";
  document.title = `${t("app")} | ${pageTitle()}`;
  MAP_CONFIGS = [];
  MEMO.clear();
  document.getElementById("app").innerHTML = pageShell((VIEWS[S.view] || viewHome)());
  mountMaps();
  saveState();
  if (S.view === "passport" && (!S.integrity || S.integrity.code !== S.param)) runVerify();
}

function pageTitle() {
  const names = { home: "nav.home", login: "login", about: "nav.about", track: "nav.track", passport: "pp.title", notes: "nt.title",
    household: "nav.myPickups", book: "nav.book", collector: "nav.route", bags: "nav.bags", aggregator: "nav.stock",
    recycler: "nav.process", admin: "nav.overview", flags: "nav.flags", demo: "nav.demo",
    rewards: "nav.rewards", settings: "nav.settings", wards: "nav.wards", people: "nav.people", audit: "nav.audit", analytics: "nav.analytics", features: "nav.features" };
  return S.view === "passport" && S.param ? S.param : t(names[S.view] || "nav.home");
}

function go(view, param = null) {
  const hash = `#/${view}${param ? "/" + encodeURIComponent(param) : ""}`;
  if (location.hash === hash) onRoute();
  else location.hash = hash;
}

function onRoute() {
  const [, view = "home", param = null] = (location.hash || "#/home").replace(/^#/, "").split("/");
  const allowed = ACCESS[view];
  if (allowed && (!S.user || !allowed.includes(S.user.role))) {
    S.afterLogin = S.user ? null : `${view}${param ? "/" + param : ""}`;
    S.loginRole = allowed.length === 1 ? allowed[0] : null;
    S.auth = null;
    location.replace(S.user ? `#/${HOME_FOR[S.user.role]}` : "#/login");
    return;
  }
  const changed = view !== S.view || param !== S.param;
  S.view = VIEWS[view] ? view : "home";
  S.param = param ? decodeURIComponent(param) : null;
  if (S.view !== "aggregator") S.selected = [];
  if (S.view !== "book") S.book = null;
  if (S.view !== "login") { S.auth = null; if (view !== "login") S.loginRole = null; }
  closeDialog();
  render();
  if (changed) {
    window.scrollTo(0, 0);
    document.getElementById("main")?.focus({ preventScroll: true });
  }
}

async function runVerify() {
  const b = bag(S.param);
  if (!b) return;
  const chain = [b];
  let x = b;
  while (x.parent) { x = bag(x.parent); chain.push(x); }
  let total = 0, result = null;
  for (const c of chain) {
    const r = await verifyBag(c.code);
    total += r.checked;
    if (!r.ok) { result = r; break; }
  }
  S.integrity = { code: b.code, result: result || { ok: true, checked: total } };
  if (S.view === "passport" && S.param === b.code) render();
}
