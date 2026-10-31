/* Household: Green Score, badges and the ward leaderboard. */

function viewRewards() {
  const score = householdScore(S.user.id);
  const board = wardLeaderboard();
  const mine = board.find((w) => w.ward === S.user.ward);
  return `<div class="page" style="padding-top:32px">${header(t("rw.title"), t("rw.sub"), "", [[t("hh.title"), "household"]])}
    <div class="grid2">
      <section class="card pad">
        <div class="muted small">${esc(t("rw.score"))}</div>
        <p class="num" style="font-size:2.6rem;font-weight:600;color:var(--leaf-ink);line-height:1.2">${score.points}</p>
        <p class="small soft">${esc(t("rw.from", { n: score.bags }))}</p>
        <h3 style="margin:18px 0 8px">${esc(t("rw.badges"))}</h3>
        <ul class="list" style="display:flex;flex-wrap:wrap;gap:8px">${score.badges.map((b) => `
          <li style="margin:0">${pill((b.earned ? "✓ " : "") + t(b.key), b.earned ? "success" : "")}</li>`).join("")}</ul>
        <p class="xs muted" style="margin-top:14px">${esc(t("rw.rules"))}</p>
      </section>
      <section class="card pad">
        <h2 style="margin-bottom:10px">${esc(t("rw.board"))}</h2>
        ${board.length ? `<ol class="list">${board.map((w, i) => `
          <li class="row-item" style="padding:8px 0;border-bottom:1px solid var(--line)">
            <span class="dot num ${w.champion ? "" : ""}" style="${w.champion ? "background:var(--leaf)" : "background:var(--neutral-soft);color:var(--ink-soft)"}">${i + 1}</span>
            <span class="grow"><b>${esc(t("ward", { w: w.ward }))}</b>${w.ward === S.user.ward ? ` ${pill(t("rw.yours"), "info")}` : ""}${w.champion ? ` ${pill(t("rw.champion"), "success")}` : ""}
              <span class="xs muted" style="display:block">${esc(t("rw.homes", { n: w.households }))}</span></span>
            <b class="num">${w.recoveryRate}%</b></li>`).join("")}</ol>` : `<p class="muted">–</p>`}
        <p class="xs muted" style="margin-top:10px">${esc(t("rw.boardNote"))}</p>
        ${mine ? "" : `<p class="small soft" style="margin-top:8px">${esc(t("rw.noWard"))}</p>`}
      </section>
    </div>
    <section style="margin-top:24px"><h2 style="margin-bottom:12px">${esc(t("rw.history"))}</h2>
      ${score.items.length ? `<div class="table-wrap"><table><thead><tr><th>${esc(t("rw.what"))}</th><th>${esc(t("ho.colCode"))}</th><th>${esc(t("rw.points"))}</th></tr></thead><tbody>
        ${score.items.map((i) => `<tr><td>${esc(t(i.key))}${i.estimate ? ` ${pill(t("rw.estimate"))}` : ""}<div class="xs muted">${esc(when(i.at))}</div></td>
          <td class="num">${i.code ? `<button data-act="passport" data-code="${i.code}" class="link-btn">${i.code}</button>` : "–"}</td><td class="num"><b>+${i.points}</b></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">${esc(t("rw.empty"))}</div>`}
    </section></div>`;
}
