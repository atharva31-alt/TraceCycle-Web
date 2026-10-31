/* Admin: flags to review. */

function viewFlags() {
  const list = D.flags.filter((f) => S.flagFilter === "all" || f.status === S.flagFilter);
  return `<div class="page" style="padding-top:32px">${header(t("fl.title"), t("fl.sub"), "", [[t("ad.title"), "admin"]])}
    <div class="seg" role="group" style="margin-bottom:16px">${["open", "resolved", "all"].map((f) => `<button data-act="flagFilter" data-f="${f}" aria-pressed="${S.flagFilter === f}">${esc(t("fl." + f))}</button>`).join("")}</div>
    ${list.length ? `<div class="table-wrap"><table><thead><tr><th>${esc(t("fl.risk"))}</th><th>${esc(t("fl.case"))}</th><th>${esc(t("fl.linked"))}</th><th>${esc(t("fl.found"))}</th><th>${esc(t("fl.status"))}</th><th><span class="sr">Actions</span></th></tr></thead><tbody>
      ${list.map((f) => `<tr><td>${pill(t("risk." + f.risk), f.risk === "high" ? "danger" : f.risk === "low" ? "info" : "warning")}</td><td><b>${esc(t("flag." + f.kind))}</b><div class="xs muted">${esc(when(f.at))}</div></td>
        <td class="num">${f.bag ? `<button data-act="passport" data-code="${f.bag}" style="background:none;border:0;padding:0;color:var(--link);text-decoration:underline;cursor:pointer">${f.bag}</button><div class="xs muted">${esc(shown(user(f.subject)))}</div>` : esc(shown(user(f.subject)))}</td>
        <td class="soft">${esc(f.detail)}${f.note ? `<div class="xs" style="color:var(--leaf-ink);margin-top:4px">${esc(f.note)}</div>` : ""}</td><td>${chip(f.status)}</td>
        <td style="text-align:right">${f.status === "open" ? `<button class="btn secondary sm" data-act="resolve" data-id="${f.id}">${esc(t("fl.resolve"))}</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">${esc(t("fl.none"))}</div>`}</div>`;
}
