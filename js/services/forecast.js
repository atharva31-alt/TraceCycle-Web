/* Demand forecast for collection (kg per week).
   Holt's linear trend smoothing on weekly totals, with a band from past one-step errors.
   This is a statistical estimate on synthetic data, not a guarantee. */

const WEEK = 7 * 864e5;

function weeklySeries(filter = () => true, weeks = 6) {
  const now = Date.now();
  return Array.from({ length: weeks }, (_, i) => {
    const w = weeks - 1 - i; // oldest first
    const from = now - (w + 1) * WEEK, to = now - w * WEEK;
    const kgSum = D.bags.filter((b) => b.req && filter(b) && b.createdAt >= from && b.createdAt < to).reduce((s, b) => s + b.measured, 0);
    return { from, to, kg: r1(kgSum) };
  });
}

function holtForecast(values, horizon = 2, alpha = 0.5, beta = 0.3) {
  if (values.length < 3) return null;
  let level = values[0], trend = values[1] - values[0];
  const errors = [];
  for (let i = 1; i < values.length; i++) {
    const predicted = level + trend;
    errors.push(values[i] - predicted);
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  const spread = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length);
  return Array.from({ length: horizon }, (_, h) => {
    const mid = Math.max(0, level + (h + 1) * trend);
    return { kg: r1(mid), low: r1(Math.max(0, mid - spread)), high: r1(mid + spread) };
  });
}

function demandForecast() { return memo("forecast", computeForecast); }
function computeForecast() {
  const total = weeklySeries();
  const byWard = [1, 2, 3, 4, 5, 6].map((ward) => {
    const series = weeklySeries((b) => b.ward === ward);
    const next = holtForecast(series.map((s) => s.kg), 1);
    return { ward, series, next: next ? next[0] : null };
  });
  return { total, forecast: holtForecast(total.map((s) => s.kg), 2), byWard };
}
