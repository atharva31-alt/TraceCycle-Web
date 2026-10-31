/* Login: first choose who you are, then log in with your mobile number and a one-time password.
   Each role opens its own pages. Households can register themselves; collectors, aggregators and
   recyclers are added by the panchayat admin (Admin → People → Add staff).
   There is no SMS service in this prototype, so the OTP is shown in a "simulated SMS" box. */

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_TRIES = 5;
const LOGIN_ROLES = [
  ["household", "home"], ["collector", "truck"], ["aggregator", "box"], ["recycler", "factory"], ["admin", "shield"],
];
// Sample numbers from the synthetic data, shown only when someone opens "Testing this prototype?"
const SAMPLE_NUMBERS = { household: "9000000001", collector: "9000000002", aggregator: "9000000003", recycler: "9000000004", admin: "9000000005" };

const authState = () => S.auth || (S.auth = { role: S.loginRole || null, tab: "login", step: "phone", phone: "", otp: null, error: "", reg: { name: "", ward: "" } });
const normalisePhone = (v) => String(v || "").replace(/\D/g, "").slice(-10);
const validPhone = (p) => /^[6-9]\d{9}$/.test(p);
const maskPhone = (p) => `******${p.slice(-4)}`;
const RESEND_AFTER_MS = 30 * 1000;

// The last number used for each role on this device, so it does not have to be typed again.
const lastPhone = {
  get(role) { try { return localStorage.getItem("tracecycle.lastPhone." + role) || ""; } catch { return ""; } },
  set(role, phone) { try { localStorage.setItem("tracecycle.lastPhone." + role, phone); } catch { /* not saved */ } },
};

function resendLabel(otp) {
  const wait = Math.ceil((otp.sentAt + RESEND_AFTER_MS - Date.now()) / 1000);
  return wait > 0 ? t("auth.resendIn", { s: wait }) : t("auth.resend");
}

function errorBlock(a) {
  if (!a.error) return "";
  const actions = {
    register: `<button type="button" class="btn secondary sm" data-act="authTab" data-tab="register">${esc(t("auth.goRegister"))}</button>`,
    staffHelp: `<button type="button" class="btn secondary sm" data-act="staffHelp">${esc(t("auth.howAdd"))}</button>`,
    pickRole: a.errorRole ? `<button type="button" class="btn secondary sm" data-act="pickRole" data-role="${a.errorRole}">${esc(t("auth.switchTo", { r: t("role." + a.errorRole) }))}</button>` : "",
  };
  return `<div class="error-box" role="alert"><p class="error" style="margin:0">${esc(a.error)}</p>${actions[a.errorAction] || ""}</div>`;
}

function issueOtp(phone, purpose) {
  const code = String(Math.floor(1000 + Math.random() * 9000));
  authState().otp = { code, phone, purpose, expires: Date.now() + OTP_TTL_MS, tries: 0, sentAt: Date.now() };
  authState().step = "otp";
  authState().error = "";
}

function rolePicker(a) {
  return `<fieldset><legend class="label" style="font-size:1rem">${esc(t("auth.who"))}</legend>
    <div class="role-pick">${LOGIN_ROLES.map(([r, ic]) => `
      <label class="choice ${a.role === r ? "on" : ""}">
        <input type="radio" name="login-role" value="${r}" ${a.role === r ? "checked" : ""} data-change="loginRole">
        <span class="role-icon">${icon(ic, 20)}</span>
        <span><b>${esc(t("role." + r))}</b><small>${esc(t("auth.roleDo." + r))}</small></span>
      </label>`).join("")}</div></fieldset>`;
}

