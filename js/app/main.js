/* Event wiring (one delegated listener per event type) and app start. */

const busy = { on: false };

// Runs an action once at a time and shows rule errors where the person is looking.
async function guarded(fn) {
  if (busy.on) return;
  busy.on = true;
  MEMO.clear();
  try {
    await fn();
  } catch (e) {
    if (e.user) {
      const el = dlg.open && dlg.querySelector("#submit-err");
      if (el) el.textContent = e.message;
      else toast(e.message, "error");
    } else {
      console.error(e);
      toast(t("err.generic"), "error");
    }
  } finally {
    busy.on = false;
  }
}

function setFont(idx) {
  S.fontIdx = Math.max(0, Math.min(3, idx));
  document.documentElement.style.setProperty("--font-size", [87.5, 100, 112.5, 125][S.fontIdx] + "%");
  saveState();
}

function downloadText(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function photoCheck(file) {
  const f = S.book;
  if (f.preview) URL.revokeObjectURL(f.preview);
  f.preview = URL.createObjectURL(file);
  f.aiState = "checking";
  f.ai = null;
  render();
  const result = await analysePhoto(file, S.lang);
  if (S.book !== f) return; // left the page meanwhile
  f.aiState = result.status;
  f.ai = result.ai || null;
  render();
}

async function runSync() {
  const result = await syncOutbox();
  if (result.synced) toast(t("off.synced", { n: result.synced }));
  if (result.failed) toast(t("off.failedN", { n: result.failed }), "warning");
}

function handleCommand(text) {
  const res = runCommand(parseCommand(text));
  S.vaLog = [...(S.vaLog || []), { you: text, bot: res.reply }].slice(-8);
  const log = document.getElementById("va-log");
  if (log) { log.innerHTML = S.vaLog.map(vaLine).join(""); log.scrollTop = log.scrollHeight; }
  speak([res.reply]);
  if (res.go) { closeDialog(); go(...res.go); }
  else render();
}

const actions = {
  go: (el) => go(el.dataset.view),
  skip: () => document.getElementById("main")?.focus(),
  scrollTo: (el) => document.getElementById(el.dataset.target)?.scrollIntoView({ behavior: "smooth" }),
  about: (el) => { go("about"); setTimeout(() => document.getElementById(el.dataset.section)?.scrollIntoView(), 30); },
  lang: (el) => { S.lang = el.dataset.lang; render(); },
  font: (el) => { const d = +el.dataset.dir; setFont(d === 0 ? 1 : S.fontIdx + d); },
  contrast: () => { S.contrast = !S.contrast; document.documentElement.classList.toggle("contrast", S.contrast); render(); },

  authTab: (el) => { const st = authState(); st.tab = el.dataset.tab; st.error = ""; render(); },
  pickRole: (el) => {
    closeDialog();
    const st = authState();
    Object.assign(st, { role: el.dataset.role, step: "phone", otp: null, error: "", errorAction: null, phone: lastPhone.get(el.dataset.role) || "" });
    render();
    document.getElementById("phone")?.focus();
  },
  staffHelp: () => dialogs.staffHelp(),
  switchAccount: () => {
    const was = S.user?.role;
    S.user = null; S.auth = null; S.loginRole = null; S.switchedFrom = was;
    saveNow();
    go("login");
    toast(t("switch.done"), "info");
  },
  whatsapp: (el) => shareWhatsApp(el.dataset.code),
  acceptOffer: (el) => guarded(async () => {
    const r = acceptRequest(S.user, +el.dataset.id);
    render();
    toast(t("dp.accepted", { w: r.ward }), "success", { label: t("toast.view"), act: "go", data: { view: "collector" } });
  }),
  declineOffer: (el) => guarded(async () => { declineRequest(S.user, +el.dataset.id); render(); toast(t("dp.declined"), "info"); }),
  toggleDuty: () => {
    S.user.onDuty = S.user.onDuty === false;
    audit(S.user.id, S.user.onDuty ? "duty.on" : "duty.off", S.user.name);
    render();
  },
  relocate: () => {
    const f = S.book, target = f?.here;
    if (!target) return;
    relocateVillage(target.lat, target.lng);
    Object.assign(f, { lat: target.lat, lng: target.lng, locMsg: "", farAway: false });
    render();
    toast(t("geo.moved"), "info");
  },
  relocateHome: () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      relocateVillage(pos.coords.latitude, pos.coords.longitude);
      render();
      toast(t("geo.moved"), "info");
    }, () => toast(t("book.locDenied"), "warning"), { enableHighAccuracy: true, timeout: 10000 });
  },
  moreNav: () => openDialog(t("nav.more"), `<div class="choices">${NAV[S.user ? S.user.role : "guest"].map(([v, k]) => `<button class="choice" data-act="navTo" data-view="${v}" style="width:100%">${icon(NAV_ICON[v] || "info", 20)}<b>${esc(t(k))}</b></button>`).join("")}</div>`),
  navTo: (el) => { closeDialog(); go(el.dataset.view); },
  loginAsCollector: (el) => {
    const c = user(+el.dataset.id);
    S.user = null; S.auth = null; S.loginRole = "collector";
    saveNow();
    go("login");
    authState().phone = c.phone;
    render();
    toast(t("dp.loginHint", { name: c.name }), "info");
  },
  loginAsRole: (el) => { S.loginRole = el.dataset.role; S.auth = null; go("login"); },
  useSample: () => { const st = authState(); st.phone = SAMPLE_NUMBERS[st.role]; st.error = ""; render(); document.getElementById("phone")?.focus(); },
  changeNumber: () => { const st = authState(); Object.assign(st, { step: "phone", otp: null, error: "" }); render(); },
  resendOtp: () => {
    const st = authState();
    if (!st.otp || Date.now() - st.otp.sentAt < RESEND_AFTER_MS) return;
    issueOtp(st.otp.phone, st.otp.purpose);
    render();
    document.getElementById("otp")?.focus();
    toast(t("auth.resent"));
  },
  logout: () => { S.user = null; saveNow(); go("home"); },

  confirmReset: () => dialogs.confirmReset(),
  doReset: () => guarded(async () => {
    closeDialog();
    clearState();
    await seed();
    applyGeoOffset();
    S.user = S.user ? user(S.user.id) : null;
    Object.assign(S, { integrity: null, book: null, demoResult: {}, selected: [] });
    if (S.view === "passport") go("home"); else onRoute();
    toast(t("resetDone"));
  }),

  passport: (el) => { closeDialog(); go("passport", el.dataset.code); },
  mode: (el) => { S.routeMode = el.dataset.mode; render(); },
  confirmPickup: (el) => dialogs.confirmPickup(+el.dataset.id),
  handoff: (el) => dialogs.handoff(el.dataset.code),
  receive: (el) => dialogs.receive(el.dataset.code || ""),
  outcome: (el) => dialogs.outcome(el.dataset.code),
  merge: () => dialogs.merge(),
  resolve: (el) => dialogs.resolve(+el.dataset.id),
  closeDlg: () => closeDialog(),
  print: () => window.print(),
  sticker: (el) => printSticker(el.dataset.code),
  verify: () => { S.integrity = null; render(); },
  flagFilter: (el) => { S.flagFilter = el.dataset.f; render(); },
  readAll: () => { D.notes.forEach((n) => { if (n.user === S.user.id) n.read = true; }); render(); },
  csv: () => { downloadText("tracecycle-batches.csv", csvExport(), "text/csv"); audit(S.user.id, "export.csv", "CSV"); render(); },

  useAi: () => { S.book.material = S.book.ai.material; S.book.errors = {}; render(); },
  speak: () => {
    const f = S.book;
    const lines = f?.ai?.instructions || (f?.material && GUIDED_QUESTIONS.every((q) => f.guided[q]) ? guidedCheck(f.material, f.guided).instructions : []);
    speak(lines);
  },
  toggleGuided: () => { S.book.guidedOpen = !S.book.guidedOpen; render(); },

  // offline-first collector mode
  toggleOffline: () => guarded(async () => {
    S.forceOffline = !S.forceOffline;
    if (!S.forceOffline) await runSync();
    render();
  }),
  syncNow: () => guarded(async () => { await runSync(); render(); }),

  // notifications
  noteFilter: (el) => { S.noteFilter = el.dataset.k; render(); },
  readOne: (el) => { const n = D.notes.find((x) => x.id === +el.dataset.id); if (n) n.read = true; render(); },

  // QR camera
  scanStart: (el) => {
    const target = el.dataset.target;
    const box = document.getElementById("scan-" + target);
    const msg = document.getElementById("scan-msg-" + target);
    box.hidden = false;
    msg.textContent = t("scan.looking");
    startScan(box.querySelector("video"), (code) => {
      const input = document.getElementById(target);
      if (input) input.value = code;
      box.hidden = true;
      msg.textContent = t("scan.found", { code });
      if (target === "track-code") go("passport", code);
      else document.getElementById("w")?.focus();
    }).catch((e) => { box.hidden = true; msg.textContent = t(e.message === "insecure" ? "scan.insecure" : "scan.error"); });
  },
  scanStop: () => { stopScan(); document.querySelectorAll(".scan-view").forEach((v) => { v.hidden = true; }); },

  // voice assistant
  assistant: () => dialogs.assistant(),
  openFeature: (el) => {
    const [view, param] = el.dataset.view.split("/");
    if (view === "home") { go("home"); setTimeout(() => document.getElementById("village-map")?.scrollIntoView({ behavior: "smooth" }), 60); return; }
    go(view, param || null);
  },
  vaListen: () => guarded(async () => {
    const log = document.getElementById("va-log");
    if (log) log.insertAdjacentHTML("beforeend", `<p class="xs muted" id="va-listening">${esc(t("va.listening"))}</p>`);
    let said = "";
    try { said = await listenOnce(S.lang); } catch { said = ""; }
    document.getElementById("va-listening")?.remove();
    if (said) handleCommand(said);
    else toast(t("voice.nothing"), "warning");
  }),
  vaExample: (el) => handleCommand(el.dataset.text),
  removeFactor: (el) => { setImpactFactor(el.dataset.m, null); audit(S.user.id, "impact.factor", el.dataset.m); render(); },
  voice: () => guarded(async () => {
    const f = S.book;
    f.voice = t("voice.listening"); f.voiceOk = true; render();
    try {
      const said = await listenOnce(S.lang);
      const material = materialFromSpeech(said);
      if (material) Object.assign(f, { material, voice: t("voice.heard", { said, m: t("m." + material) }), voiceOk: true, errors: {} });
      else Object.assign(f, { voice: said ? t("voice.notFound", { said }) : t("voice.nothing"), voiceOk: false });
    } catch {
      Object.assign(f, { voice: t("voice.error"), voiceOk: false });
    }
    render();
  }),
  locate: () => {
    const f = S.book;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (insideVillage(lat, lng)) Object.assign(f, { lat: +lat.toFixed(6), lng: +lng.toFixed(6), locMsg: "", farAway: false });
        else Object.assign(f, { here: { lat: +lat.toFixed(6), lng: +lng.toFixed(6) }, locMsg: t("geo.far"), farAway: true });
        render();
      },
      () => { f.locMsg = t("book.locDenied"); render(); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  },
  pin: (el, e) => {
    const svg = e.target.closest("svg"), rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * BOX.w, y = (e.clientY - rect.top) / rect.height * BOX.h;
    S.book.lng = +(BOX.lngMin + x / BOX.w * (BOX.lngMax - BOX.lngMin)).toFixed(6);
    S.book.lat = +(BOX.latMax - y / BOX.h * (BOX.latMax - BOX.latMin)).toFixed(6);
    S.book.locMsg = "";
    render();
  },
  clearKey: () => { aiSettings.save("", aiSettings.model()); render(); toast(t("se.keyRemoved")); },

  doMerge: () => guarded(async () => {
    const parent = await merge(S.user, [...S.selected]);
    S.selected = [];
    closeDialog(); render(); toast(t("ho.merged", { code: parent.code }), "success", { label: t("toast.view"), act: "passport", data: { code: parent.code } });
  }),

  demo: (el) => guarded(async () => {
    const k = el.dataset.k, raju = user(2), shyam = user(3), sunita = user(1);
    if (k === "mm") {
      const req = book(sunita, { material: "pet", size: "L", slot: "morning", lat: sunita.lat, lng: sunita.lng, landmark: "Demo" });
      const b = await confirmPickup(raju, req.id, 10, undefined, undefined, req.handshake);
      await send(raju, b.code, shyam.id);
      await receive(shyam, b.code, 7);
      S.demoResult.mm = b.code;
    } else if (k === "dup") {
      const b = D.bags.filter((x) => x.holder === shyam.id && x.status === "at_aggregator").pop();
      if (!b) throw fail(t("dm.noStock"));
      try { await receive(shyam, b.code, b.current); } catch (e) { if (!e.user) throw e; }
      S.demoResult.dup = b.code;
    } else {
      const done = new Set(D.outcomes.map((o) => o.bag));
      const b = D.bags.find((x) => x.req && done.has(topOf(x).code));
      const ev = D.events[b.code].find((x) => x.type === "picked_up");
      ev.payload = { ...ev.payload, weight_kg: r1(ev.payload.weight_kg + 2.5) }; // edited without re-hashing, on purpose
      S.demoResult.tm = b.code;
      S.integrity = null;
    }
    audit(S.user.id, "demo." + k, S.demoResult[k]);
    render();
    toast(t("dm.done", { code: S.demoResult[k] }), k === "tm" ? "warning" : "success");
  }),
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});

