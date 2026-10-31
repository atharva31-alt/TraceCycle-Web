/* Admin: audit log of important actions. */

function viewAudit() {
  const rows = D.audit.slice(0, 200);
  return `<div class="page" style="padding-top:32px">${header(t("au.title"), t("au.sub"), "", [[t("ad.title"), "admin"]])}
    ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>${esc(t("au.when"))}</th><th>${esc(t("au.who"))}</th><th>${esc(t("au.action"))}</th><th>${esc(t("au.record"))}</th></tr></thead><tbody>
      ${rows.map((r) => { const u = user(r.actor); return `<tr><td class="num small" style="white-space:nowrap">${esc(when(r.at))}</td><td>${esc(shown(u))}<div class="xs muted">${u ? esc(t("role." + u.role)) : ""}</div></td>
        <td>${esc(t("act." + r.action))}</td><td class="num">${String(r.entity).startsWith("TC-") ? `<button class="link-btn" data-act="passport" data-code="${esc(r.entity)}">${esc(r.entity)}</button>` : esc(r.entity)}</td></tr>`; }).join("")}
    </tbody></table></div>` : `<div class="empty">${esc(t("au.empty"))}</div>`}</div>`;
}