function loginForms(a) {
  const error = errorBlock(a);
  if (!a.role) return `<p class="notice warn small" style="margin-top:16px">${icon("info")}<span>${esc(t("auth.pickFirst"))}</span></p>`;

  if (a.step === "otp" && a.otp) {
    return `
      <p class="small soft" style="margin-top:16px">${esc(t("auth.sentTo", { phone: maskPhone(a.otp.phone) }))}</p>
      <div class="sms" role="status" aria-live="polite"><span class="xs">${esc(t("auth.smsTitle"))}</span><span>${esc(t("auth.smsBody", { code: a.otp.code }))}</span></div>
      <form class="stack" data-form="otpVerify" novalidate>
        <div><label class="label" for="otp">${esc(t("auth.otp"))}</label>
          <input id="otp" name="otp" class="input num" inputmode="numeric" autocomplete="one-time-code" maxlength="4" pattern="[0-9]*" data-auto="otp" style="max-width:12rem;letter-spacing:4px;font-size:1.2rem" aria-describedby="otp-hint">
          <p class="hint" id="otp-hint">${esc(t("auth.otpAuto"))}</p>${error}</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          <button class="btn" type="submit">${esc(t(a.otp.purpose === "register" ? "auth.verifyRegister" : "auth.verifyAs", { r: t("role." + a.role) }))}</button>
          <button class="btn ghost" type="button" id="resend" data-act="resendOtp" ${Date.now() - a.otp.sentAt < RESEND_AFTER_MS ? "disabled" : ""}>${esc(resendLabel(a.otp))}</button>
          <button class="btn ghost" type="button" data-act="changeNumber">${esc(t("auth.change"))}</button>
        </div>
      </form>`;
  }

  const tabs = a.role === "household" ? `<div class="seg" role="tablist" style="margin:16px 0 4px">${["login", "register"].map((tab) =>
    `<button role="tab" data-act="authTab" data-tab="${tab}" aria-selected="${a.tab === tab}" aria-pressed="${a.tab === tab}">${esc(t("auth.tab." + tab))}</button>`).join("")}</div>` : "";

  if (a.role === "household" && a.tab === "register") {
    return `${tabs}
      <form class="stack" data-form="register" novalidate style="margin-top:12px">
        <div><label class="label" for="reg-name">${esc(t("auth.name"))}</label><input id="reg-name" name="name" class="input" autocomplete="name" maxlength="80" value="${esc(a.reg.name)}"></div>
        <div><label class="label" for="reg-phone">${esc(t("auth.phone"))}</label><input id="reg-phone" name="phone" class="input num" type="tel" inputmode="numeric" autocomplete="tel" maxlength="14" value="${esc(a.phone)}" data-phone aria-describedby="reg-phone-hint"><p class="hint" id="reg-phone-hint">${esc(t("auth.phoneHint"))}</p></div>
        <div><label class="label" for="reg-ward">${esc(t("auth.ward"))}</label>
          <select id="reg-ward" name="ward" class="input"><option value="">${esc(t("auth.chooseWard"))}</option>${[1, 2, 3, 4, 5, 6].map((w) => `<option value="${w}" ${String(a.reg.ward) === String(w) ? "selected" : ""}>${esc(t("ward", { w }))}</option>`).join("")}</select></div>
        <label style="display:flex;gap:10px;align-items:flex-start" class="small"><input type="checkbox" name="consent" style="margin-top:4px;width:16px;height:16px;accent-color:#1A3A6B"><span>${esc(t("auth.consent"))}</span></label>
        ${error}
        <div><button class="btn" type="submit">${esc(t("auth.sendOtp"))}</button></div>
      </form>`;
  }

  return `${tabs}
    <form class="stack" data-form="otpSend" novalidate style="margin-top:12px">
      <div><label class="label" for="phone">${esc(t("auth.phoneAs", { r: t("role." + a.role) }))}</label>
        <input id="phone" name="phone" class="input num" type="tel" inputmode="numeric" autocomplete="tel" maxlength="14" value="${esc(a.phone)}" style="max-width:20rem" data-phone aria-describedby="phone-hint">
        <p class="hint" id="phone-hint">${esc(t("auth.phoneHint"))}</p>${error}</div>
      <div><button class="btn" type="submit">${esc(t("auth.sendOtp"))}</button></div>
    </form>
    ${a.role !== "household" ? `<p class="small soft" style="margin-top:12px">${esc(t("auth.staffNote." + (a.role === "admin" ? "admin" : "staff")))}</p>` : ""}
    <details class="sample"><summary>${esc(t("auth.testing"))}</summary>
      <p class="small">${esc(t("auth.sampleFor", { r: t("role." + a.role) }))} <button type="button" class="link-btn num" data-act="useSample">${SAMPLE_NUMBERS[a.role]}</button></p>
      <p class="xs muted">${esc(t("auth.sampleNote"))}</p></details>`;
}

function viewLogin() {
  const a = authState();
  const role = a.role || "household";
  return `<div class="page" style="padding-top:32px">${header(t("auth.title"), t("auth.sub"))}
    <div class="login-grid">
      <section class="card pad">${a.step === "otp" ? `<p class="small"><b>${esc(t("auth.as"))}</b> ${esc(t("role." + a.role))}</p>` : rolePicker(a)}${loginForms(a)}</section>
      <aside class="stack">
        <div class="card pad">
          <h2 style="margin-bottom:6px">${esc(t("auth.whatTitle"))}</h2>
          <p class="small soft">${esc(t("auth.whatBody"))}</p>
          <ol class="small soft how-list">${[1, 2, 3, 4].map((n) => `<li><b>${esc(t("home.s" + n))}:</b> ${esc(t("home.s" + n + "b"))}</li>`).join("")}</ol>
        </div>
        <div class="card pad">
          <h2 style="margin-bottom:6px">${esc(t("auth.afterTitle", { r: t("role." + role) }))}</h2>
          <ul class="small soft how-list">${t("auth.after." + role).split("\n").map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
        </div>
      </aside>
    </div></div>`;
}
