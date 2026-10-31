/* Collector: today's route, booking order vs optimised. */

function collectorPlan() {
  const u = S.user;
  const due = D.requests.filter((r) => r.collector === u.id && r.status === "scheduled" && r.date !== "tomorrow");
  const depot = user(3);
  return { due, plan: planRoutes({ lat: u.lat, lng: u.lng }, due.map((r) => ({ ...r })), { lat: depot.lat, lng: depot.lng, name: depot.name }, u.capacity) };
}
function viewCollector() {
  const { due, plan } = collectorPlan();
  const mode = S.routeMode, cur = plan[mode], opt = mode === "optimised";
  const offlinePanel = collectorOfflinePanel();
  const held = D.bags.filter((b) => b.holder === S.user.id && b.status === "picked_up");
  const dash = tiles([
    { k: t("col.tDue"), v: due.length, n: t("col.tDueN") },
    { k: t("col.load"), v: kg(plan.est), n: t("col.tCap", { c: kg(plan.cap) }) },
    { k: t("col.tSaved"), v: `${r2(plan.booking.km - plan.optimised.km)} km`, n: t("col.tSavedN", { p: plan.savedPct }), tone: "success" },
    { k: t("col.tHeld"), v: held.length, n: kg(held.reduce((s, b) => s + b.current, 0)) },
  ]);
  if (!due.length) return `<div class="page" style="padding-top:32px">${header(t("col.title"), t("col.sub"), dutySwitch())}${offerCard()}${offlinePanel}${dash}<div class="empty">${esc(t("col.empty"))}</div></div>`;
  const start = { lat: S.user.lat, lng: S.user.lng }, depot = user(3);
  let n = 0;
  const stops = cur.plan.map((s) => s.kind === "dropoff"
    ? { lat: s.lat, lng: s.lng, type: "tag", text: "↺", color: "#1F7A3D", tip: t("col.dropoff") }
    : { lat: s.lat, lng: s.lng, type: "num", text: String(++n), color: s.priority === "high" ? "#E8772E" : "#1A3A6B", fg: s.priority === "high" ? "#2B1203" : "#fff",
        tip: `${n}. ${s.landmark || t("ward", { w: s.ward })}, ${t("m." + s.material)}, ~${kg(s.est)}` });
  const routeMap = mapBlock({
    label: `${t("col." + mode)}: ${cur.km} km`, height: 420,
    lines: [{ path: [start, ...cur.plan, depot], color: opt ? "#1F7A3D" : "#B42318", dash: !opt }],
    points: [{ ...start, type: "tag", text: t("col.you"), color: "#0F2547", tip: t("col.start") }, { lat: depot.lat, lng: depot.lng, type: "tag", text: "A", color: "#1F7A3D", tip: depot.name }, ...stops],
  });
  const ordered = cur.plan.filter((s) => s.kind === "pickup");
  const hasDrop = cur.plan.some((s) => s.kind === "dropoff");
  return `<div class="page" style="padding-top:32px">${header(t("col.title"), t("col.sub"), `${dutySwitch()}<button class="btn secondary" data-act="go" data-view="bags">${icon("box")}${esc(t("nav.bags"))}</button>`)}
  ${offerCard()}${offlinePanel}${dash}
  <div class="route-grid">
    <section class="card pad">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px"><h2>${esc(t("col.title"))}</h2>
        <div class="seg" role="group">${["booking", "optimised"].map((m) => `<button data-act="mode" data-mode="${m}" aria-pressed="${mode === m}">${esc(t("col." + m))}</button>`).join("")}</div></div>
      ${routeMap}
      <dl class="summary" style="margin:14px 0 0">
        <div><dt>${esc(t("col.distance"))}</dt><dd class="num">${cur.km} km</dd><dd class="note">${esc(opt ? (plan.savedPct > 0 ? t("col.saved", { p: plan.savedPct, km: plan.booking.km }) : t("col.noSave")) : t("col.would", { km: plan.optimised.km }))}</dd></div>
        <div><dt>${esc(t("col.stops"))}</dt><dd class="num">${ordered.length}</dd><dd class="note">${esc(t(hasDrop ? "col.withDrop" : "col.thenDepot"))}</dd></div>
      </dl>
      <p class="xs muted" style="margin-top:10px">${esc(t("col.straight"))}</p>
    </section>
    <section><h2 style="margin-bottom:12px">${esc(t("col.list", { m: t("col." + mode) }))}</h2>
      <ol class="list">${ordered.map((s, i) => `<li class="card row-item">
        <span class="dot num ${s.priority === "high" ? "urgent" : ""}">${i + 1}</span>
        <div class="grow"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b>${esc(s.landmark || t("ward", { w: s.ward }))}</b>${s.priority === "high" ? pill(t("col.first"), "warning") : ""}</div>
          <div class="muted small">${hhLabel(s.household)}, ${esc(t("m." + s.material))}, ~${kg(s.est)}, ${esc(t("slot." + s.slot))}</div></div>
        ${s.offline ? pill(t("off.saved"), "warning") : `<button class="btn sm" data-act="confirmPickup" data-id="${s.id}">${icon("scale", 16)}${esc(t("col.confirm"))}</button>`}</li>`).join("")}</ol>
    </section>
  </div></div>`;
}

