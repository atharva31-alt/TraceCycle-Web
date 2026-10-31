/* Business rules: status machine, booking, pickup, hand-offs, bundles and outcomes.
   Every move checks who may make it, appends a hash-linked event and writes the audit log.
   Rule-based anomaly checks live here too, because they react to these moves. */

const SIZE_KG = { S: 2, M: 5, L: 10 };
const STREAM = { organic: "wet", pet: "dry", other_plastic: "dry", paper: "dry", metal: "dry", glass: "dry" };
const MATERIALS = ["pet", "other_plastic", "paper", "metal", "glass", "organic"];
const TOLERANCE_PCT = 5;
const TRANSITIONS = {
  "picked_up>in_transit": ["collector"],
  "in_transit>at_aggregator": ["aggregator"],
  "in_transit>at_recycler": ["recycler"],
  "at_aggregator>merged": ["aggregator"],
  "at_aggregator>in_transit": ["aggregator"],
  "at_recycler>processed": ["recycler"],
};
const fail = (msg) => { const e = new Error(msg); e.user = true; return e; };

function checkMove(from, to, role) {
  const allowed = TRANSITIONS[`${from}>${to}`];
  if (!allowed) throw fail(t("err.transition", { from: t("st." + from), to: t("st." + to) }));
  if (!allowed.includes(role)) throw fail(t("err.role"));
}

const user = (id) => D.users.find((u) => u.id === id);
const bag = (code) => D.bags.find((b) => b.code === code);
const hhLabel = (id) => `HH-${String(id).padStart(4, "0")}`;

function shown(u) {
  if (!u) return t("system");
  if (u.role === "household") return `${t("household")} ${hhLabel(u.id)}`;
  if (u.role === "collector") { const p = u.name.split(" "); return `${p[0]} ${p[p.length - 1][0]}.`; }
  return u.name;
}

let SEEDING = false;

// kind: pickup | handoff | flag | processed | system (used for filters and icons)
function notify(userId, msg, at = new Date(), kind = "system", extra = {}) {
  D.notes.unshift({ id: ++D.seq.note, user: userId, msg, kind, at: +at, read: false, ...extra });
  if (!SEEDING && S.user && S.user.id === userId && kind === "request") navigator.vibrate?.([200, 100, 200]);
  if (D.notes.length > 600) D.notes.length = 600;
  if (!SEEDING && S.user && S.user.id === userId) liveToast(msg, kind);
}
function notifyAdmins(msg, at) {
  D.users.filter((u) => u.role === "admin").forEach((a) => notify(a.id, msg, at, "flag"));
}
function audit(actorId, action, entity, at = new Date()) {
  D.audit.unshift({ id: ++D.seq.audit, actor: actorId, action, entity, at: +at });
  if (D.audit.length > 400) D.audit.length = 400;
}
function raiseFlag(flag, at) {
  const full = { id: ++D.seq.flag, status: "open", at: +at, ...flag };
  D.flags.unshift(full);
  notifyAdmins(t("n.newFlag", { kind: t("flag." + full.kind) }), at);
  return full;
}

function nextBagCode() { return `TC-2026-${String(++D.seq.bag).padStart(4, "0")}`; }
function nextBundleCode() { return `TC-B-${String(++D.seq.bundle).padStart(4, "0")}`; }
function leaves(b) { const kids = D.bags.filter((x) => x.parent === b.code); return kids.length ? kids.flatMap(leaves) : [b]; }
function topOf(b) { let x = b; while (x.parent) x = bag(x.parent); return x; }

/* ---------------------------------------------------------------- booking and pickup */

function book(household, data, at = new Date()) {
  const ward = data.ward || household.ward;
  const collector = D.users.find((u) => u.role === "collector" && (u.wards || []).includes(ward));
  if (!collector && !data.dispatch) throw fail(t("err.noCollector"));
  if (!MATERIALS.includes(data.material)) throw fail(t("book.typeReq"));
  const req = {
    id: ++D.seq.req, household: household.id, collector: collector ? collector.id : null, ward,
    material: data.material, size: data.size, est: SIZE_KG[data.size], lat: data.lat, lng: data.lng,
    landmark: data.landmark || "", slot: data.slot, date: data.date || "today",
    // Wet waste spoils and big bags fill the cart, so both go first on the route.
    priority: data.material === "organic" || data.size === "L" ? "high" : "normal",
    status: "scheduled", bookedAt: +at, aiMaterial: data.aiMaterial || null, bag: null,
    handshake: String(1000 + Math.floor(Math.random() * 9000)), // the household tells this to the collector at the door
    check: data.check || null, // { source: "ai" | "guided", contamination, score, grade }
  };
  D.requests.push(req);
  audit(household.id, "pickup.booked", `#${req.id}`, at);
  if (data.dispatch) startDispatch(req, at, data.prefer || null); // live bookings go to the chosen or nearest collector first
  return req;
}

