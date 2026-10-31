/* Numbers for the dashboards. Everything is computed from the records each time, nothing is stored.
   Counting rule: collected = pickup weights; recovered / rejected = recycler outcomes. */

const DAY = 864e5;

function outcomeOf(b) {
  return D.outcomes.find((o) => o.bag === topOf(b).code) || null;
}

// For a bag inside a bundle, its share of the outcome is an estimate (same rate as the bundle).
function bagShare(b) {
  const o = outcomeOf(b);
  if (!o) return null;
  const rate = o.recovered / (o.recovered + o.rejected);
  return { recovered: b.measured * rate, rejected: b.measured * (1 - rate), rate, estimate: topOf(b).code !== b.code };
}

function stats() { return memo("stats", computeStats); }
function computeStats() {
  const pickups = D.bags.filter((b) => b.req);
  const collected = pickups.reduce((s, b) => s + b.measured, 0);
  const rec = D.outcomes.reduce((s, o) => s + o.recovered, 0);
  const rej = D.outcomes.reduce((s, o) => s + o.rejected, 0);
  const done = new Set(D.outcomes.map((o) => o.bag));
  const traced = pickups.filter((b) => done.has(topOf(b).code)).reduce((s, b) => s + b.measured, 0);
  const mats = {};
  D.outcomes.forEach((o) => {
    const m = bag(o.bag).material;
    mats[m] = mats[m] || { rec: 0, rej: 0 };
    mats[m].rec += o.recovered;
    mats[m].rej += o.rejected;
  });
  const weeks = [3, 2, 1, 0].map((w) => ({
    label: dayLabel(Date.now() - (w * 7 + 6) * DAY),
    kg: pickups.filter((b) => { const d = (Date.now() - b.createdAt) / DAY; return d >= w * 7 && d < w * 7 + 7; }).reduce((s, b) => s + b.measured, 0),
  }));
  const week = D.requests.filter((r) => Date.now() - r.bookedAt < 7 * DAY);
  return {
    collected, rec, rej,
    rate: rec + rej ? Math.round(rec / (rec + rej) * 1000) / 10 : null,
    traced: collected ? Math.round(traced / collected * 1000) / 10 : null,
    moving: collected - traced, mats, weeks,
    booked: week.length, completed: week.filter((r) => !["scheduled", "requested"].includes(r.status)).length,
  };
}

function wardStats() { return memo("wards", computeWardStats); }
function computeWardStats() {
  return [1, 2, 3, 4, 5, 6].map((ward) => {
    const reqs = D.requests.filter((r) => r.ward === ward && Date.now() - r.bookedAt < 14 * DAY);
    const bags = D.bags.filter((b) => b.req && b.ward === ward);
    let processed = 0, rejected = 0;
    bags.forEach((b) => { const s = bagShare(b); if (s) { processed += b.measured; rejected += s.rejected; } });
    // Simple average of the last three full weeks: a demo estimate, not a forecast.
    const weekly = [1, 2, 3].map((w) => bags.filter((b) => { const d = (Date.now() - b.createdAt) / DAY; return d >= w * 7 && d < w * 7 + 7; }).reduce((s, b) => s + b.measured, 0));
    return {
      ward,
      requests: reqs.length,
      pending: D.requests.filter((r) => r.ward === ward && ["scheduled", "requested"].includes(r.status)).length,
      collected: bags.reduce((s, b) => s + b.measured, 0),
      rejectRate: processed ? Math.round(rejected / processed * 1000) / 10 : null,
      recoveryRate: processed ? Math.round((processed - rejected) / processed * 1000) / 10 : null,
      nextWeek: Math.round(weekly.reduce((s, x) => s + x, 0) / 3 * 10) / 10,
      households: new Set(bags.map((b) => b.household)).size,
    };
  });
}

function peopleStats() {
  const handlers = D.users.filter((u) => ["collector", "aggregator"].includes(u.role)).map((u) => {
    const sent = D.transfers.filter((x) => x.from === u.id && x.status === "confirmed");
    const bad = sent.filter(isMismatch);
    return {
      u, handoffs: sent.length, mismatches: bad.length,
      lastMismatch: bad.length ? Math.max(...bad.map((x) => x.confirmedAt)) : null,
      openFlags: D.flags.filter((f) => f.subject === u.id && f.status === "open").length,
    };
  });
  const recyclers = D.users.filter((u) => u.role === "recycler").map((u) => {
    const outs = D.outcomes.filter((o) => o.recycler === u.id);
    const kgDone = outs.reduce((s, o) => s + o.recovered + o.rejected, 0);
    return { u, batches: outs.length, kg: kgDone, rejectRate: kgDone ? Math.round(outs.reduce((s, o) => s + o.rejected, 0) / kgDone * 1000) / 10 : null };
  });
  return { handlers, recyclers };
}

function csvExport() {
  const rows = [["batch_id", "type", "material", "status", "ward", "weighed_kg", "current_kg", "bundle", "recovered_kg", "rejected_kg", "created_ist", "data"]];
  D.bags.forEach((b) => {
    const o = D.outcomes.find((x) => x.bag === b.code);
    rows.push([b.code, b.req ? "bag" : "bundle", b.material, b.status, b.ward ?? "", b.measured, b.current, b.parent ?? "", o?.recovered ?? "", o?.rejected ?? "", when(b.createdAt), "synthetic demo data"]);
  });
  return rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
}
