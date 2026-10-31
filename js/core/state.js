/* App state (S), the data store (D) and small formatting helpers.
   D is saved to localStorage after every render, so the demo survives a reload. */

const S = { lang: "en", user: null, view: "home", param: null, routeMode: "optimised", selected: [], flagFilter: "open",
  book: null, demoResult: {}, fontIdx: 1, contrast: false };
let D;

function t(key, vars = {}) {
  const s = T[S.lang][key] ?? T.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const kg = (v) => (v == null ? "–" : `${(Math.round(v * 10) / 10).toLocaleString("en-IN")} kg`);
const r1 = (v) => Math.round(v * 10) / 10;
const ago = (days, hours = 0) => new Date(Date.now() - days * 864e5 - hours * 36e5);

function when(d) {
  return new Intl.DateTimeFormat(S.lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata", numberingSystem: "latn" }).format(new Date(d));
}
function dayLabel(d) {
  return new Intl.DateTimeFormat(S.lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata", numberingSystem: "latn" }).format(new Date(d));
}

const STORE_KEY = "tracecycle.data.v2";
const SESSION_KEY = "tracecycle.session.v3";

let saveTimer = null;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 250);
}
function saveNow() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(D));
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: S.user?.id ?? null, lang: S.lang, fontIdx: S.fontIdx }));
  } catch {
    /* storage full or blocked: the demo still works, it just won't survive a reload */
  }
}

function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY));
    const session = JSON.parse(localStorage.getItem(SESSION_KEY)) || {};
    if (!data || !Array.isArray(data.users)) return false;
    D = data;
    S.lang = session.lang === "hi" ? "hi" : "en";
    S.user = session.user ? D.users.find((u) => u.id === session.user) || null : null;
    S.fontIdx = Number.isInteger(session.fontIdx) ? session.fontIdx : 1;
    return true;
  } catch {
    return false;
  }
}

function clearState() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* nothing stored */
  }
}

// Small per-render cache for the heavier calculations (cleared on every render and action).
const MEMO = new Map();
function memo(key, fn) {
  if (!MEMO.has(key)) MEMO.set(key, fn());
  return MEMO.get(key);
}
