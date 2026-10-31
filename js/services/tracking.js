/* Where the collectors are and when they will reach a household.
   Position = the last pickup confirmed today (or the start point). ETA follows the optimised route.
   Speed and minutes per stop are planning assumptions, shown as estimates. */

const SPEED_KMH = 15;     // e-rickshaw or small truck on village lanes
const MIN_PER_STOP = 5;   // weighing, QR sticker, a word with the household

const isToday = (ts) => new Date(ts).toDateString() === new Date().toDateString();

function collectorPosition(c) {
  // Latest thing the collector did today: a pickup (at that house) or a drop-off (at the receiver).
  const pickups = D.requests
    .filter((r) => r.collector === c.id && r.bag && bag(r.bag) && isToday(bag(r.bag).createdAt))
    .map((r) => ({ lat: r.lat, lng: r.lng, at: bag(r.bag).createdAt }));
  const dropoffs = D.transfers
    .filter((x) => x.from === c.id && isToday(x.at))
    .map((x) => { const u = user(x.to); return { lat: u.lat, lng: u.lng, at: x.at }; });
  const last = [...pickups, ...dropoffs].sort((a, z) => z.at - a.at)[0];
  return last ? { lat: last.lat, lng: last.lng, since: last.at } : { lat: c.lat, lng: c.lng, since: null };
}

function collectorQueue(c) {
  return memo(`queue-${c.id}`, () => {
    const pos = collectorPosition(c);
    const due = D.requests.filter((r) => r.collector === c.id && r.status === "scheduled" && r.date !== "tomorrow");
    const depot = user(3);
    const plan = planRoutes(pos, due.map((r) => ({ ...r })), { lat: depot.lat, lng: depot.lng }, c.capacity).optimised.plan;
    const etas = {};
    let km = 0, prev = pos, n = 0;
    plan.forEach((s) => {
      km += haversine(prev, s);
      prev = s;
      if (s.kind === "dropoff") return;
      n += 1;
      etas[s.id] = { stop: n, km: r2(km), min: Math.round((km / SPEED_KMH) * 60 + (n - 1) * MIN_PER_STOP) };
    });
    return { pos, etas, left: due.length };
  });
}

function nearestCollectors(point, ward) {
  return D.users.filter((u) => u.role === "collector").map((c) => {
    const q = collectorQueue(c);
    return { c, pos: q.pos, km: r2(haversine(point, q.pos)), left: q.left, serves: (c.wards || []).includes(ward), onDuty: c.onDuty !== false };
  }).sort((a, z) => (a.onDuty === z.onDuty ? a.km - z.km : a.onDuty ? -1 : 1));
}

// On-duty collectors who serve this ward, nearest first.
function wardCollectors(point, ward) {
  return nearestCollectors(point, ward).filter((n) => n.serves && n.onDuty);
}

const etaText = (min) => (min < 60 ? t("eta.min", { m: Math.max(5, Math.round(min / 5) * 5) }) : t("eta.hr", { h: Math.round((min / 60) * 10) / 10 }));
