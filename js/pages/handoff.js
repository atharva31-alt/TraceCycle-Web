/* Shared hand-off pieces (bags held, incoming, outgoing) and the collector, aggregator and recycler pages. */

function heldTable({ canSend, canMerge, canProcess }) {
  const held = D.bags.filter((b) => b.holder === S.user.id && ["picked_up", "at_aggregator", "at_recycler"].includes(b.status));
  if (!held.length) return `<div class="empty">${esc(t("ho.heldEmpty"))}</div>`;
  return `<div class="table-wrap"><table><thead><tr>${canMerge ? `<th><span class="sr">✓</span></th>` : ""}<th>${esc(t("ho.colCode"))}</th><th>${esc(t("ho.colMat"))}</th><th>${esc(t("ho.colW"))}</th><th>${esc(t("ho.colSt"))}</th><th><span class="sr">Actions</span></th></tr></thead><tbody>
    ${held.map((b) => `<tr>
      ${canMerge ? `<td><input type="checkbox" data-change="select" value="${b.code}" ${S.selected.includes(b.code) ? "checked" : ""} aria-label="${esc(t("ho.select", { code: b.code }))}" style="width:16px;height:16px;accent-color:#1A3A6B"></td>` : ""}
      <td><button class="num" data-act="passport" data-code="${b.code}" style="background:none;border:0;padding:0;color:var(--link);text-decoration:underline;font-weight:600;cursor:pointer">${b.code}</button>
        <div class="xs muted">${b.req ? esc(t("ward", { w: b.ward })) : esc(t("ho.bundleOf", { n: D.bags.filter((x) => x.parent === b.code).length }))}</div></td>
      <td>${esc(t("m." + b.material))}</td><td class="num">${kg(b.current)}</td><td>${chip(b.status)}</td>
      <td style="text-align:right">${canSend ? `<button class="btn sm" data-act="handoff" data-code="${b.code}">${icon("truck", 16)}${esc(t("ho.handOff"))}</button>` : ""}${canProcess ? `<button class="btn sm" data-act="outcome" data-code="${b.code}">${icon("factory", 16)}${esc(t("rec.record"))}</button>` : ""}</td>
    </tr>`).join("")}</tbody></table></div>`;
}
function incomingList() {
  const inc = D.transfers.filter((x) => x.to === S.user.id && x.status === "pending");
  return `<section><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px"><h2>${esc(t("ho.in"))}</h2><button class="btn" data-act="receive">${icon("qr")}${esc(t("ho.scan"))}</button></div>
    ${inc.length ? `<ul class="list">${inc.map((x) => { const b = bag(x.bag); return `<li class="card row-item"><span style="color:var(--saffron-ink)">${icon("truck")}</span>
      <div class="grow"><b class="num" style="color:var(--heading)">${x.bag}</b> <span class="soft small">${esc(t("m." + b.material))}</span><div class="muted small">${esc(t("ho.from", { name: shown(user(x.from)), w: kg(x.sent) }))}</div></div>
      <button class="btn secondary sm" data-act="receive" data-code="${x.bag}">${esc(t("ho.receive"))}</button></li>`; }).join("")}</ul>` : `<div class="empty">${esc(t("ho.inEmpty"))}</div>`}</section>`;
}
function outgoingList() {
  const out = D.transfers.filter((x) => x.from === S.user.id && x.status === "pending");
  return `<section><h2 style="margin-bottom:12px">${esc(t("ho.out"))}</h2>${out.length ? `<ul class="list card" style="padding:0">${out.map((x) => `<li class="row-item small" style="margin:0;border-bottom:1px solid var(--line)"><span class="grow"><b class="num">${x.bag}</b> <span class="soft">${esc(t("ho.to", { name: user(x.to).name }))}</span></span><span class="num muted">${kg(x.sent)}</span></li>`).join("")}</ul>` : `<div class="empty">${esc(t("ho.outEmpty"))}</div>`}</section>`;
}
function viewBags() {
  return `<div class="page" style="padding-top:32px">${header(t("nav.bags"), t("col.bagsSub"), "", [[t("nav.route"), "collector"]])}${offerCard()}<div class="stack"><section><h2 style="margin-bottom:12px">${esc(t("ho.held"))}</h2>${heldTable({ canSend: true })}</section>${outgoingList()}</div></div>`;
}
function viewAggregator() {
  const chosen = S.selected.map(bag).filter((b) => b && b.holder === S.user.id && b.status === "at_aggregator");
  const same = new Set(chosen.map((b) => b.material)).size <= 1;
  const me = S.user.id;
  const stock = D.bags.filter((b) => b.holder === me && b.status === "at_aggregator");
  const incoming = D.transfers.filter((x) => x.to === me && x.status === "pending");
  const byMat = {};
  stock.forEach((b) => { byMat[b.material] = (byMat[b.material] || 0) + b.current; });
  const topMat = Object.entries(byMat).sort((a, z) => z[1] - a[1])[0];
  const sentWeek = D.transfers.filter((x) => x.from === me && Date.now() - x.at < 7 * DAY);
  return `<div class="page" style="padding-top:32px">${header(t("agg.title"), t("agg.sub"))}
    ${tiles([
      { k: t("agg.tIn"), v: incoming.length, n: kg(incoming.reduce((s, x) => s + x.sent, 0)) },
      { k: t("agg.tStock"), v: kg(stock.reduce((s, b) => s + b.current, 0)), n: t("agg.tStockN", { n: stock.length }) },
      { k: t("agg.tTop"), v: topMat ? esc(t("m." + topMat[0])) : "–", n: topMat ? kg(topMat[1]) : "" },
      { k: t("agg.tSent"), v: sentWeek.length, n: t("agg.tSentN") },
    ])}
    <div class="stack" style="--gap:40px">
    ${incomingList()}
    <section><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px"><h2>${esc(t("agg.stock"))}</h2>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${chosen.length && !same ? `<span class="small" style="color:var(--saffron-ink);font-weight:600">${esc(t("ho.mixed"))}</span>` : ""}
      <button class="btn secondary" data-act="merge" ${chosen.length < 2 || !same ? "disabled" : ""}>${icon("box")}${esc(t("ho.merge", { n: chosen.length }))}</button></div></div>
      ${heldTable({ canSend: true, canMerge: true })}</section>
    ${outgoingList()}</div></div>`;
}
function viewRecycler() {
  const me = S.user.id;
  const waiting = D.bags.filter((b) => b.holder === me && b.status === "at_recycler");
  const week = D.outcomes.filter((o) => o.recycler === me && Date.now() - o.at < 7 * DAY);
  const all = D.outcomes.filter((o) => o.recycler === me);
  const tot = all.reduce((s, o) => s + o.recovered + o.rejected, 0);
  return `<div class="page" style="padding-top:32px">${header(t("rec.title"), t("rec.sub"))}
    ${tiles([
      { k: t("agg.tIn"), v: D.transfers.filter((x) => x.to === me && x.status === "pending").length },
      { k: t("rec.tWait"), v: kg(waiting.reduce((s, b) => s + b.current, 0)), n: t("agg.tStockN", { n: waiting.length }) },
      { k: t("rec.tWeek"), v: kg(week.reduce((s, o) => s + o.recovered, 0)), n: t("rec.tWeekN"), tone: "success" },
      { k: t("rec.tRate"), v: tot ? `${Math.round(all.reduce((s, o) => s + o.recovered, 0) / tot * 1000) / 10}%` : "–", n: t("rec.tRateN") },
    ])}
    <div class="stack">${incomingList()}<section><h2 style="margin-bottom:12px">${esc(t("rec.ready"))}</h2>${heldTable({ canProcess: true })}</section></div></div>`;
}
