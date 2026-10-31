/* Voice help on the booking page: say what the waste is (Hindi or English) and we pick the type.
   Uses the browser's speech recognition where available (Chrome, Edge). Nothing is sent to our server. */

const VOICE_WORDS = [
  ["pet", ["bottle", "bottles", "pet", "बोतल", "बोतलें"]],
  ["glass", ["glass", "jar", "कांच", "काँच", "शीशा", "शीशी"]],
  ["metal", ["can", "cans", "tin", "metal", "foil", "धातु", "लोहा", "टिन", "कैन"]],
  ["paper", ["paper", "newspaper", "carton", "cardboard", "box", "book", "कागज", "कागज़", "अखबार", "अख़बार", "गत्ता", "किताब"]],
  ["organic", ["peel", "peels", "food", "vegetable", "fruit", "flower", "leaves", "wet", "छिलके", "छिलका", "खाना", "सब्जी", "सब्ज़ी", "फल", "फूल", "पत्ते", "गीला"]],
  ["other_plastic", ["plastic", "wrapper", "polythene", "packet", "bag", "प्लास्टिक", "पन्नी", "थैली", "पॉलीथीन", "रैपर"]],
];

function voiceSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function materialFromSpeech(text) {
  const said = String(text || "").toLowerCase();
  for (const [material, words] of VOICE_WORDS) {
    if (words.some((w) => said.includes(w))) return material;
  }
  return null;
}

function listenOnce(lang) {
  return new Promise((resolve, reject) => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return reject(new Error("unsupported"));
    const rec = new Recognition();
    rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onresult = (e) => resolve([...e.results[0]].map((alt) => alt.transcript).join(" "));
    rec.onerror = (e) => reject(new Error(e.error || "error"));
    rec.onend = () => resolve("");
    rec.start();
  });
}

function speak(lines) {
  if (!("speechSynthesis" in window) || !lines?.length) return;
  const u = new SpeechSynthesisUtterance(lines.join(". "));
  u.lang = S.lang === "hi" ? "hi-IN" : "en-IN";
  u.rate = 0.95;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
