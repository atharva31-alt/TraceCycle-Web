/* Environmental impact. Only what the records support is calculated:
   landfill diversion = recovered kg; distance saved = booking-order route minus optimised route.
   CO2e appears only for materials whose factor AND source an admin has entered. Nothing is pre-filled. */

function impactSummary() {
  const s = stats();
  const factors = D.impactFactors || {};
  const byMaterial = Object.entries(s.mats).map(([m, v]) => {
    const f = factors[m];
    return { material: m, recovered: v.rec, rejected: v.rej, factor: f || null, co2e: f ? r1(v.rec * f.value) : null };
  });
  const withFactor = byMaterial.filter((x) => x.co2e !== null);
  const routeSaved = D.users.filter((u) => u.role === "collector").reduce((sum, c) => {
    const due = D.requests.filter((r) => r.collector === c.id && r.status === "scheduled" && r.date !== "tomorrow");
    if (due.length < 2) return sum;
    const depot = user(3);
    const plan = planRoutes({ lat: c.lat, lng: c.lng }, due.map((r) => ({ ...r })), { lat: depot.lat, lng: depot.lng }, c.capacity);
    return sum + (plan.booking.km - plan.optimised.km);
  }, 0);
  return {
    landfill: s.rec, rate: s.rate, byMaterial,
    co2e: withFactor.length ? r1(withFactor.reduce((a, x) => a + x.co2e, 0)) : null,
    co2eCovers: withFactor.map((x) => x.material),
    routeSavedKm: r2(routeSaved),
  };
}

function setImpactFactor(material, value, source) {
  D.impactFactors = D.impactFactors || {};
  if (value === null) delete D.impactFactors[material];
  else D.impactFactors[material] = { value, source };
}
