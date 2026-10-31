/* Admin: demo scenarios (weight mismatch, duplicate scan, tamper). */

function viewDemo() {
  const cards = [["mm", "scale"], ["dup", "qr"], ["tm", "shieldOff"]];
  return `<div class="page" style="padding-top:32px">${header(t("dm.title"), t("dm.sub"), "", [[t("ad.title"), "admin"]])}
    <div class="grid2">${cards.map(([k, ic]) => { const r = S.demoResult[k]; return `<section class="card pad" style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;gap:10px;align-items:center;color:var(--link)">${icon(ic, 24)}<h2>${esc(t("dm." + k))}</h2></div>
      <p class="small soft" style="flex:1">${esc(t("dm." + k + "B"))}</p>
      ${r ? `<p class="notice ok small" style="display:block">${esc(t("dm.done", { code: r }))} <button class="num" data-act="passport" data-code="${r}" style="background:none;border:0;padding:0;color:inherit;text-decoration:underline;font-weight:600;cursor:pointer">${esc(t("dm.open", { code: r }))}</button></p>` : ""}
      <div><button class="btn" data-act="demo" data-k="${k}">${esc(t("dm." + k + "Btn"))}</button></div></section>`; }).join("")}</div></div>`;
}
