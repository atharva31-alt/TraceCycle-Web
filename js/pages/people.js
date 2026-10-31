/* Admin: how each collector, aggregator and recycler is doing. For review priority, never as proof. */

function viewPeople() {
  const { handlers, recyclers } = peopleStats();
  return `<div class="page" style="padding-top:32px">${header(t("pe.title"), t("pe.sub"), "", [[t("ad.title"), "admin"]])}
    <h2 style="margin-bottom:12px">${esc(t("pe.handlers"))}</h2>
    <div class="table-wrap"><table><thead><tr><th>${esc(t("pe.name"))}</th><th>${esc(t("pe.role"))}</th><th>${esc(t("pe.handoffs"))}</th><th>${esc(t("pe.mismatch"))}</th><th>${esc(t("pe.last"))}</th><th>${esc(t("pe.flags"))}</th></tr></thead><tbody>
      ${handlers.map((h) => `<tr><td><b>${esc(h.u.name)}</b></td><td>${esc(t("role." + h.u.role))}</td><td class="num">${h.handoffs}</td>
        <td class="num">${h.mismatches ? pill(`${h.mismatches} / ${h.handoffs}`, h.mismatches >= 3 ? "danger" : "warning") : "0"}</td>
        <td class="small">${h.lastMismatch ? esc(when(h.lastMismatch)) : "–"}</td><td class="num">${h.openFlags || "0"}</td></tr>`).join("")}</tbody></table></div>
    <h2 style="margin:28px 0 12px">${esc(t("pe.recyclers"))}</h2>
    <div class="table-wrap"><table><thead><tr><th>${esc(t("pe.name"))}</th><th>${esc(t("pe.accepts"))}</th><th>${esc(t("pe.batches"))}</th><th>${esc(t("pe.kg"))}</th><th>${esc(t("wd.reject"))}</th></tr></thead><tbody>
      ${recyclers.map((r) => `<tr><td><b>${esc(r.u.name)}</b></td><td class="small">${r.u.accepts.map((m) => esc(t("m." + m))).join(", ")}</td><td class="num">${r.batches}</td><td class="num">${kg(r.kg)}</td><td class="num">${r.rejectRate ?? "–"}${r.rejectRate != null ? "%" : ""}</td></tr>`).join("")}</tbody></table></div>
    <p class="xs muted" style="margin-top:10px">${esc(t("pe.note"))}</p>
    ${addStaffForm()}</div>`;
}

function addStaffForm() {
  const f = S.staffForm || (S.staffForm = { role: "collector" });
  const materials = MATERIALS.map((m) => `<label class="tick"><input type="checkbox" name="mat" value="${m}" ${f.role === "aggregator" && m !== "organic" ? "checked" : ""}> ${esc(t("m." + m))}</label>`).join("");
  return `<section class="card pad" style="margin-top:28px" id="add-staff"><h2>${esc(t("pe.addTitle"))}</h2><p class="small soft" style="margin:4px 0 14px">${esc(t("pe.addHelp"))}</p>
    <form class="staff-form" data-form="staff" novalidate>
      <div><label class="label" for="st-role">${esc(t("pe.role"))}</label><select id="st-role" name="role" class="input" data-change="staffRole">${["collector", "aggregator", "recycler"].map((r) => `<option value="${r}" ${f.role === r ? "selected" : ""}>${esc(t("role." + r))}</option>`).join("")}</select></div>
      <div><label class="label" for="st-name">${esc(t("pe.name"))}</label><input id="st-name" name="name" class="input" maxlength="80"></div>
      <div><label class="label" for="st-phone">${esc(t("auth.phone"))}</label><input id="st-phone" name="phone" class="input num" type="tel" inputmode="numeric" maxlength="14" data-phone aria-describedby="st-phone-hint"><p class="hint" id="st-phone-hint">${esc(t("auth.phoneHint"))}</p></div>
      <div><label class="label" for="st-ward">${esc(t(f.role === "collector" ? "pe.base" : "pe.place"))}</label><select id="st-ward" name="ward" class="input">${[1, 2, 3, 4, 5, 6].map((w) => `<option value="${w}">${esc(t("ward", { w }))}</option>`).join("")}</select></div>
      ${f.role === "collector"
        ? `<fieldset style="grid-column:1 / -1"><legend class="label">${esc(t("pe.wards"))}</legend><div class="ticks">${[1, 2, 3, 4, 5, 6].map((w) => `<label class="tick"><input type="checkbox" name="wards" value="${w}"> ${esc(t("ward", { w }))}</label>`).join("")}</div></fieldset>`
        : `<fieldset style="grid-column:1 / -1"><legend class="label">${esc(t("pe.accepts"))}</legend><div class="ticks">${materials}</div></fieldset>`}
      <p class="error" id="staff-err" role="alert" style="grid-column:1 / -1"></p>
      <div><button class="btn" type="submit">${esc(t("pe.addBtn"))}</button></div>
    </form></section>`;
}

function addStaff(admin, data) {
  const phone = normalisePhone(data.phone);
  if (data.name.trim().length < 2) throw fail(t("auth.nameReq"));
  if (!validPhone(phone)) throw fail(t("auth.phoneInvalid"));
  if (D.users.some((u) => u.phone === phone)) throw fail(t("pe.taken"));
  if (data.role === "collector" && !data.wards.length) throw fail(t("pe.needWards"));
  if (data.role !== "collector" && !data.accepts.length) throw fail(t("pe.needMats"));
  const [lat, lng] = WARD_CENTRES[data.ward];
  const u = { id: Math.max(...D.users.map((x) => x.id)) + 1, role: data.role, name: data.name.trim(), phone, verified: true,
    lat: +(lat + 0.001).toFixed(6), lng: +(lng + 0.001).toFixed(6), capacity: data.role === "collector" ? 50 : data.role === "aggregator" ? 800 : 1500 };
  if (data.role === "collector") {
    u.wards = data.wards;
    // a ward served by two collectors goes to the newest one
    D.users.filter((x) => x.role === "collector" && x.id !== u.id).forEach((x) => { x.wards = (x.wards || []).filter((w) => !data.wards.includes(w)); });
  } else {
    u.accepts = data.accepts;
  }
  D.users.push(u);
  audit(admin.id, "staff.added", `${t("role." + u.role)}: ${u.name}`);
  return u;
}
