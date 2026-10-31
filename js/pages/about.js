/* About, privacy, accessibility, terms and help. */

function viewAbout() {
  const sections = ["privacy", "accessibility", "terms", "help"];
  return `<div class="page" style="padding-top:32px">${header(t("about.title"), t("about.sub"))}
    <div class="about stack">${sections.map((k) => `
      <section id="${k}" class="card pad">
        <h2 style="margin-bottom:8px">${esc(t("about." + k))}</h2>
        ${t("about." + k + "Body").split("\n").map((line) => `<p class="soft" style="margin-top:6px">${esc(line)}</p>`).join("")}
      </section>`).join("")}
    </div></div>`;
}