async function confirmPickup(collector, reqId, weight, at = new Date(), code, householdCode) {
  const req = D.requests.find((r) => r.id === reqId);
  if (!req || req.status !== "scheduled" || req.collector !== collector.id) throw fail(t("err.role"));
  if (!(weight > 0) || weight > 500) throw fail(t("v.weight"));
  const typed = String(householdCode ?? "").trim();
  if (typed && typed !== req.handshake) throw fail(t("err.handshake"));
  const b = {
    code: code || nextBagCode(), material: req.material, req: req.id, ward: req.ward, household: req.household,
    status: "picked_up", holder: collector.id, measured: r1(weight), current: r1(weight), parent: null, createdAt: +at,
  };
  D.bags.push(b);
  req.status = "picked_up";
  req.bag = b.code;
  await addEvent(b, "reported", req.household, { estimate_kg: req.est, material: req.material, ward: req.ward }, req.bookedAt);
  await addEvent(b, "picked_up", collector.id, { weight_kg: b.measured, household_code: typed ? "matched" : "not_given" }, at);
  if (!typed) {
    raiseFlag({ kind: "no_handshake", risk: "low", bag: b.code, subject: collector.id, detail: t("fd.noHandshake", { name: collector.name }) }, at);
  }
  notify(req.household, t("n.picked", { code: b.code, v: kg(b.measured) }), at, "pickup", { code: b.code });
  audit(collector.id, "pickup.confirmed", b.code, at);
  return b;
}

/* ---------------------------------------------------------------- hand-offs */

function receiversFor(sender, b) {
  const roles = sender.role === "collector" ? ["aggregator", "recycler"] : sender.role === "aggregator" ? ["recycler"] : [];
  const load = (u) =>
    D.bags.filter((x) => x.holder === u.id && ["at_aggregator", "at_recycler"].includes(x.status)).reduce((s, x) => s + x.current, 0) +
    D.transfers.filter((x) => x.to === u.id && x.status === "pending").reduce((s, x) => s + x.sent, 0);
  return D.users
    .filter((u) => roles.includes(u.role) && u.verified && (u.accepts || []).includes(b.material))
    .map((u) => {
      const left = Math.max(0, Math.round(u.capacity - load(u)));
      return { u, km: Math.round(haversine(sender, u) * 10) / 10, left, room: left >= b.current };
    })
    .sort((a, z) => (a.room === z.room ? a.km - z.km : a.room ? -1 : 1));
}

async function send(sender, code, toId, at = new Date()) {
  const b = bag(code);
  if (!b) throw fail(t("err.notFound", { code }));
  if (b.holder !== sender.id) throw fail(t("err.notHolder"));
  checkMove(b.status, "in_transit", sender.role);
  const to = user(toId);
  if (!receiversFor(sender, b).some((m) => m.u.id === toId)) throw fail(t("err.receiver", { name: to?.name || "?" }));
  D.transfers.push({ id: ++D.seq.tr, bag: code, from: sender.id, to: toId, sent: b.current, received: null, status: "pending", at: +at });
  b.status = "in_transit";
  await addEvent(b, "handed_off", sender.id, { to: to.name, weight_sent_kg: b.current }, at);
  notify(toId, t("n.incoming", { code, v: kg(b.current), name: sender.name }), at, "handoff", { code });
  audit(sender.id, "handoff.sent", code, at);
}

const isMismatch = (tr) => tr.received != null && Math.abs(tr.sent - tr.received) / tr.sent * 100 > TOLERANCE_PCT;

function checkRepeatedMismatch(senderId, at) {
  const recent = D.transfers.filter((x) => x.from === senderId && x.status === "confirmed").sort((a, b) => b.confirmedAt - a.confirmedAt).slice(0, 10);
  const bad = recent.filter(isMismatch);
  const alreadyOpen = D.flags.some((f) => f.kind === "repeated_mismatch" && f.subject === senderId && f.status === "open");
  if (bad.length >= 3 && !alreadyOpen) {
    raiseFlag({ kind: "repeated_mismatch", risk: "medium", bag: null, subject: senderId,
      detail: t("fd.repeated", { n: bad.length, of: recent.length, name: user(senderId).name }) }, at);
  }
}

