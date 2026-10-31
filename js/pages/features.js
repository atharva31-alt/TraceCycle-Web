/* Feature guide: every feature, who uses it and a direct link to where it is. */

const FEATURE_GUIDE = [
  ["ai", "household", "book"], ["contam", "household", "book"], ["quality", "household", "book"],
  ["route", "collector", "collector"], ["hotspot", "admin", "wards"], ["forecast", "admin", "analytics"],
  ["passport", null, "passport/TC-2026-0088"], ["qr", null, "track"], ["chain", null, "passport/TC-2026-0088"],
  ["lineage", "aggregator", "aggregator"], ["anomaly", "admin", "flags"], ["impact", "admin", "analytics"],
  ["perf", "admin", "analytics"], ["rewards", "household", "rewards"], ["voice", null, null],
  ["notes", null, "notes"], ["offline", "collector", "collector"], ["lang", null, null], ["dash", null, null],
  ["map", null, "home"],
  ["nearby", "household", "book"], ["tracking", "household", "household"], ["handshake", "collector", "collector"],
];

function viewFeatures() {
  const role = S.user?.role;
  return `<div class="page" style="padding-top:32px">${header(t("fg.title"), t("fg.sub"))}
    <div class="table-wrap"><table><thead><tr><th style="width:2.5rem">#</th><th>${esc(t("fg.feature"))}</th><th>${esc(t("fg.where"))}</th><th>${esc(t("fg.who"))}</th><th><span class="sr">${esc(t("ho.actions"))}</span></th></tr></thead><tbody>
      ${FEATURE_GUIDE.map(([k, who, view], i) => {
        const canOpen = view && (!who || who === role || (view.startsWith("passport") || view === "track" || view === "home"));
        const needsLogin = view && who && who !== role;
        const button = k === "voice" ? `<button class="btn secondary sm" data-act="assistant">${esc(t("fg.open"))}</button>`
          : k === "lang" ? `<button class="btn secondary sm" data-act="lang" data-lang="${S.lang === "hi" ? "en" : "hi"}">${S.lang === "hi" ? "English" : "हिंदी"}</button>`
          : canOpen ? `<button class="btn secondary sm" data-act="openFeature" data-view="${view}">${esc(t("fg.open"))}</button>`
          : needsLogin ? `<button class="btn ghost sm" data-act="openFeature" data-view="${view}">${esc(t("fg.login", { r: t("role." + who) }))}</button>` : "";
        return `<tr><td class="num muted">${i + 1}</td><td><b>${esc(t("fg." + k))}</b><div class="small soft">${esc(t("fg." + k + "B"))}</div></td>
          <td class="small">${esc(t("fg." + k + "W"))}</td><td class="small">${who ? esc(t("role." + who)) : esc(t("fg.everyone"))}</td><td style="text-align:right;white-space:nowrap">${button}</td></tr>`;
      }).join("")}
    </tbody></table></div>
    </div>`;
}
