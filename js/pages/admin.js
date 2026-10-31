/* Admin overview: totals counted once, charts, map, flags and impact. */

function viewAdmin() {
  const s = stats();
  const champ = wardLeaderboard()[0];
  const open = D.flags.filter((f) => f.status === "open");
  const maxW = Math.max(1, ...s.weeks.map((w) => w.kg));
  const weekBars = s.weeks.map((w, i) => { const h = Math.round(w.kg / maxW * 150); const x = 40 + i * 140; return `<rect x="${x}" y="${180 - h}" width="70" height="${h}" fill="#1A3A6B"/><text x="${x + 35}" y="${172 - h}" text-anchor="middle" font-size="12" fill="var(--ink-soft)" font-family="Noto Sans">${r1(w.kg)} kg</text><text x="${x + 35}" y="200" text-anchor="middle" font-size="12" fill="var(--muted)" font-family="Noto Sans">${esc(w.label)}</text>`; }).join("");
  const matEntries = Object.entries(s.mats).sort((a, b) => b[1].rec - a[1].rec);
  const maxM = Math.max(1, ...matEntries.map(([, v]) => v.rec + v.rej));
  const matBars = matEntries.map(([m, v]) => `<div><div class="small" style="display:flex;justify-content:space-between"><b>${esc(t("m." + m))}</b><span class="num muted">${kg(v.rec)} / ${kg(v.rej)}</span></div>
    <div style="display:flex;height:14px;background:var(--neutral-soft);margin-top:4px"><div style="width:${(v.rec / maxM * 100).toFixed(1)}%;background:#1F7A3D"></div><div style="width:${(v.rej / maxM * 100).toFixed(1)}%;background:#E8A27A"></div></div></div>`).join("");
  const today = D.requests.filter((r) => r.status === "scheduled" || r.status === "requested" || (r.bag && bag(r.bag).createdAt > Date.now() - 864e5));
  const todayMap = mapBlock({
    label: t("ad.map"), height: 340,
    points: today.map((r) => ({ lat: r.lat, lng: r.lng, type: ["scheduled", "requested"].includes(r.status) ? "ring" : "dot", color: ["scheduled", "requested"].includes(r.status) ? "#C2410C" : "#1F7A3D",
      tip: `${t("ward", { w: r.ward })}, ${t("m." + r.material)}, ${t("st." + r.status)}` })),
  });
  return `<div class="page" style="padding-top:32px">${header(t("ad.title"), t("ad.sub"), `${pill(t("ad.demoData"), "warning")}<button class="btn secondary sm" data-act="csv">${icon("download", 16)}${esc(t("ad.csv"))}</button>`)}
    ${tiles([
      { k: t("ad.collected"), v: kg(s.collected), n: t("ad.collectedN") },
      { k: t("ad.recovered"), v: kg(s.rec), n: t("ad.recoveredN"), tone: "success" },
      { k: t("ad.rejected"), v: kg(s.rej), n: t("ad.rejectedN"), tone: "danger" },
      { k: t("ad.rate"), v: `${s.rate ?? "–"}%`, n: t("ad.rateN") },
      { k: t("ad.traced"), v: `${s.traced ?? "–"}%`, n: t("ad.tracedN", { kg: kg(s.moving) }) },
    ])}
    <p class="xs muted" style="margin:-14px 0 0">${esc(t("ad.once"))}</p>
    <div class="grid2" style="margin-top:24px">
      <section class="card pad"><h2 style="margin-bottom:12px">${esc(t("ad.weekly"))}</h2><svg viewBox="0 0 600 210" width="100%" role="img" aria-label="${esc(t("ad.weekly"))}"><line x1="20" y1="180" x2="590" y2="180" stroke="var(--line-strong)"/>${weekBars}</svg></section>
      <section class="card pad"><h2 style="margin-bottom:12px">${esc(t("ad.materials"))}</h2><div class="stack" style="--x:0">${matBars}</div>
        <p class="small soft" style="display:flex;gap:16px;margin-top:12px"><span><span style="display:inline-block;width:12px;height:12px;background:#1F7A3D"></span> ${esc(t("ad.recovered"))}</span><span><span style="display:inline-block;width:12px;height:12px;background:#E8A27A"></span> ${esc(t("ad.rejected"))}</span></p></section>
      <section class="card pad"><h2 style="margin-bottom:6px">${esc(t("ad.map"))}</h2>
        <p class="small soft" style="display:flex;gap:16px;margin-bottom:10px"><span>⭘ ${esc(t("ad.waiting"))}</span><span style="color:var(--leaf-ink)">● ${esc(t("ad.done"))}</span></p>
        ${todayMap}</section>
      <div class="stack">
        <section class="card pad" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><h2>${esc(t("ad.flags"))}</h2><p class="num" style="font-size:1.9rem;font-weight:600;color:var(--heading)">${open.length}</p>${open.some((f) => f.risk === "high") ? `<p class="small" style="color:var(--danger-ink);font-weight:600">${esc(t("ad.high", { n: open.filter((f) => f.risk === "high").length }))}</p>` : ""}</div><button class="btn secondary sm" data-act="go" data-view="flags">${esc(t("ad.review"))}</button></section>
        <section class="card pad"><h2 style="margin-bottom:10px">${esc(t("ad.impact"))}</h2><dl class="small" style="margin:0">
          <div style="display:flex;justify-content:space-between"><dt>${esc(t("ad.landfill"))}</dt><dd class="num" style="margin:0;font-weight:600">${kg(s.rec)}</dd></div>
          <div style="display:flex;justify-content:space-between;margin-top:6px"><dt>${esc(t("ad.co2"))}</dt><dd style="margin:0;font-weight:600">–</dd></div>
          <p class="xs muted" style="margin-top:4px">${esc(t("ad.co2Not"))}</p>
          <div style="display:flex;justify-content:space-between;margin-top:10px;border-top:1px solid var(--line);padding-top:10px"><dt>${esc(t("ad.week"))}</dt><dd class="num" style="margin:0;font-weight:600">${esc(t("ad.weekV", { d: s.completed, b: s.booked }))}</dd></div></dl></section>
        <section class="card pad" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><h2>${esc(t("ad.champion"))}</h2>${champ ? `<p style="margin-top:4px"><b>${esc(t("ward", { w: champ.ward }))}</b> <span class="num muted">${champ.recoveryRate}%</span></p>` : `<p class="muted small">–</p>`}</div><button class="btn secondary sm" data-act="go" data-view="wards">${esc(t("nav.wards"))}</button></section>
      </div>
    </div></div>`;
}
