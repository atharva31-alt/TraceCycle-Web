/* Digital Waste Passport: journey timeline, integrity seal, outcome. */

const TAG_LOOK = { self_reported: ["", "#5B6678"], measured: ["info", "#1A3A6B"], verified: ["success", "#1F7A3D"], mismatch: ["danger", "#B42318"], info: ["", "#5B6678"] };
function tagOf(ev) {
  if (ev.type === "reported") return "self_reported";
  if (ev.type === "picked_up" || ev.type === "bundle_created") return "measured";
  if (ev.type === "received") return ev.payload.within_tolerance ? "verified" : "mismatch";
  if (ev.type === "processed") return "verified";
  return "info";
}
function detailOf(ev) {
  const p = ev.payload;
  switch (ev.type) {
    case "reported": return t("d.estimate", { v: kg(p.estimate_kg) });
    case "picked_up": return `${kg(p.weight_kg)}${p.household_code === "matched" ? " · " + t("d.codeOk") : p.household_code === "not_given" ? " · " + t("d.codeNo") : ""}`;
    case "handed_off": return t("d.to", { name: p.to, v: kg(p.weight_sent_kg) });
    case "received": return t("d.received", { s: kg(p.weight_sent_kg), r: kg(p.weight_received_kg) });
    case "merged": return t("d.into", { code: p.into });
    case "bundle_created": return t("d.children", { n: p.children.length, v: kg(p.weight_kg) });
    case "processed": return t("d.processed", { a: kg(p.recovered_kg), b: kg(p.rejected_kg) });
    default: return "";
  }
}
function viewPassport() {
  const b = bag(S.param);
  if (!b) return `<div class="page" style="padding-top:32px">${header(S.param || "", "", "", [[t("nav.track"), "track"]])}<div class="empty">${esc(t("pp.notFound"))}</div></div>`;
  const chain = [b]; let x = b; while (x.parent) { x = bag(x.parent); chain.push(x); }
  const root = chain[chain.length - 1];
  const out = D.outcomes.find((o) => o.bag === root.code);
  const rate = out ? Math.round(out.recovered / (out.recovered + out.rejected) * 1000) / 10 : null;
  const req = b.req ? D.requests.find((r) => r.id === b.req) : null;
  const kids = D.bags.filter((k) => k.parent === b.code);
  const integ = S.integrity && S.integrity.code === b.code ? S.integrity.result : null;
  let lastCode = null;
  const timeline = chain.flatMap((c) => (D.events[c.code] || []).map((ev) => ({ ...ev, code: c.code })));
  const items = timeline.map((ev, i) => {
    const tag = tagOf(ev), [tone, ring] = TAG_LOOK[tag];
    const section = lastCode && ev.code !== lastCode ? `<div class="small" style="margin:0 0 14px 66px;border-top:1px dashed var(--line-strong);padding-top:10px;color:var(--link);font-weight:600">${esc(t("pp.then", { code: ev.code }))}</div>` : "";
    lastCode = ev.code;
    return `<li>${section}<div style="display:flex;gap:16px">
      <div style="display:flex;flex-direction:column;align-items:center"><span class="stamp" style="border-color:${ring};color:${ring}">${icon(tag === "mismatch" ? "alert" : "check", 22)}</span>${i < timeline.length - 1 ? `<span class="tl-line"></span>` : ""}</div>
      <div style="flex:1;min-width:0;padding-bottom:22px">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:baseline"><h3>${esc(t("ev." + ev.type))}</h3><time class="num small muted" datetime="${ev.at}">${esc(when(ev.at))}</time></div>
        <div class="small soft">${esc(shown(user(ev.actor)))}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px"><b class="num small">${esc(detailOf(ev))}</b>${pill(t("tag." + tag), tone)}</div>
        <div class="num xs muted" style="margin-top:4px;word-break:break-all" title="${ev.hash}">${esc(t("pp.hash"))} ${ev.hash.slice(0, 10)}…${ev.hash.slice(-6)}</div>
      </div></div></li>`;
  }).join("");

  const seal = !integ ? `<div class="seal ok" role="status"><p class="small">${esc(t("pp.checking"))}</p></div>` : integ.ok ? `
    <div class="seal ok" role="status"><div style="display:flex;gap:10px;align-items:center">${icon("shield", 30)}<h2 style="color:inherit">${esc(t("pp.ok"))}</h2></div>
      <p class="small" style="margin:8px 0 12px">${esc(t("pp.okBody", { n: integ.checked }))}</p><button class="btn secondary sm" data-act="verify">${icon("refresh", 16)}${esc(t("pp.recheck"))}</button></div>` : `
    <div class="seal bad" role="alert"><div style="display:flex;gap:10px;align-items:center">${icon("shieldOff", 30)}<h2 style="color:inherit">${esc(t("pp.bad"))}</h2></div>
      <p class="small" style="margin:8px 0 12px">${esc(t("pp.badBody", { seq: integ.seq, ev: t("ev." + integ.type), code: integ.code }))}</p><button class="btn secondary sm" data-act="verify">${icon("refresh", 16)}${esc(t("pp.recheck"))}</button></div>`;

  return `<div class="page" style="padding-top:32px">${crumbs([[t("nav.track"), "track"], [b.code]])}
  <article class="card">
    <header style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:24px;padding:24px;border-bottom:1px solid var(--line)">
      <div style="flex:1 1 20rem;min-width:0">
        <div class="muted small">${esc(t("pp.title"))}</div>
        <h1 class="num" style="letter-spacing:.5px">${b.code}</h1>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">${chip(b.status)}${pill(t("m." + b.material), "info")}${kids.length ? pill(t("ho.bundleOf", { n: kids.length })) : ""}</div>
        <dl style="display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:12px 24px;margin:20px 0 0">
          ${req ? `<div><dt class="muted small">${esc(t("pp.origin"))}</dt><dd style="margin:0;font-weight:600">${esc(t("ward", { w: req.ward }))}</dd></div><div><dt class="muted small">${esc(t("pp.est"))}</dt><dd class="num" style="margin:0;font-weight:600">${kg(req.est)}</dd></div>` : ""}
          <div><dt class="muted small">${esc(t(req ? "pp.weighed" : "pp.bundleW"))}</dt><dd class="num" style="margin:0;font-weight:600">${kg(b.measured)}</dd></div>
          <div><dt class="muted small">${esc(t("pp.rate"))}</dt><dd class="num" style="margin:0;font-weight:600">${rate != null ? rate + "%" : "–"}</dd></div>
          ${(() => { const real = b.req ? measuredQuality(b) : null; const est = req?.check; if (!real && !est) return "";
            return `<div><dt class="muted small">${esc(t("pp.quality"))}</dt><dd class="num" style="margin:0;font-weight:600">${real ? `${real.score}/100${real.estimate ? "*" : ""}` : `~${est.score}/100`}</dd>
              <dd class="xs muted" style="margin:0">${esc(real ? (est ? t("pp.qBoth", { e: est.score }) : t("pp.qReal")) : t("pp.qEst"))}</dd></div>`; })()}
        </dl>
      </div>
      <div class="qr" style="text-align:center">${qrSvg(b.code)}<div class="xs muted" style="margin-top:4px">TraceCycle</div></div>
    </header>
    <div style="display:flex;flex-wrap:wrap;gap:32px;padding:24px">
      <div style="flex:999 1 30rem;min-width:0"><h2 style="margin-bottom:18px">${esc(t("pp.journey"))}</h2><ol class="list">${items}</ol>${journeyMap(b, chain)}</div>
      <aside style="flex:1 1 17rem;min-width:0;display:flex;flex-direction:column;gap:16px">
        ${seal}
        <div class="card pad"><h2 style="margin-bottom:10px">${esc(t("pp.outcome"))}</h2>${out ? `
          <dl class="num small" style="margin:0">
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)"><dt>${esc(t("pp.received"))}</dt><dd style="margin:0;font-weight:600">${kg(root.current)}</dd></div>
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)"><dt>${esc(t("pp.recovered"))}</dt><dd style="margin:0;font-weight:600;color:var(--leaf-ink)">${kg(out.recovered)}</dd></div>
            <div style="display:flex;justify-content:space-between;padding:6px 0"><dt>${esc(t("pp.rejected"))}${out.reason ? ` (${esc(t("reason." + out.reason))})` : ""}</dt><dd style="margin:0;font-weight:600;color:var(--danger-ink)">${kg(out.rejected)}</dd></div>
          </dl><p class="xs muted" style="margin-top:6px">${esc(user(out.recycler).name)}</p>
          ${root !== b ? `<p class="notice warn small" style="margin-top:12px;display:block">${esc(t("pp.estNote", { code: root.code }))} <b class="num">${esc(t("pp.share", { v: kg(b.measured * rate / 100) }))}</b></p>` : ""}` : `<p class="muted small">${esc(t("pp.notYet"))}</p>`}</div>
        ${b.parent || kids.length ? `<div class="card pad small">${b.parent ? `<p>${esc(t("pp.partOf"))}: <button class="num" data-act="passport" data-code="${b.parent}" style="background:none;border:0;padding:0;color:var(--link);text-decoration:underline;font-weight:600;cursor:pointer">${b.parent}</button></p>` : ""}
          ${kids.length ? `<h3 style="margin-bottom:8px">${esc(t("pp.contains"))}</h3><ul class="num" style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:4px">${kids.map((k) => `<li><button data-act="passport" data-code="${k.code}" style="background:none;border:0;padding:0;color:var(--link);text-decoration:underline;cursor:pointer">${k.code}</button> <span class="muted">${kg(k.current)}</span></li>`).join("")}</ul>` : ""}</div>` : ""}
        <div class="no-print" style="display:flex;flex-wrap:wrap;gap:8px">
          <button class="btn" data-act="print">${icon("printer")}${esc(t("pp.print"))}</button>
          <button class="btn wa" data-act="whatsapp" data-code="${b.code}">${icon("share")}${esc(t("share.wa"))}</button>
        </div>
      </aside>
    </div>
  </article></div>`;
}

