/* Hindi / English voice assistant. Understands short commands with a keyword parser (no data leaves the browser),
   answers aloud and can open the right page. Works with typed commands too. */

const WASTE_GUIDE = [
  ["sanitary", ["diaper", "pad", "sanitary", "डायपर", "पैड", "सैनिटरी"]],
  ["special", ["medicine", "battery", "bulb", "paint", "tube light", "दवा", "दवाई", "बैटरी", "बल्ब", "पेंट"]],
];

function parseCommand(text) {
  const said = String(text || "").toLowerCase();
  const has = (...words) => words.some((w) => said.includes(w));
  const code = said.toUpperCase().replace(/\s+/g, "").match(/TC-?(B|\d{4})-?(\d{4})/);

  if (has("english", "अंग्रेज़ी", "अंग्रेजी")) return { intent: "lang", lang: "en" };
  if (has("hindi", "हिंदी", "हिन्दी")) return { intent: "lang", lang: "hi" };
  if (code) return { intent: "track", code: `TC-${code[1]}-${code[2]}` };
  for (const [stream, words] of WASTE_GUIDE) if (has(...words)) return { intent: "where", stream };
  if (has("kahan", "kahaan", "कहाँ", "कहां", "where", "which bin", "कौन से")) {
    const material = materialFromSpeech(said);
    if (material) return { intent: "where", stream: STREAM[material], material };
  }
  if (has("book", "pickup", "पिकअप", "बुक", "उठाओ", "ले जाओ", "le jao", "uthao")) {
    const size = has("big", "large", "bada", "बड़ा", "बड़ी", "ज़्यादा") ? "L" : has("small", "chhota", "छोटा", "थोड़ा") ? "S" : null;
    return { intent: "book", material: materialFromSpeech(said), size };
  }
  if (has("score", "point", "अंक", "पॉइंट", "स्कोर", "reward")) return { intent: "score" };
  if (has("route", "रूट", "रास्ता", "aaj ke", "आज के", "today")) return { intent: "route" };
  if (has("status", "my bag", "mera", "मेरा", "मेरे", "स्थिति", "pickups")) return { intent: "status" };
  if (has("notification", "सूचना")) return { intent: "notes" };
  if (has("help", "madad", "मदद", "क्या बोल")) return { intent: "help" };
  const material = materialFromSpeech(said);
  if (material) return { intent: "where", stream: STREAM[material], material };
  return { intent: "unknown" };
}

// Turns an intent into a reply (and an optional page to open).
function runCommand(cmd) {
  const u = S.user;
  switch (cmd.intent) {
    case "lang":
      S.lang = cmd.lang;
      return { reply: t("va.lang") };
    case "track":
      return bag(cmd.code) ? { reply: t("va.track", { code: cmd.code, st: t("st." + topOf(bag(cmd.code)).status) }), go: ["passport", cmd.code] } : { reply: t("va.noBag", { code: cmd.code }) };
    case "where":
      return { reply: t("va.where." + cmd.stream, { m: cmd.material ? t("m." + cmd.material) : "" }) };
    case "book":
      if (u?.role !== "household") return { reply: t("va.needHousehold") };
      S.book = null;
      S.prefill = { material: cmd.material, size: cmd.size };
      return { reply: cmd.material ? t("va.book", { m: t("m." + cmd.material) }) : t("va.bookAsk"), go: ["book"] };
    case "score":
      if (u?.role !== "household") return { reply: t("va.needHousehold") };
      return { reply: t("va.score", { n: householdScore(u.id).points }), go: ["rewards"] };
    case "route": {
      if (u?.role !== "collector") return { reply: t("va.needCollector") };
      const { due, plan } = collectorPlan();
      return { reply: t("va.route", { n: due.length, km: plan.optimised.km, p: plan.savedPct }), go: ["collector"] };
    }
    case "status": {
      if (u?.role !== "household") return { reply: t("va.needHousehold") };
      const last = D.requests.filter((r) => r.household === u.id).sort((a, b) => b.bookedAt - a.bookedAt)[0];
      if (!last) return { reply: t("hh.empty") };
      const st = last.bag ? topOf(bag(last.bag)).status : last.status;
      return { reply: t("va.status", { m: t("m." + last.material), st: t("st." + st) }), go: ["household"] };
    }
    case "notes": {
      const n = u ? D.notes.filter((x) => x.user === u.id && !x.read).length : 0;
      return { reply: t("va.notes", { n }), go: u ? ["notes"] : null };
    }
    case "help":
      return { reply: t("va.help") };
    default:
      return { reply: t("va.unknown") };
  }
}