async function receive(receiver, code, weight, at = new Date()) {
  const b = bag(code);
  if (!b) throw fail(t("err.notFound", { code }));
  const tr = D.transfers.find((x) => x.bag === code && x.status === "pending");
  if (!tr || tr.to !== receiver.id) {
    if (b.holder === receiver.id) {
      raiseFlag({ kind: "duplicate_scan", risk: "medium", bag: code, subject: receiver.id, detail: t("fd.duplicate", { code, name: receiver.name }) }, at);
      audit(receiver.id, "flag.duplicate_scan", code, at);
      throw fail(t("err.already", { code }));
    }
    throw fail(t("err.notExpected", { code }));
  }
  if (!(weight > 0) || weight > 500) throw fail(t("v.weight"));
  const target = receiver.role === "aggregator" ? "at_aggregator" : "at_recycler";
  checkMove(b.status, target, receiver.role);

  const w = r1(weight);
  const diff = Math.round(Math.abs(tr.sent - w) / tr.sent * 1000) / 10;
  const within = diff <= TOLERANCE_PCT;
  Object.assign(tr, { received: w, status: "confirmed", confirmedAt: +at });
  Object.assign(b, { status: target, holder: receiver.id, current: w });
  await addEvent(b, "received", receiver.id, { from: user(tr.from).name, weight_sent_kg: tr.sent, weight_received_kg: w, difference_pct: diff, within_tolerance: within }, at);
  notify(tr.from, t("n.receivedBy", { name: receiver.name, code, v: kg(w) }), at, "handoff");
  leaves(b).forEach((l) => l.household && notify(l.household, t("n.reached", { code: l.code, name: receiver.name }), at, "handoff", { code: l.code }));
  audit(receiver.id, "handoff.received", code, at);

  let flag = null;
  if (!within) {
    flag = raiseFlag({ kind: "weight_mismatch", risk: diff > 15 ? "high" : "medium", bag: code, subject: tr.from, diff,
      detail: t("fd.mismatch", { s: kg(tr.sent), r: kg(w), p: diff }) }, at);
    notify(tr.from, t("n.flag", { code, s: kg(tr.sent), r: kg(w) }), at, "flag");
    checkRepeatedMismatch(tr.from, at);
  }
  return flag;
}

/* ---------------------------------------------------------------- bundles and outcomes */

async function merge(agg, codes, at = new Date(), code) {
  const bags = codes.map(bag).filter(Boolean);
  if (bags.length < 2) throw fail(t("ho.needTwo"));
  bags.forEach((b) => { if (b.holder !== agg.id) throw fail(t("err.notHolder")); checkMove(b.status, "merged", agg.role); });
  if (new Set(bags.map((b) => b.material)).size > 1) throw fail(t("err.mixed"));
  const total = r1(bags.reduce((s, b) => s + b.current, 0));
  const parent = { code: code || nextBundleCode(), material: bags[0].material, req: null, status: "at_aggregator", holder: agg.id, measured: total, current: total, parent: null, createdAt: +at };
  D.bags.push(parent);
  const children = [];
  for (const b of bags) {
    const ev = await addEvent(b, "merged", agg.id, { into: parent.code, weight_kg: b.current }, at);
    b.status = "merged";
    b.parent = parent.code;
    children.push({ code: b.code, weight_kg: b.current, head_hash: ev.hash });
  }
  await addEvent(parent, "bundle_created", agg.id, { children, weight_kg: total }, at);
  audit(agg.id, "bundle.created", parent.code, at);
  return parent;
}

function checkRejectionSpike(recycler, rate, code, at) {
  const past = D.outcomes.filter((o) => o.recycler === recycler.id && o.bag !== code);
  if (past.length < 2) return;
  const usual = past.reduce((s, o) => s + o.rejected, 0) / past.reduce((s, o) => s + o.recovered + o.rejected, 0);
  if (rate > 0.1 && rate > usual * 2) {
    raiseFlag({ kind: "rejection_spike", risk: "medium", bag: code, subject: recycler.id,
      detail: t("fd.spike", { p: Math.round(rate * 100), u: Math.round(usual * 100), name: recycler.name }) }, at);
  }
}

async function outcome(recycler, code, recovered, rejected, reason, at = new Date()) {
  const b = bag(code);
  if (!b) throw fail(t("err.notFound", { code }));
  if (b.holder !== recycler.id) throw fail(t("err.notHolder"));
  checkMove(b.status, "processed", recycler.role);
  if (!(recovered >= 0) || !(rejected >= 0) || recovered + rejected <= 0) throw fail(t("v.neg"));
  if (rejected > 0 && !reason) throw fail(t("rec.reasonReq"));
  const total = r1(recovered + rejected);
  if (Math.abs(total - b.current) / b.current * 100 > TOLERANCE_PCT) throw fail(t("err.outcome", { t: kg(total), r: kg(b.current) }));

  D.outcomes.push({ bag: code, recycler: recycler.id, recovered: r1(recovered), rejected: r1(rejected), reason: rejected > 0 ? reason : null, at: +at });
  b.status = "processed";
  await addEvent(b, "processed", recycler.id, { recovered_kg: r1(recovered), rejected_kg: r1(rejected), reason: rejected > 0 ? reason : null }, at);
  const pct = Math.round(recovered / total * 100);
  leaves(b).forEach((l) => l.household && notify(l.household, t("n.processed", { code: l.code, p: pct }), at, "processed", { code: l.code }));
  audit(recycler.id, "outcome.recorded", code, at);
  checkRejectionSpike(recycler, rejected / total, code, at);
}

async function resolveFlag(admin, id, note, at = new Date()) {
  const f = D.flags.find((x) => x.id === id);
  if (!f || f.status !== "open") return;
  Object.assign(f, { status: "resolved", note, resolvedAt: +at, resolvedBy: admin.id });
  audit(admin.id, "flag.resolved", `#${id}`, at);
}
