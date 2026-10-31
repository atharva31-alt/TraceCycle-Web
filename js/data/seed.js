/* Synthetic demo data for one sample village ("Rampur", 6 wards), about three weeks of activity.
   It is built through the same lifecycle functions the app uses, so every hash chain, flag,
   notification and audit entry is real. Names and numbers are made up. */

// Small deterministic random generator, so every reset gives the same village.
function seededRandom(seedValue) {
  let a = seedValue >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

async function seed() {
  SEEDING = true;
  try { await buildVillage(); } finally { SEEDING = false; }
}

async function buildVillage() {
  D = {
    users: [], requests: [], bags: [], transfers: [], events: {}, outcomes: [], flags: [], notes: [], audit: [],
    outbox: [], applied: [], impactFactors: {}, geoOffset: { lat: 0, lng: 0 },
    seq: { req: 0, bag: 0, bundle: 0, tr: 0, flag: 0, note: 0, audit: 0 },
  };
  const U = (o) => { D.users.push({ verified: true, ...o }); return D.users[D.users.length - 1]; };

  const sunita = U({ id: 1, role: "household", name: "Sunita Devi", phone: "9000000001", ward: 4, lat: 30.2879, lng: 78.0866 });
  const raju = U({ id: 2, role: "collector", name: "Raju Kumar", phone: "9000000002", lat: 30.2862, lng: 78.0832, wards: [1, 2, 3, 4], capacity: 50 });
  const shyam = U({ id: 3, role: "aggregator", name: "Shyam Scrap Traders", phone: "9000000003", lat: 30.2915, lng: 78.1005, accepts: ["pet", "other_plastic", "paper", "metal", "glass"], capacity: 800 });
  const green = U({ id: 4, role: "recycler", name: "Green Polymers Recycling Unit", phone: "9000000004", lat: 30.3050, lng: 78.1240, accepts: ["pet", "other_plastic"], capacity: 2000 });
  U({ id: 5, role: "admin", name: "Panchayat Secretary, Rampur", phone: "9000000005" });
  const mohan = U({ id: 6, role: "collector", name: "Mohan Lal", phone: "9000000006", lat: 30.2862, lng: 78.0975, wards: [5, 6], capacity: 50 });
  const saraswati = U({ id: 7, role: "recycler", name: "Saraswati Paper Recyclers", phone: "9000000007", lat: 30.2710, lng: 78.1290, accepts: ["paper"], capacity: 1500 });
  const doon = U({ id: 8, role: "recycler", name: "Doon Metal and Glass Recovery", phone: "9000000008", lat: 30.3110, lng: 78.0700, accepts: ["metal", "glass"], capacity: 1500 });
  const compost = U({ id: 9, role: "recycler", name: "Gram Panchayat Compost Unit", phone: "9000000009", lat: 30.2845, lng: 78.1085, accepts: ["organic"], capacity: 600 });
  D.users.filter((u) => u.role === "collector").forEach((u) => { u.onDuty = true; });

  // Households: [id, ward, lat, lng]. Ids are shown publicly only as codes like HH-0014.
  [
    [12, 4, 30.2872, 78.0849], [14, 2, 30.2968, 78.0942], [17, 2, 30.2950, 78.0958], [19, 3, 30.2971, 78.1035],
    [21, 1, 30.2955, 78.0868], [26, 1, 30.2966, 78.0851], [30, 4, 30.2889, 78.0875], [33, 3, 30.2952, 78.1029],
    [38, 2, 30.2958, 78.0931], [41, 5, 30.2884, 78.0958], [45, 6, 30.2876, 78.1031], [47, 5, 30.2869, 78.0946],
    [48, 6, 30.2890, 78.1044], [52, 3, 30.2963, 78.1050], [55, 1, 30.2948, 78.0878],
  ].forEach(([id, ward, lat, lng]) => U({ id, role: "household", name: `${t("household")} ${id}`, ward, lat, lng }));
  const H = (id) => D.users.find((u) => u.id === id);
  const collectorFor = (h) => (h.ward >= 5 ? mohan : raju);

  const pick = async (h, material, size, weight, daysAgo, code) => {
    const req = book(h, { material, size, slot: "morning", lat: h.lat, lng: h.lng }, ago(daysAgo + 0.6));
    return confirmPickup(collectorFor(h), req.id, weight, ago(daysAgo), code, req.handshake);
  };
  const deliver = async (b, from, to, daysAgo, received) => {
    await send(from, b.code, to.id, ago(daysAgo, -3));
    return receive(to, b.code, received ?? b.current, ago(daysAgo, -4));
  };
  const finish = (b, recycler, rejectShare, reason, daysAgo) => {
    const rejected = r1(b.current * rejectShare);
    return outcome(recycler, b.code, r1(b.current - rejected), rejected, rejected > 0 ? reason : null, ago(daysAgo));
  };

  // Weeks three to six: routine collections, bundled every few days and processed.
  // Bags from these weeks are TC-2026-0001 onwards; their bundles are numbered from TC-B-0101.
  const rand = seededRandom(2026);
  D.seq.bundle = 100;
  const homes = D.users.filter((u) => u.role === "household");
  const sizes = { S: [1.4, 2.6], M: [3.5, 6.5], L: [7, 12] };
  const mix = ["pet", "pet", "paper", "paper", "other_plastic", "organic", "metal", "glass"];
  const target = { pet: green, other_plastic: green, paper: saraswati, metal: doon, glass: doon };
  for (let day = 42; day >= 22; day -= 2) {
    const count = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const h = homes[Math.floor(rand() * homes.length)];
      const material = mix[Math.floor(rand() * mix.length)];
      const size = rand() < 0.5 ? "S" : rand() < 0.8 ? "M" : "L";
      const [lo, hi] = sizes[size];
      const b = await pick(h, material, size, r1(lo + rand() * (hi - lo)), day + i * 0.01);
      const collector = collectorFor(h);
      if (material === "organic") {
        await deliver(b, collector, compost, day - 0.2);
        await finish(b, compost, 0.02 + rand() * 0.05, "mixed_waste", day - 0.5);
      } else {
        await deliver(b, collector, shyam, day - 0.2);
      }
    }
    if (day % 6 === 0) {
      for (const material of ["pet", "other_plastic", "paper", "metal", "glass"]) {
        const stock = D.bags.filter((x) => x.holder === shyam.id && x.status === "at_aggregator" && x.material === material).map((x) => x.code);
        if (!stock.length) continue;
        const unit = stock.length > 1 ? await merge(shyam, stock, ago(day - 1)) : bag(stock[0]);
        await deliver(unit, shyam, target[material], day - 1.5);
        await finish(unit, target[material], 0.03 + rand() * 0.09, rand() < 0.5 ? "mixed_waste" : "wet_or_dirty", day - 2.5);
      }
    }
  }
  // Anything left from those weeks goes out together.
  for (const material of ["pet", "other_plastic", "paper", "metal", "glass"]) {
    const stock = D.bags.filter((x) => x.holder === shyam.id && x.status === "at_aggregator" && x.material === material).map((x) => x.code);
    if (!stock.length) continue;
    const unit = stock.length > 1 ? await merge(shyam, stock, ago(21)) : bag(stock[0]);
    await deliver(unit, shyam, target[material], 20.8);
    await finish(unit, target[material], 0.04 + rand() * 0.06, "mixed_waste", 20.6);
  }

  // About three weeks ago: wards 5 and 6 (Mohan), metal and glass to Doon.
  const m1 = await pick(H(41), "metal", "M", 3.2, 20, "TC-2026-0061");
  const m2 = await pick(H(45), "glass", "M", 4.4, 20, "TC-2026-0062");
  const m3 = await pick(H(47), "organic", "S", 2.2, 20, "TC-2026-0063");
  await deliver(m1, mohan, shyam, 19.8); await deliver(m2, mohan, shyam, 19.8); await deliver(m3, mohan, compost, 19.8);
  await finish(m3, compost, 0.05, "mixed_waste", 19.5);
  await deliver(m1, shyam, doon, 18.5); await deliver(m2, shyam, doon, 18.5);
  await finish(m1, doon, 0.03, "mixed_waste", 18); await finish(m2, doon, 0.11, "wrong_material", 18);

  // Two weeks ago: Raju's wards, a PET bundle (with Sunita's bag) and a paper bundle.
  const b88 = await pick(sunita, "pet", "M", 4.6, 12, "TC-2026-0088");
  const b89 = await pick(H(14), "pet", "S", 2.1, 12, "TC-2026-0089");
  const b90 = await pick(H(26), "pet", "M", 6.3, 12, "TC-2026-0090");
  const b91 = await pick(H(17), "paper", "M", 5.2, 12, "TC-2026-0091");
  const b92 = await pick(H(19), "paper", "L", 8.8, 12, "TC-2026-0092");
  const b93 = await pick(H(21), "organic", "S", 2.4, 12, "TC-2026-0093");
  const b94 = await pick(H(52), "paper", "M", 4.1, 12, "TC-2026-0094");
  for (const b of [b88, b89, b90, b91, b92, b94]) await deliver(b, raju, shyam, 11.8);
  await deliver(b93, raju, compost, 11.8);
  await finish(b93, compost, 0.04, "mixed_waste", 11.5);
  const b9 = await merge(shyam, [b88.code, b89.code, b90.code], ago(10), "TC-B-0009");
  const b10 = await merge(shyam, [b91.code, b92.code, b94.code], ago(10), "TC-B-0010");
  await deliver(b9, shyam, green, 9.5); await deliver(b10, shyam, saraswati, 9.5);
  await finish(b9, green, 0.085, "mixed_waste", 8); await finish(b10, saraswati, 0.06, "wet_or_dirty", 8);

  // Mohan's hand-offs keep arriving light: three in ten days raises a "repeated mismatch" flag on its own.
  const m4 = await pick(H(48), "paper", "M", 4.0, 9, "TC-2026-0101");
  await deliver(m4, mohan, shyam, 8.8, 3.6);
  const b120 = await pick(H(30), "other_plastic", "M", 3.4, 6, "TC-2026-0120");
  const b124 = await pick(H(38), "other_plastic", "M", 4.1, 6, "TC-2026-0124");
  const b127 = await pick(H(41), "other_plastic", "S", 2.9, 6, "TC-2026-0127");
  const b128 = await pick(H(12), "organic", "M", 3.1, 6, "TC-2026-0128");
  await deliver(b120, raju, shyam, 5.8); await deliver(b124, raju, shyam, 5.8); await deliver(b127, mohan, shyam, 5.8, 2.4);
  await deliver(b128, raju, compost, 5.8); await finish(b128, compost, 0.03, "mixed_waste", 5.5);
  const m5 = await pick(H(47), "pet", "S", 3.0, 5, "TC-2026-0129");
  await deliver(m5, mohan, shyam, 4.8, 2.7);

  // A bundle now waiting at the PET recycler for its outcome.
  const b12 = await merge(shyam, [b120.code, b124.code, b127.code], ago(4), "TC-B-0012");
  await deliver(b12, shyam, green, 3.6, 9.8);

  // Stock at Shyam's from the last few days.
  for (const [code, id, m, s, w] of [["TC-2026-0131", 14, "pet", "S", 2.2], ["TC-2026-0133", 33, "pet", "M", 4.9], ["TC-2026-0136", 26, "pet", "S", 1.9], ["TC-2026-0138", 55, "other_plastic", "M", 3.0], ["TC-2026-0139", 17, "metal", "M", 2.6]]) {
    const b = await pick(H(id), m, s, w, 3, code);
    await deliver(b, raju, shyam, 2.8);
  }

  // This morning.
  await pick(H(21), "pet", "S", 2.4, 0.2, "TC-2026-0141");
  await pick(H(19), "paper", "M", 4.8, 0.19, "TC-2026-0142");
  const b143 = await pick(H(38), "pet", "L", 6.1, 0.18, "TC-2026-0143");
  const b144 = await pick(sunita, "paper", "S", 1.8, 0.17, "TC-2026-0144");
  await send(raju, b143.code, shyam.id, ago(0, 3));
  await send(raju, b144.code, shyam.id, ago(0, 2.8));

  // Still to pick up today: Raju's route.
  [[14, "pet", "M", "Near the school"], [21, "organic", "S", "Panchayat bhawan lane"], [19, "paper", "L", "Main market"], [30, "other_plastic", "M", ""],
    [17, "metal", "S", ""], [26, "pet", "S", "Behind the water tank"], [33, "glass", "M", ""]].forEach(([id, m, s, lm], i) => {
    const h = H(id);
    book(h, { material: m, size: s, slot: i % 2 ? "afternoon" : "morning", lat: h.lat + 0.0003, lng: h.lng - 0.0002, landmark: lm }, ago(0.9 - i * 0.05));
  });
  book(sunita, { material: "pet", size: "M", slot: "afternoon", lat: sunita.lat, lng: sunita.lng, landmark: "Next to the temple" }, ago(0, 3));
  book(H(45), { material: "glass", size: "S", slot: "morning", lat: H(45).lat, lng: H(45).lng }, ago(0, 5));

  // Counters continue after the highest codes used above.
  D.seq.bag = Math.max(...D.bags.filter((b) => b.req).map((b) => +b.code.slice(-4)));
  D.seq.bundle = Math.max(...D.bags.filter((b) => !b.req).map((b) => +b.code.slice(-4)));

  // Older notifications start as read so the bell shows only what is new.
  D.notes.forEach((n) => { if (Date.now() - n.at > 864e5) n.read = true; });
  notify(1, t("n.booked", { when: `${t("book.today")}, ${t("slot.afternoon")}` }), new Date(), "pickup");
}