// Where the bag went. The household is shown only at its ward centre, never at the exact door.
function journeyMap(b, chain) {
  const stops = [];
  const req = b.req ? D.requests.find((r) => r.id === b.req) : null;
  const moves = chain.flatMap((c) => D.transfers.filter((x) => x.bag === c.code)).sort((a, z) => a.at - z.at);
  if (req) {
    const [lat, lng] = WARD_CENTRES[req.ward];
    stops.push({ lat, lng, tip: t("pp.mapHome", { w: req.ward }), done: true });
  } else if (moves.length) {
    const from = user(moves[0].from);
    stops.push({ lat: from.lat, lng: from.lng, tip: from.name, done: true });
  }
  moves.forEach((x) => { const u = user(x.to); stops.push({ lat: u.lat, lng: u.lng, tip: u.name, done: x.status === "confirmed" }); });
  if (stops.length < 2) return "";
  const lastDone = stops.map((s) => s.done).lastIndexOf(true);
  const lines = [{ path: stops.slice(0, lastDone + 1), color: "#1F7A3D" }];
  if (lastDone < stops.length - 1) lines.push({ path: stops.slice(lastDone), color: "#5B6678", dash: true });
  return `<h2 style="margin:8px 0 12px">${esc(t("pp.where"))}</h2>${mapBlock({
    label: t("pp.where"), height: 340, lines,
    points: stops.map((s, i) => ({ lat: s.lat, lng: s.lng, type: i === 0 ? "tag" : "num", text: i === 0 ? t("pp.mapStart") : String(i), color: s.done ? "#1F7A3D" : "#E8772E", tip: s.tip })),
  })}<p class="xs muted" style="margin-top:6px">${esc(t("pp.mapNote"))}</p>`;
}