document.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches("label[for=photo]")) {
    e.preventDefault();
    document.getElementById("photo").click();
  }
});

document.addEventListener("change", (e) => {
  const el = e.target, kind = el.dataset.change;
  if (kind === "field" && S.book) {
    S.book[el.name] = el.value;
    if (el.name === "material") S.book.errors = {};
    if (el.type === "radio") render();
  }
  if (kind === "photo" && el.files?.[0]) photoCheck(el.files[0]);
  if (kind === "select") { S.selected = el.checked ? [...S.selected, el.value] : S.selected.filter((c) => c !== el.value); render(); }
  if (kind === "loginRole") { const st = authState(); Object.assign(st, { role: el.value, tab: "login", error: "", errorAction: null, phone: lastPhone.get(el.value) || st.phone }); render(); document.getElementById("phone")?.focus(); }
  if (kind === "radioCard") dlg.querySelectorAll(".choice").forEach((c) => c.classList.toggle("on", c.contains(el)));
  if (kind === "staffRole") { S.staffForm = { role: el.value }; render(); document.getElementById("add-staff")?.scrollIntoView(); }
  if (kind === "prefer" && S.book) {
    S.book.prefer = +el.value;
    const box = document.getElementById("nearby");
    if (box) box.innerHTML = nearbyList(S.book); // no full redraw, so the map keeps its place
  }
  if (kind === "guided" && S.book) { S.book.guided[el.dataset.q] = el.value; render(); }
});

