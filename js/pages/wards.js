/* Admin: ward hotspots and a simple next-week estimate. */

function viewWards() {
  const rows = wardStats();
  const fc = demandForecast().byWard;
  rows.forEach((r) => { const w = fc.find((x) => x.ward === r.ward); r.nextWeek = w?.next ? w.next.kg : r.nextWeek; });
  const maxPending = Math.max(1, ...rows.map((r) => r.pending));
  const hotspotMap = mapBlock({
    label: t("wd.map"), height: 380,
    areas: rows.map((r) => ({ lat: WARD_CENTRES[r.ward][0], lng: WARD_CENTRES[r.ward][1], radius: 330, color: "#E8772E",
      opacity: r.pending ? +(0.15 + 0.45 * r.pending / maxPending).toFixed(2) : 0.03, text: `${t("ward", { w: r.ward })}: ${t("wd.pendingN", { n: r.pending })}` })),
  });
  const top3 = [...rows].sort((a, b) => b.pending - a.pending).filter((r) => r.pending).slice(0, 1)[0];
  return `<div class="page" style="padding-top:32px">${header(t("wd.title"), t("wd.sub"), "", [[t("ad.title"), "admin"]])}
    ${top3 ? `<div class="notice warn" style="margin-bottom:16px">${icon("info")}<span>${esc(t("wd.suggest", { w: top3.ward, n: top3.pending }))}</span></div>` : ""}
    <div class="grid2">
      <section class="card pad"><h2 style="margin-bottom:10px">${esc(t("wd.map"))}</h2>
        ${hotspotMap}
        <p class="xs muted" style="margin-top:8px">${esc(t("wd.mapNote"))}</p></section>
      <section class="card pad"><h2 style="margin-bottom:10px">${esc(t("wd.estimate"))}</h2>
        <div class="stack">${rows.map((r) => `<div><div class="small" style="display:flex;justify-content:space-between"><b>${esc(t("ward", { w: r.ward }))}</b><span class="num">${kg(r.nextWeek)}</span></div>
          <div style="height:10px;background:var(--neutral-soft);margin-top:4px"><div style="height:10px;width:${Math.min(100, r.nextWeek / Math.max(1, ...rows.map((x) => x.nextWeek)) * 100).toFixed(1)}%;background:var(--navy)"></div></div></div>`).join("")}</div>
        <p class="xs muted" style="margin-top:12px">${esc(t("wd.estNote"))}</p></section>
    </div>
    <div class="table-wrap" style="margin-top:24px"><table><thead><tr><th>${esc(t("wd.ward"))}</th><th>${esc(t("wd.requests"))}</th><th>${esc(t("wd.pending"))}</th><th>${esc(t("wd.collected"))}</th><th>${esc(t("wd.recovery"))}</th><th>${esc(t("wd.reject"))}</th><th>${esc(t("wd.next"))}</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td><b>${esc(t("ward", { w: r.ward }))}</b></td><td class="num">${r.requests}</td><td class="num">${r.pending ? pill(String(r.pending), "warning") : "0"}</td><td class="num">${kg(r.collected)}</td>
        <td class="num">${r.recoveryRate ?? "–"}${r.recoveryRate != null ? "%" : ""}</td><td class="num">${r.rejectRate ?? "–"}${r.rejectRate != null ? "%" : ""}</td><td class="num">${kg(r.nextWeek)}</td></tr>`).join("")}
    </tbody></table></div>
    <p class="xs muted" style="margin-top:8px">${esc(t("wd.tableNote"))}</p></div>`;
}
