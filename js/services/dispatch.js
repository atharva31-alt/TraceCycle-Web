/* Uber-style dispatch. A new booking is offered to the nearest on-duty collector who has room in the cart.
   They accept or decline; after 90 seconds without an answer it moves to the next nearest.
   If nobody takes it, the collector who serves that ward gets it and the admin is told. */

const OFFER_TTL_MS = 3 * 60 * 1000;

function cartLoad(c) {
  return D.requests.filter((r) => r.collector === c.id && r.status === "scheduled").reduce((s, r) => s + r.est, 0);
}

function dispatchCandidates(req) {
  const declined = new Set((req.dispatch?.declined || []).map((d) => d.id));
  return D.users
    .filter((u) => u.role === "collector" && u.onDuty !== false && !declined.has(u.id))
    .map((c) => ({ c, km: r2(haversine(collectorPosition(c), req)), room: cartLoad(c) + req.est <= c.capacity }))
    .filter((x) => x.room)
    .sort((a, z) => {
      const aw = (a.c.wards || []).includes(req.ward), zw = (z.c.wards || []).includes(req.ward);
      return aw === zw ? a.km - z.km : aw ? -1 : 1; // same ward first, then distance
    });
}

// prefer: a collector the household picked from the list; they are asked first.
function startDispatch(req, at = Date.now(), prefer = null) {
  Object.assign(req, { status: "requested", collector: null, dispatch: { declined: [], offeredTo: null, offeredAt: null, km: null, prefer } });
  offerNext(req, +at);
}

function offerNext(req, at = Date.now()) {
  const list = dispatchCandidates(req);
  const next = list.find((x) => x.c.id === req.dispatch.prefer) || list[0];
  if (!next) {
    const fallback = D.users.find((u) => u.role === "collector" && (u.wards || []).includes(req.ward)) || D.users.find((u) => u.role === "collector");
    acceptRequest(fallback, req.id, at, true);
    notifyAdmins(t("n.noTaker", { id: req.id, name: fallback.name }), at);
    return;
  }
  Object.assign(req.dispatch, { offeredTo: next.c.id, offeredAt: +at, km: next.km });
  notify(next.c.id, t("n.request", { m: t("m." + req.material), s: t("size." + req.size), km: next.km, w: req.ward }), at, "request", { req: req.id });
}

function acceptRequest(collector, reqId, at = Date.now(), auto = false) {
  const req = D.requests.find((r) => r.id === reqId);
  if (!req || req.status !== "requested") throw fail(t("err.taken"));
  if (!auto && req.dispatch.offeredTo !== collector.id) throw fail(t("err.notOffered"));
  Object.assign(req, { collector: collector.id, status: "scheduled" });
  Object.assign(req.dispatch, { offeredTo: null, acceptedAt: +at, auto });
  MEMO.clear();
  const eta = collectorQueue(collector).etas[req.id];
  notify(req.household, t("n.accepted", { name: shown(collector), eta: eta ? etaText(eta.min) : "–" }), at, "pickup", { req: req.id });
  audit(collector.id, auto ? "dispatch.auto" : "dispatch.accepted", `#${req.id}`, at);
  return req;
}

function declineRequest(collector, reqId, reason = "declined", at = Date.now()) {
  const req = D.requests.find((r) => r.id === reqId);
  if (!req || req.status !== "requested" || req.dispatch.offeredTo !== collector.id) return;
  req.dispatch.declined.push({ id: collector.id, reason, at: +at });
  audit(collector.id, reason === "timeout" ? "dispatch.timeout" : "dispatch.declined", `#${req.id}`, at);
  offerNext(req, at);
}

// Offers nobody answered in time move on. Runs every few seconds in whichever tab is open.
function processDispatch(now = Date.now()) {
  const expired = D.requests.filter((r) => r.status === "requested" && r.dispatch?.offeredTo && now - r.dispatch.offeredAt > OFFER_TTL_MS);
  expired.forEach((r) => declineRequest(user(r.dispatch.offeredTo), r.id, "timeout", now));
  return expired.length > 0;
}

const offerFor = (userId) => D.requests.find((r) => r.status === "requested" && r.dispatch?.offeredTo === userId);