document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset?.auto === "otp") {
    el.value = el.value.replace(/\D/g, "").slice(0, 4);
    if (el.value.length === 4) el.form?.requestSubmit();
  }
  if (el.hasAttribute?.("data-phone")) {
    const digits = el.value.replace(/\D/g, "");
    const hint = document.getElementById(el.getAttribute("aria-describedby"));
    const bad = (digits.length && !/^[6-9]/.test(digits.slice(-10))) || digits.length > 12;
    el.setAttribute("aria-invalid", bad ? "true" : "false");
    if (hint) hint.textContent = bad ? t("auth.phoneLive.bad") : digits.length >= 10 ? t("auth.phoneLive.ok") : t("auth.phoneLive.count", { n: digits.length });
  }
  if (e.target.id === "landmark" && S.book) S.book.landmark = e.target.value;
  if ((e.target.id === "rec" || e.target.id === "rej") && dlg.open) {
    const code = dlg.querySelector("#f-out")?.dataset.code;
    if (!code) return;
    const total = (+dlg.querySelector("#rec").value || 0) + (+dlg.querySelector("#rej").value || 0);
    dlg.querySelector("#sum").textContent = t("rec.sum", { t: kg(total), r: kg(bag(code).current) });
  }
});

document.addEventListener("submit", (e) => {
  const form = e.target, kind = form.dataset.form;
  if (!kind) return;
  e.preventDefault();

  if (kind === "otpSend") {
    const st = authState();
    st.phone = form.phone.value;
    const phone = normalisePhone(st.phone);
    st.errorAction = null;
    if (!st.role) { st.error = t("auth.pickFirst"); render(); return; }
    if (!validPhone(phone)) { st.error = t("auth.phoneInvalid"); render(); return; }
    const account = D.users.find((u) => u.phone === phone);
    st.errorAction = null;
    if (!account) {
      st.error = t(st.role === "household" ? "auth.noAccount" : "auth.noStaff", { r: t("role." + st.role) });
      st.errorAction = st.role === "household" ? "register" : st.role === "admin" ? null : "staffHelp";
      render(); return;
    }
    if (account.role !== st.role) { st.error = t("auth.wrongRole", { r: t("role." + account.role) }); st.errorAction = "pickRole"; st.errorRole = account.role; render(); return; }
    issueOtp(phone, "login");
    render();
    document.getElementById("otp")?.focus();
  }

  if (kind === "register") {
    const st = authState();
    st.phone = form.phone.value;
    st.reg = { name: form.name.value.trim(), ward: form.ward.value, landmark: "" };
    const phone = normalisePhone(st.phone);
    if (st.reg.name.length < 2) st.error = t("auth.nameReq");
    else if (!validPhone(phone)) st.error = t("auth.phoneInvalid");
    else if (D.users.some((u) => u.phone === phone)) st.error = t("auth.phoneTaken");
    else if (!st.reg.ward) st.error = t("auth.wardReq");
    else if (!form.consent.checked) st.error = t("auth.consentReq");
    else st.error = "";
    if (st.error) { render(); return; }
    issueOtp(phone, "register");
    render();
    document.getElementById("otp")?.focus();
  }

  if (kind === "otpVerify") {
    const st = authState(), otp = st.otp;
    const typed = form.otp.value.replace(/\D/g, "");
    if (!otp || Date.now() > otp.expires) { st.error = t("auth.expired"); render(); return; }
    if (otp.tries >= OTP_MAX_TRIES) { st.error = t("auth.tooMany"); render(); return; }
    if (typed !== otp.code) { otp.tries += 1; st.error = t("auth.wrong", { left: OTP_MAX_TRIES - otp.tries }); render(); return; }

    let account;
    if (otp.purpose === "register") {
      const [lat, lng] = WARD_CENTRES[+st.reg.ward];
      account = { id: Math.max(...D.users.map((u) => u.id)) + 1, role: "household", name: st.reg.name, phone: otp.phone, ward: +st.reg.ward,
        lat: +(lat + (Math.random() - 0.5) * 0.003).toFixed(6), lng: +(lng + (Math.random() - 0.5) * 0.003).toFixed(6), verified: true };
      D.users.push(account);
      audit(account.id, "auth.register", account.name);
      notify(account.id, t("n.welcome"));
    } else {
      account = D.users.find((u) => u.phone === otp.phone);
      audit(account.id, "auth.login", account.name);
    }
    lastPhone.set(account.role, account.phone);
    S.user = account;
    S.auth = null;
    S.book = null;
    const wanted = S.afterLogin && ACCESS[S.afterLogin.split("/")[0]]?.includes(account.role) ? S.afterLogin : null;
    S.afterLogin = null;
    location.hash = "#/" + (wanted || HOME_FOR[account.role]);
    toast(t("auth.welcome", { name: account.name }));
    if (account.role === "collector" && offerFor(account.id)) toast(t("dp.waitingForYou"), "warning");
  }

  if (kind === "search") {
    const raw = form.q.value.trim().toUpperCase().replace(/\s+/g, "");
    const code = raw.match(/TC-?(B|\d{4})-?(\d{4})/);
    const id = code ? `TC-${code[1]}-${code[2]}` : raw;
    if (!id) return;
    if (bag(id)) { form.q.value = ""; go("passport", id); }
    else toast(t("search.none", { q: id }), "warning");
  }

  if (kind === "track") {
    const raw = (form.code.value || "").toUpperCase().match(/TC-(?:B|\d{4})-\d{4}/)?.[0] || form.code.value.trim().toUpperCase();
    if (!raw) { form.querySelector("#track-hint").innerHTML = `<span class="error">${esc(t("home.trackEmpty"))}</span>`; return; }
    go("passport", raw);
  }

  if (kind === "book") guarded(async () => {
    const f = S.book;
    if (!f.material) {
      f.errors = { material: t("book.typeReq") };
      render();
      document.getElementById("details")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    book(S.user, { material: f.material, size: f.size, slot: f.slot, date: f.day, lat: f.lat, lng: f.lng, landmark: f.landmark.trim(), aiMaterial: f.ai?.material, check: bookingCheck(f), dispatch: true, ward: pinWard(f) });
    notify(S.user.id, t("n.booked", { when: `${t("book." + f.day)}, ${t("slot." + f.slot)}` }), new Date(), "pickup");
    if (f.preview) URL.revokeObjectURL(f.preview);
    S.book = null;
    go("household");
    toast(t("dp.sent"), "info");
  });

  if (kind === "pick") guarded(async () => {
    const w = parseFloat(form.querySelector("#w").value);
    if (!weightOk("w", w)) return;
    const householdCode = (form.querySelector("#hc")?.value || "").replace(/\D/g, "");
    if (householdCode && householdCode.length !== 4) { fieldError("hc", t("hs.four")); return; }
    if (isOffline()) {
      queueAction("pickup", { reqId: +form.dataset.id, weight: r1(w), householdCode });
      closeDialog(); render(); toast(t("off.queued"), "warning");
      return;
    }
    let b;
    try { b = await confirmPickup(S.user, +form.dataset.id, w, undefined, undefined, householdCode); }
    catch (err) { if (err.user && err.message === t("err.handshake")) { fieldError("hc", err.message); return; } throw err; }
    render();
    dialogs.qr(b);
  });

  if (kind === "hand") guarded(async () => {
    const to = +form.querySelector("input[name=to]:checked")?.value;
    if (!to) return;
    if (S.user.role === "collector" && isOffline()) {
      queueAction("handoff", { code: form.dataset.code, to });
      closeDialog(); render(); toast(t("off.queued"), "warning");
      return;
    }
    await send(S.user, form.dataset.code, to);
    closeDialog(); render(); toast(t("ho.sent", { code: form.dataset.code, name: user(to).name }));
  });

  if (kind === "rec") guarded(async () => {
    const code = form.querySelector("#code").value.trim().toUpperCase().match(/TC-(?:B|\d{4})-\d{4}/)?.[0] || form.querySelector("#code").value.trim().toUpperCase();
    const w = parseFloat(form.querySelector("#w").value);
    let ok = true;
    if (!code) { fieldError("code", t("v.code")); ok = false; } else fieldError("code", "");
    if (!weightOk("w", w)) ok = false;
    if (!ok) return;
    let flag;
    try { flag = await receive(S.user, code, w); } catch (err) { render(); throw err; }
    closeDialog(); render();
    const view = { label: t("toast.view"), act: "passport", data: { code } };
    if (flag) toast(t("ho.mismatch", { code, p: flag.diff }), "warning", view);
    else toast(t("ho.received", { code }), "success", view);
  });

  if (kind === "out") guarded(async () => {
    const rec = parseFloat(form.querySelector("#rec").value), rej = parseFloat(form.querySelector("#rej").value), reason = form.querySelector("#reason").value;
    let ok = true;
    if (!(rec >= 0)) { fieldError("rec", t("v.neg")); ok = false; } else fieldError("rec", "");
    if (!(rej >= 0)) { fieldError("rej", t("v.neg")); ok = false; } else fieldError("rej", "");
    if (ok && rec + rej <= 0) { fieldError("rec", t("v.weight")); ok = false; }
    if (rej > 0 && !reason) { fieldError("reason", t("rec.reasonReq")); ok = false; } else fieldError("reason", "");
    if (!ok) return;
    await outcome(S.user, form.dataset.code, rec, rej, reason);
    closeDialog(); render(); toast(t("rec.saved", { code: form.dataset.code }), "success", { label: t("toast.view"), act: "passport", data: { code: form.dataset.code } });
  });

  if (kind === "res") guarded(async () => {
    const note = form.querySelector("#note").value.trim();
    if (note.length < 3) { fieldError("note", t("fl.noteReq")); return; }
    await resolveFlag(S.user, +form.dataset.id, note);
    closeDialog(); render(); toast(t("fl.done"));
  });

  if (kind === "staff") guarded(async () => {
    const data = { role: form.role.value, name: form.name.value, phone: form.phone.value, ward: +form.ward.value,
      wards: [...form.querySelectorAll("input[name=wards]:checked")].map((x) => +x.value),
      accepts: [...form.querySelectorAll("input[name=mat]:checked")].map((x) => x.value) };
    try {
      const u = addStaff(S.user, data);
      render();
      toast(t("pe.added", { name: u.name, r: t("role." + u.role) }));
    } catch (e) {
      const err = document.getElementById("staff-err");
      if (err && e.user) err.textContent = e.message; else throw e;
    }
  });

  if (kind === "assistant") {
    const q = form.q.value.trim();
    if (q) { form.q.value = ""; handleCommand(q); }
  }

  if (kind === "factor") {
    const value = parseFloat(form.value.value), source = form.source.value.trim();
    const err = form.querySelector("#factor-err");
    if (!(value >= 0 && value <= 20)) { err.textContent = t("im.valueErr"); return; }
    if (source.length < 8) { err.textContent = t("im.sourceErr"); return; }
    setImpactFactor(form.material.value, value, source);
    audit(S.user.id, "impact.factor", form.material.value);
    render();
    toast(t("im.saved"));
  }

  if (kind === "ai") {
    const key = form.key.value.trim();
    aiSettings.save(key || aiSettings.key(), form.model.value);
    render();
    toast(t("se.keyDone"));
  }
});

window.addEventListener("hashchange", onRoute);

// Request card countdown, and offers nobody answered move to the next collector.
setInterval(() => {
  const timer = document.getElementById("offer-timer");
  if (timer) timer.textContent = `${Math.max(0, Math.ceil((+timer.dataset.until - Date.now()) / 1000))}s`;
}, 1000);
setInterval(() => {
  if (typeof D === "undefined" || !D?.requests || busy.on) return;
  if (processDispatch()) { MEMO.clear(); if (!dlg.open) render(); saveState(); }
}, 5000);

// Resend OTP countdown (only touches the button, no page redraw).
setInterval(() => {
  const btn = document.getElementById("resend");
  const otp = S.auth?.otp;
  if (!btn || !otp) return;
  btn.textContent = resendLabel(otp);
  btn.disabled = Date.now() - otp.sentAt < RESEND_AFTER_MS;
}, 1000);

// 9. Another tab changed the data (for example the collector in one tab, the aggregator in another): refresh this one.
window.addEventListener("storage", (e) => {
  if (e.key !== STORE_KEY || !e.newValue) return;
  try {
    D = JSON.parse(e.newValue);
    applyGeoOffset();
    MEMO.clear();
    if (S.user) S.user = user(S.user.id) || null;
    if (!dlg.open) render();
  } catch { /* ignore a half-written value */ }
});
window.addEventListener("pagehide", saveNow);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveNow(); });
// Coming back online replays whatever the collector saved offline.
window.addEventListener("online", () => { if ((D?.outbox || []).some((x) => x.status === "waiting")) guarded(async () => { await runSync(); render(); }); });
window.addEventListener("offline", () => { if (S.user?.role === "collector") render(); });
dlg.addEventListener?.("close", stopScan);

async function start() {
  if (!loadState()) await seed();
  applyGeoOffset();
  setFont(S.fontIdx);
  document.documentElement.classList.toggle("contrast", S.contrast);
  if (!location.hash) location.replace(S.user ? `#/${HOME_FOR[S.user.role]}` : "#/home");
  onRoute();
}

start().catch((e) => {
  console.error(e);
  document.getElementById("app").innerHTML = `<div class="page" style="padding:40px 16px"><p class="notice bad">${esc(t("err.start"))}</p>
    <p style="margin-top:12px"><button class="btn" data-act="doReset">${esc(t("resetPreview"))}</button></p></div>`;
});
