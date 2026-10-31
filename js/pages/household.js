/* Household dashboard: totals, next pickup, every bag with its status and quality. */

function viewHousehold() {
  const mine = D.requests.filter((r) => r.household === S.user.id).sort((a, b) => b.bookedAt - a.bookedAt);
  const bags = mine.filter((r) => r.bag).map((r) => bag(r.bag));
  const recovered = bags.reduce((s, b) => { const sh = bagShare(b); return s + (sh ? sh.recovered : 0); }, 0);
  const next = mine.find((r) => r.status === "scheduled");
  const score = householdScore(S.user.id);

  const list = mine.map((r) => {
    const b = r.bag ? bag(r.bag) : null;
    const status = b ? topOf(b).status : r.status;
    const measured = b ? measuredQuality(b) : null;
    return `<li class="card row-item">
      <div class="grow"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b style="color:var(--heading)">${esc(t("m." + r.material))}</b>${chip(status)}${r.priority === "high" ? pill(t("hh.first"), "warning") : ""}${r.offline ? pill(t("off.saved"), "warning") : ""}</div>
        <div class="muted small">${esc(t("hh.pickup"))}: ${esc(r.date === "tomorrow" ? t("book.tomorrow") : r.status === "scheduled" ? t("book.today") : dayLabel(r.bookedAt + 0.6 * 864e5))}, ${esc(t("slot." + r.slot))}</div></div>
      <div class="small" style="display:flex;gap:20px;flex-wrap:wrap">
        <div><div class="muted">${esc(t("hh.est"))}</div><b class="num">${kg(r.est)}</b></div>
        <div><div class="muted">${esc(t("hh.weighed"))}</div><b class="num">${b ? kg(b.measured) : "–"}</b></div>
        <div><div class="muted">${esc(t("q.short"))}</div><b class="num">${measured ? `${measured.score}${measured.estimate ? "*" : ""}` : r.check ? `~${r.check.score}` : "–"}</b></div>
      </div>
      ${b ? `<button class="btn secondary sm num" data-act="passport" data-code="${b.code}">${icon("route", 16)}${b.code}</button>` : r.status === "scheduled" || r.status === "requested" ? `<span class="small">${esc(t("hs.yours"))}: <b class="num">${r.handshake}</b></span>` : `<span class="muted small">${esc(t("hh.notYet"))}</span>`}
    </li>`;
  }).join("");

  return `<div class="page" style="padding-top:32px">${header(t("hh.title"), t("hh.sub"), `<button class="btn" data-act="go" data-view="book">${esc(t("nav.book"))}</button>`)}
    ${tiles([
      { k: t("hh.tBags"), v: bags.length, n: t("hh.tBagsN") },
      { k: t("hh.tKg"), v: kg(bags.reduce((s, b) => s + b.measured, 0)), n: t("hh.tKgN") },
      { k: t("hh.tRec"), v: kg(recovered), n: t("hh.tRecN"), tone: "success" },
      { k: t("rw.score"), v: score.points, n: t("hh.tScoreN") },
      { k: t("hh.tNext"), v: next ? esc(t(next.date === "tomorrow" ? "book.tomorrow" : "book.today")) : "–", n: next ? t("slot." + next.slot) : t("hh.tNoNext") },
    ])}
    ${trackingCard(mine)}
    <h2 style="margin-bottom:12px">${esc(t("hh.list"))}</h2>
    ${mine.length ? `<ul class="list">${list}</ul><p class="xs muted" style="margin-top:8px">${esc(t("q.legend"))}</p>` : `<div class="empty">${esc(t("hh.empty"))}</div>`}
  </div>`;
}

// "Where is my collector?" for pickups due today, like tracking a delivery.
function trackingCard(mine) {
  const finding = mine.find((r) => r.status === "requested");
  if (finding) return findingCard(finding);
  const today = mine.filter((r) => r.status === "scheduled" && r.date !== "tomorrow" && r.collector);
  if (!today.length) return "";
  const r = today[0];
  const c = user(r.collector);
  const q = collectorQueue(c);
  const e = q.etas[r.id];
  const away = r2(haversine(q.pos, r));
  return `<section class="card pad track-card" aria-live="polite">
    <div class="track-head">
      <div><div class="muted small">${esc(t("tr.title"))}</div>
        <b style="font-size:1.15rem;color:var(--heading)">${esc(shown(c))} · ${esc(t("m." + r.material))}</b>
        <p class="small soft">${e ? esc(t("tr.stop", { n: e.stop, of: q.left })) + " · " + esc(t("tr.eta", { eta: etaText(e.min) })) : ""} · ${esc(t("tr.away", { km: away }))}</p></div>
      <div class="hs-code"><span class="xs">${esc(t("hs.yours"))}</span><b class="num">${r.handshake}</b><span class="xs">${esc(t("hs.give"))}</span></div>
    </div>
    ${mapBlock({ label: t("tr.title"), height: 280,
      lines: [{ path: [q.pos, r], color: "#1A3A6B", dash: true }],
      points: [{ lat: q.pos.lat, lng: q.pos.lng, type: "tag", text: "🚚", color: "#1F7A3D", tip: shown(c) }, { lat: r.lat, lng: r.lng, type: "pin", tip: t("tr.you") }] })}
    <p class="xs muted" style="margin-top:6px">${esc(t("tr.note"))}</p>
    ${today.length > 1 ? `<p class="small soft" style="margin-top:6px">${esc(t("tr.more", { n: today.length - 1 }))}</p>` : ""}
  </section>`;
}

function findingCard(r) {
  const offered = r.dispatch.offeredTo ? user(r.dispatch.offeredTo) : null;
  const trucks = wardCollectors(r, r.ward);
  return `<section class="card pad track-card finding" aria-live="polite">
    <div class="track-head">
      <div><div class="muted small">${esc(t("dp.finding"))}</div>
        <b style="font-size:1.15rem;color:var(--heading)">${offered ? esc(t("dp.offered", { name: shown(offered), km: r.dispatch.km })) : esc(t("dp.searching"))}</b>
        <p class="small soft">${esc(t("dp.waiting", { n: r.dispatch.declined.length }))}</p>
        ${offered ? `<p class="small" style="margin-top:6px"><span class="muted">${esc(t("dp.demoTry"))}</span> <button class="link-btn" data-act="loginAsCollector" data-id="${offered.id}">${esc(t("dp.loginAs", { name: offered.name }))}</button></p>` : ""}</div>
      <div class="hs-code"><span class="xs">${esc(t("hs.yours"))}</span><b class="num">${r.handshake}</b><span class="xs">${esc(t("hs.give"))}</span></div>
    </div>
    ${mapBlock({ label: t("dp.finding"), height: 280,
      lines: offered ? [{ path: [collectorPosition(offered), r], color: "#1F7A3D", dash: true }] : [],
      points: [...trucks.map((n) => ({ lat: n.pos.lat, lng: n.pos.lng, type: "tag", text: "🚚", color: offered && n.c.id === offered.id ? "#1F7A3D" : "#1A3A6B", tip: `${shown(n.c)} · ${n.km} km` })),
        { lat: r.lat, lng: r.lng, type: "pin", tip: t("tr.you") }] })}
  </section>`;
}
