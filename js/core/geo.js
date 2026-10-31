/* Haversine distance and the pickup route planner (priority first, nearest neighbour, 2-opt, drop-offs). */

function haversine(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const pathKm = (pts) => pts.slice(1).reduce((s, p, i) => s + haversine(pts[i], p), 0);
function nearest(start, stops) {
  const left = [...stops], out = [];
  let here = start;
  while (left.length) {
    left.sort((a, b) => haversine(here, a) - haversine(here, b));
    here = left.shift();
    out.push(here);
  }
  return out;
}
function twoOpt(start, stops, end) {
  const total = (r) => pathKm([start, ...r, ...(end ? [end] : [])]);
  let route = [...stops], best = total(route), improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const cand = [...route.slice(0, i), ...route.slice(i, k + 1).reverse(), ...route.slice(k + 1)];
        const len = total(cand);
        if (len < best - 1e-9) { route = cand; best = len; improved = true; }
      }
    }
  }
  return route;
}
function withDropoffs(stops, depot, cap) {
  const plan = []; let load = 0;
  for (const s of stops) {
    if (plan.length && load + s.est > cap) { plan.push({ ...depot, kind: "dropoff" }); load = 0; }
    plan.push({ ...s, kind: "pickup" }); load += s.est;
  }
  return plan;
}
function planRoutes(start, stops, depot, cap) {
  const booking = [...stops].sort((a, b) => a.bookedAt - b.bookedAt);
  const urgent = stops.filter((s) => s.priority === "high"), normal = stops.filter((s) => s.priority !== "high");
  const first = urgent.length ? twoOpt(start, nearest(start, urgent)) : [];
  const from = first.length ? first[first.length - 1] : start;
  const second = normal.length ? twoOpt(from, nearest(from, normal), depot) : [];
  const summary = (order) => { const plan = withDropoffs(order, depot, cap); return { plan, km: r2(pathKm([start, ...plan, depot])) }; };
  const b = summary(booking), o = summary([...first, ...second]);
  return { booking: b, optimised: o, savedPct: b.km > 0 ? Math.round((b.km - o.km) / b.km * 100) : 0, est: r1(stops.reduce((s, x) => s + x.est, 0)), cap };
}
const r2 = (v) => Math.round(v * 100) / 100;
