/* Home page. */

function viewHome() {
  const streams = [["wet", "#1F7A3D", "home.exWet"], ["dry", "#1D5FA8", "home.exDry"], ["sanitary", "#B42318", "home.exSan"], ["special", "#2B2B2B", "home.exSpec"]];
  return `
  <div class="notice-strip"><div class="page"><b>${esc(t("home.noticeTag"))}</b><span>${esc(t("home.notice"))}</span></div></div>
  <section class="hero"><div class="page">
    <div style="flex:1 1 30rem;min-width:0">
      <h1>${esc(t("home.title"))}</h1>
      <p class="lead">${esc(t("home.lead"))}</p>
      <div style="display:flex;flex-wrap:wrap;gap:12px">
        <button class="btn" data-act="go" data-view="${S.user?.role === "household" ? "book" : "login"}">${esc(t("home.book"))}</button>
        <button class="btn secondary" data-act="scrollTo" data-target="streams">${esc(t("home.guide"))}</button>
      </div>
    </div>
    <form class="card pad" style="flex:1 1 20rem;min-width:0" data-form="track" novalidate>
      <h2>${esc(t("home.trackTitle"))}</h2>
      <p class="muted small" style="margin:4px 0 14px">${esc(t("home.trackHelp"))}</p>
      <label class="label" for="track-code">${esc(t("home.trackLabel"))}</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <input id="track-code" name="code" class="input num" style="flex:1 1 11rem;text-transform:uppercase" placeholder="TC-2026-0088" autocomplete="off">
        <button class="btn success" type="submit">${esc(t("home.track"))}</button>
      </div>
      <p class="hint" id="track-hint">${esc(t("home.trackHint"))}</p>
    </form>
  </div></section>
  <section class="page" id="streams" style="padding-top:48px">
    <h2 style="font-size:1.5rem">${esc(t("home.streams"))}</h2>
    <p class="muted" style="margin:4px 0 22px;max-width:46em">${esc(t("home.streamsBody"))}</p>
    <div class="streams">${streams.map(([s, c, ex]) => `<div class="card" style="padding:18px;border-top:6px solid ${c};border-radius:0"><h3>${esc(t("s." + s))}</h3><p class="soft small" style="margin-top:4px">${esc(t(ex))}</p></div>`).join("")}</div>
    <p class="muted small" style="display:flex;gap:8px;margin-top:14px">${icon("info", 16)}${esc(t("home.pilot"))}</p>
  </section>
  ${homeMap()}
  <section class="page" style="padding-top:48px">
    <h2 style="font-size:1.5rem;margin-bottom:22px">${esc(t("home.how"))}</h2>
    <ol class="steps">${[1, 2, 3, 4].map((n) => `<li style="display:flex;gap:12px"><span class="dot num">${n}</span><div><h3>${esc(t("home.s" + n))}</h3><p class="soft small">${esc(t("home.s" + n + "b"))}</p></div></li>`).join("")}</ol>
  </section>
  <section class="page" style="padding-top:48px">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:22px">
      <h2 style="font-size:1.5rem">${esc(t("home.who"))}</h2>
      ${S.user ? "" : `<button class="btn" data-act="go" data-view="login">${esc(t("home.loginBtn"))}</button>`}
    </div>
    <div class="roles">${["household", "collector", "aggregator", "recycler", "admin"].map((r) => `<button class="role-card" data-act="loginAsRole" data-role="${r}" ${S.user ? "disabled" : ""}><b>${esc(t("role." + r))}</b><span>${esc(t("does." + r))}</span>${S.user ? "" : `<span class="role-go">${esc(t("home.loginRole"))} →</span>`}</button>`).join("")}</div>
  </section>`;
}

// Public map: wards and collection points only. Households are never shown here.
function homeMap() {
  const waiting = {};
  D.requests.filter((r) => r.status === "scheduled").forEach((r) => { waiting[r.ward] = (waiting[r.ward] || 0) + 1; });
  const places = D.users.filter((u) => ["aggregator", "recycler"].includes(u.role) && u.lat >= BOX.latMin && u.lat <= BOX.latMax && u.lng >= BOX.lngMin && u.lng <= BOX.lngMax);
  const trucks = D.users.filter((u) => u.role === "collector" && u.onDuty !== false).map((c) => ({ ...collectorPosition(c), type: "tag", text: "🚚", color: "#1A3A6B", tip: shown(c) }));
  return `<section class="page" id="village-map" style="padding-top:48px">
    <h2 style="font-size:1.5rem">${esc(t("home.map"))}</h2>
    <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;margin:4px 0 16px">
      <p class="muted" style="max-width:46em">${esc(t("home.mapSub"))}</p>
      ${"geolocation" in navigator ? `<button class="btn secondary sm" data-act="relocateHome">${icon("locate", 16)}${esc(t("geo.aroundMe"))}</button>` : ""}
    </div>
    ${mapBlock({
      label: t("home.map"), height: 420,
      areas: Object.entries(WARD_CENTRES).map(([w, [lat, lng]]) => ({ lat, lng, radius: 330, color: "#1A3A6B", opacity: +(0.06 + 0.06 * (waiting[w] || 0)).toFixed(2),
        text: `${t("ward", { w })}${waiting[w] ? ` · ${t("wd.pendingN", { n: waiting[w] })}` : ""}` })),
      points: [...places.map((u) => ({ lat: u.lat, lng: u.lng, type: "tag", text: u.role === "aggregator" ? "A" : "C", color: "#1F7A3D", tip: u.name })), ...trucks],
    })}
    <p class="small soft" style="display:flex;flex-wrap:wrap;gap:16px;margin-top:8px"><span><b>A</b> ${esc(t("home.mapA"))}</span><span><b>C</b> ${esc(t("home.mapC"))}</span><span>🚚 ${esc(t("home.mapT"))}</span><span>${esc(t("home.mapW"))}</span></p>
  </section>`;
}
