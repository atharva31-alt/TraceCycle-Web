/* Green Score. Points come only from recorded, verified events, and are recomputed every time
   (never stored), so they cannot be double counted. Bundle-based points are marked as estimates. */

const POINTS = { pickup: 10, clean: 15, regular: 25 };
const CLEAN_LIMIT = 0.10; // rejected share at or below this counts as well separated

function householdScore(hhId) {
  const bags = D.bags.filter((b) => b.household === hhId && b.req).sort((a, b) => a.createdAt - b.createdAt);
  const items = [];
  bags.forEach((b) => {
    items.push({ code: b.code, key: "rw.pickup", points: POINTS.pickup, at: b.createdAt, estimate: false });
    const share = bagShare(b);
    if (share && 1 - share.rate <= CLEAN_LIMIT) items.push({ code: b.code, key: "rw.clean", points: POINTS.clean, at: b.createdAt, estimate: share.estimate });
  });
  const recent = bags.filter((b) => Date.now() - b.createdAt < 30 * DAY);
  if (recent.length >= 3) items.push({ code: null, key: "rw.regular", points: POINTS.regular, at: recent[2].createdAt, estimate: false });

  const processed = bags.filter((b) => bagShare(b));
  const lastTwoClean = processed.length >= 2 && processed.slice(-2).every((b) => 1 - bagShare(b).rate <= CLEAN_LIMIT);
  const badges = [
    { key: "badge.first", earned: bags.length >= 1 },
    { key: "badge.regular", earned: recent.length >= 3 },
    { key: "badge.clean", earned: lastTwoClean },
  ];
  return { points: items.reduce((s, i) => s + i.points, 0), items: items.sort((a, b) => b.at - a.at), badges, bags: bags.length };
}

function wardLeaderboard() {
  const rows = wardStats().filter((w) => w.recoveryRate !== null).sort((a, b) => b.recoveryRate - a.recoveryRate);
  return rows.map((w, i) => ({ ...w, champion: i === 0 }));
}