function collectorOfflinePanel() {
  const off = isOffline();
  const items = outboxFor(S.user.id).slice(-8).reverse();
  const waiting = items.filter((x) => x.status !== "synced").length;
  return `<section class="card pad offline-panel ${off ? "is-off" : ""}" aria-live="polite">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:center">
      <div><b>${esc(t(off ? "off.offline" : "off.online"))}</b><p class="small soft">${esc(t(off ? "off.offlineHelp" : "off.onlineHelp"))}</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ${off ? "" : "secondary"} sm" data-act="toggleOffline" aria-pressed="${off}">${esc(t(off ? "off.goOnline" : "off.goOffline"))}</button>
        ${!off && waiting ? `<button class="btn success sm" data-act="syncNow">${icon("refresh", 16)}${esc(t("off.sync", { n: waiting }))}</button>` : ""}
      </div>
    </div>
    ${items.length ? `<ul class="list small" style="margin-top:12px">${items.map((x) => `<li style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;border-top:1px solid var(--line);padding-top:8px">
      ${pill(t("off.st." + x.status), { waiting: "warning", synced: "success", failed: "danger" }[x.status])}
      <span class="grow">${esc(t("off.type." + x.type, { w: kg(x.args.weight), code: x.args.code || "", name: x.args.to ? user(x.args.to).name : "" }))}${x.result ? ` → <b class="num">${esc(x.result)}</b>` : ""}${x.error ? `<span class="xs" style="display:block;color:var(--danger-ink)">${esc(x.error)}</span>` : ""}</span>
      <span class="xs muted">${esc(when(x.at))}</span></li>`).join("")}</ul>` : ""}
  </section>`;
}

function dutySwitch() {
  const on = S.user.onDuty !== false;
  return `<button class="btn ${on ? "success" : "secondary"} sm" data-act="toggleDuty" aria-pressed="${on}">${esc(t(on ? "dp.onDuty" : "dp.offDuty"))}</button>`;
}

// The Uber-style request card: accept or decline before the timer runs out.
function offerCard() {
  const r = offerFor(S.user.id);
  if (!r) return "";
  const left = Math.max(0, Math.ceil((r.dispatch.offeredAt + OFFER_TTL_MS - Date.now()) / 1000));
  return `<section class="offer card pad" role="alertdialog" aria-labelledby="offer-title" aria-live="assertive">
    <div class="offer-head"><b id="offer-title">${icon("truck", 20)} ${esc(t("dp.newRequest"))}</b><span class="offer-timer num" id="offer-timer" data-until="${r.dispatch.offeredAt + OFFER_TTL_MS}">${left}s</span></div>
    <div class="offer-body">
      <div><span class="muted xs">${esc(t("ho.colMat"))}</span><b>${esc(t("m." + r.material))} · ${esc(t("size." + r.size))}</b></div>
      <div><span class="muted xs">${esc(t("dp.distance"))}</span><b class="num">${r.dispatch.km} km</b></div>
      <div><span class="muted xs">${esc(t("wd.ward"))}</span><b>${esc(t("ward", { w: r.ward }))}${r.landmark ? ` · ${esc(r.landmark)}` : ""}</b></div>
      <div><span class="muted xs">${esc(t("col.load"))}</span><b class="num">+${kg(r.est)} (${kg(cartLoad(S.user) + r.est)} / ${kg(S.user.capacity)})</b></div>
    </div>
    ${mapBlock({ label: t("dp.newRequest"), height: 200, lines: [{ path: [collectorPosition(S.user), r], color: "#1F7A3D", dash: true }],
      points: [{ ...collectorPosition(S.user), type: "tag", text: "🚚", color: "#1A3A6B", tip: t("col.you") }, { lat: r.lat, lng: r.lng, type: "pin", tip: hhLabel(r.household) }] })}
    <div class="offer-actions"><button class="btn success" data-act="acceptOffer" data-id="${r.id}">${icon("check", 18)}${esc(t("dp.accept"))}</button><button class="btn ghost" data-act="declineOffer" data-id="${r.id}">${esc(t("dp.decline"))}</button></div>
  </section>`;
}
