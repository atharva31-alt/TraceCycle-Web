/* Admin analytics: demand forecast, recycler performance, check accuracy and the impact calculator. */

function forecastChart(f) {
  const actual = f.total.map((w) => w.kg);
  const fc = f.forecast || [];
  const all = [...actual, ...fc.map((x) => x.high)];
  const max = Math.max(10, ...all) * 1.1;
  const W = 640, H = 240, left = 44, right = 16, top = 16, bottom = 36;
  const n = actual.length + fc.length;
  const x = (i) => left + (i * (W - left - right)) / (n - 1);
  const y = (v) => top + (H - top - bottom) * (1 - v / max);
  const line = actual.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = actual.length - 1;
  const fLine = [[last, actual[last]], ...fc.map((p, i) => [last + 1 + i, p.kg])].map(([i, v]) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const band = fc.length ? [[last, actual[last]], ...fc.map((p, i) => [last + 1 + i, p.high])].map(([i, v]) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ") + " " +
    [...fc.map((p, i) => [last + 1 + i, p.low]).reverse(), [last, actual[last]]].map(([i, v]) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ") : "";
  const labels = [...f.total.map((w) => dayLabel(w.from)), ...fc.map((_, i) => t("an.wk", { n: i + 1 }))];
  const grid = [0, 0.5, 1].map((p) => { const v = Math.round(max * p); return `<line x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${left - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="Noto Sans">${v}</text>`; }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(t("an.forecast"))}">
    ${grid}
    ${band ? `<polygon points="${band}" fill="#E8772E" fill-opacity=".15"/>` : ""}
    <polyline points="${line}" fill="none" stroke="#1A3A6B" stroke-width="3" stroke-linejoin="round"/>
    ${fc.length ? `<polyline points="${fLine}" fill="none" stroke="#E8772E" stroke-width="3" stroke-dasharray="7 6"/>` : ""}
    ${actual.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="#1A3A6B"><title>${r1(v)} kg</title></circle>`).join("")}
    ${fc.map((p, i) => `<circle cx="${x(last + 1 + i)}" cy="${y(p.kg)}" r="4" fill="#E8772E"><title>${p.kg} kg (${p.low}–${p.high})</title></circle>`).join("")}
    ${labels.map((l, i) => `<text x="${x(i)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="Noto Sans">${esc(l)}</text>`).join("")}
  </svg>`;
}

function recyclerPerformance() {
  return D.users.filter((u) => u.role === "recycler").map((u) => {
    const outs = D.outcomes.filter((o) => o.recycler === u.id);
    const kgDone = outs.reduce((s, o) => s + o.recovered + o.rejected, 0);
    const days = outs.flatMap((o) => leaves(bag(o.bag)).map((l) => (o.at - l.createdAt) / DAY));
    const reasons = {};
    outs.forEach((o) => { if (o.reason) reasons[o.reason] = (reasons[o.reason] || 0) + o.rejected; });
    const top = Object.entries(reasons).sort((a, z) => z[1] - a[1])[0];
    return { u, batches: outs.length, kg: kgDone, rate: kgDone ? Math.round(outs.reduce((s, o) => s + o.recovered, 0) / kgDone * 1000) / 10 : null,
      days: days.length ? Math.round(days.reduce((s, d) => s + d, 0) / days.length * 10) / 10 : null, reason: top ? top[0] : null };
  }).filter((r) => r.batches);
}

// How well the check at home (AI or guided) predicted what the recycler later measured.
function checkAccuracy() {
  const pairs = D.requests.filter((r) => r.check && r.bag).map((r) => ({ est: r.check.score, real: measuredQuality(bag(r.bag)) })).filter((p) => p.real);
  if (!pairs.length) return null;
  const gap = pairs.reduce((s, p) => s + Math.abs(p.est - p.real.score), 0) / pairs.length;
  return { n: pairs.length, gap: Math.round(gap * 10) / 10 };
}

function viewAnalytics() {
  const f = demandForecast();
  const perf = recyclerPerformance();
  const imp = impactSummary();
  const acc = checkAccuracy();
  const checked = D.requests.filter((r) => r.check);
  const dirty = checked.filter((r) => r.check.contamination !== "low").length;
  const leafDays = D.outcomes.flatMap((o) => leaves(bag(o.bag)).map((l) => (o.at - l.createdAt) / DAY));

  return `<div class="page" style="padding-top:32px">${header(t("an.title"), t("an.sub"), pill(t("ad.demoData"), "warning"), [[t("ad.title"), "admin"]])}
    ${tiles([
      { k: t("ad.rate"), v: `${stats().rate ?? "–"}%`, n: t("ad.rateN"), tone: "success" },
      { k: t("an.turn"), v: leafDays.length ? `${Math.round(leafDays.reduce((s, d) => s + d, 0) / leafDays.length * 10) / 10} ${t("an.days")}` : "–", n: t("an.turnN") },
      { k: t("an.dirty"), v: checked.length ? `${Math.round(dirty / checked.length * 100)}%` : "–", n: t("an.dirtyN", { n: checked.length }), tone: "warning" },
      { k: t("an.next"), v: f.forecast ? kg(f.forecast[0].kg) : "–", n: f.forecast ? t("an.range", { a: kg(f.forecast[0].low), b: kg(f.forecast[0].high) }) : "" },
    ])}

    <div class="grid2">
      <section class="card pad"><h2>${esc(t("an.forecast"))}</h2><p class="small soft" style="margin:4px 0 10px">${esc(t("an.forecastHelp"))}</p>
        ${forecastChart(f)}
        <p class="small soft" style="display:flex;flex-wrap:wrap;gap:16px;margin-top:6px"><span><span class="legend" style="background:#1A3A6B"></span>${esc(t("an.actual"))}</span><span><span class="legend" style="background:#E8772E"></span>${esc(t("an.predicted"))}</span><span><span class="legend" style="background:#E8772E;opacity:.25"></span>${esc(t("an.band"))}</span></p>
        <p class="xs muted" style="margin-top:6px">${esc(t("an.forecastNote"))}</p></section>

      <section class="card pad"><h2 style="margin-bottom:10px">${esc(t("an.wardNext"))}</h2>
        <div class="table-wrap" style="border:0"><table style="min-width:0"><thead><tr><th>${esc(t("wd.ward"))}</th><th>${esc(t("an.lastWeek"))}</th><th>${esc(t("an.nextWeek"))}</th></tr></thead><tbody>
          ${f.byWard.map((w) => `<tr><td>${esc(t("ward", { w: w.ward }))}</td><td class="num">${kg(w.series[w.series.length - 1].kg)}</td><td class="num"><b>${w.next ? kg(w.next.kg) : "–"}</b></td></tr>`).join("")}
        </tbody></table></div></section>
    </div>

    <section style="margin-top:24px"><h2 style="margin-bottom:12px">${esc(t("an.perf"))}</h2>
      <div class="table-wrap"><table><thead><tr><th>${esc(t("pe.name"))}</th><th>${esc(t("pe.batches"))}</th><th>${esc(t("pe.kg"))}</th><th>${esc(t("wd.recovery"))}</th><th>${esc(t("an.turn"))}</th><th>${esc(t("an.reason"))}</th></tr></thead><tbody>
        ${perf.map((p) => `<tr><td><b>${esc(p.u.name)}</b></td><td class="num">${p.batches}</td><td class="num">${kg(p.kg)}</td>
          <td class="num">${p.rate != null ? pill(`${p.rate}%`, p.rate >= 92 ? "success" : p.rate >= 85 ? "info" : "warning") : "–"}</td>
          <td class="num">${p.days != null ? `${p.days} ${esc(t("an.days"))}` : "–"}</td><td>${p.reason ? esc(t("reason." + p.reason)) : "–"}</td></tr>`).join("")}
      </tbody></table></div></section>

    <div class="grid2" style="margin-top:24px">
      <section class="card pad"><h2>${esc(t("an.acc"))}</h2>
        ${acc ? `<p class="num" style="font-size:2rem;font-weight:600;color:var(--heading);margin-top:6px">± ${acc.gap}</p><p class="small soft">${esc(t("an.accBody", { n: acc.n }))}</p>`
              : `<p class="small soft" style="margin-top:6px">${esc(t("an.accNone"))}</p>`}
        </section>

      <section class="card pad"><h2>${esc(t("im.title"))}</h2>
        <dl class="small" style="margin:10px 0 0">
          <div class="dl-row"><dt>${esc(t("ad.landfill"))}</dt><dd class="num">${kg(imp.landfill)}</dd></div>
          <div class="dl-row"><dt>${esc(t("ad.rate"))}</dt><dd class="num">${imp.rate ?? "–"}%</dd></div>
          <div class="dl-row"><dt>${esc(t("im.route"))}</dt><dd class="num">${imp.routeSavedKm} km</dd></div>
          <div class="dl-row"><dt>${esc(t("ad.co2"))}</dt><dd class="num">${imp.co2e != null ? `${kg(imp.co2e)} (${esc(t("im.est"))})` : "–"}</dd></div>
        </dl>
        <p class="xs muted" style="margin-top:6px">${esc(imp.co2e != null ? t("im.covers", { m: imp.co2eCovers.map((m) => t("m." + m)).join(", ") }) : t("ad.co2Not"))}</p>
      </section>
    </div>

    <section class="card pad" style="margin-top:24px"><h2>${esc(t("im.factors"))}</h2><p class="small soft" style="margin:4px 0 12px">${esc(t("im.factorsHelp"))}</p>
      <div class="table-wrap"><table><thead><tr><th>${esc(t("ho.colMat"))}</th><th>${esc(t("pp.recovered"))}</th><th>${esc(t("im.factor"))}</th><th>${esc(t("im.source"))}</th><th>${esc(t("ad.co2"))}</th><th><span class="sr">${esc(t("ho.actions"))}</span></th></tr></thead><tbody>
        ${imp.byMaterial.map((m) => `<tr><td><b>${esc(t("m." + m.material))}</b></td><td class="num">${kg(m.recovered)}</td>
          <td class="num">${m.factor ? m.factor.value : "–"}</td><td class="small">${m.factor ? esc(m.factor.source) : `<span class="muted">${esc(t("im.noSource"))}</span>`}</td>
          <td class="num">${m.co2e != null ? kg(m.co2e) : "–"}</td><td style="text-align:right">${m.factor ? `<button class="btn ghost sm" data-act="removeFactor" data-m="${m.material}">${esc(t("im.remove"))}</button>` : ""}</td></tr>`).join("")}
      </tbody></table></div>
      <form class="factor-form" data-form="factor" novalidate>
        <div><label class="label" for="f-mat">${esc(t("ho.colMat"))}</label><select id="f-mat" name="material" class="input">${imp.byMaterial.map((m) => `<option value="${m.material}">${esc(t("m." + m.material))}</option>`).join("")}</select></div>
        <div><label class="label" for="f-val">${esc(t("im.factorKg"))}</label><input id="f-val" name="value" class="input num" type="number" step="0.01" min="0" max="20"></div>
        <div style="grid-column:1 / -1"><label class="label" for="f-src">${esc(t("im.source"))}</label><input id="f-src" name="source" class="input" maxlength="240" placeholder="${esc(t("im.sourceHint"))}"></div>
        <p class="error" id="factor-err" role="alert" style="grid-column:1 / -1"></p>
        <div><button class="btn" type="submit">${esc(t("im.add"))}</button></div>
      </form>
    </section></div>`;
}
