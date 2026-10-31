/* AI photo check: material, contamination level and what to do.
   1. With the person's own Gemini key (Settings), called from this browser.
   2. Inside claude.ai, through the viewer's Claude.
   3. Otherwise no AI: the household picks the type from the picture guide. We never make up a result. */

const AI_KEY_STORE = "tracecycle.geminiKey";
const AI_MODEL_STORE = "tracecycle.geminiModel";
const AI_MIN_CONFIDENCE = 0.6;

const aiSettings = {
  key() { try { return localStorage.getItem(AI_KEY_STORE) || ""; } catch { return ""; } },
  model() { try { return localStorage.getItem(AI_MODEL_STORE) || "gemini-2.5-flash"; } catch { return "gemini-2.5-flash"; } },
  save(key, model) {
    try {
      key ? localStorage.setItem(AI_KEY_STORE, key.trim()) : localStorage.removeItem(AI_KEY_STORE);
      localStorage.setItem(AI_MODEL_STORE, (model || "gemini-2.5-flash").trim());
    } catch { /* storage blocked */ }
  },
};

function aiPrompt(lang) {
  return `You help households in rural India sort waste for recycling. Look at the photo and answer with JSON only, no other text:
{"material": one of ["organic","pet","other_plastic","paper","metal","glass","unknown"], "confidence": number between 0 and 1, "contamination": one of ["low","medium","high"], "issues": up to 3 short observations, "instructions": up to 3 short practical steps that make it easier to recycle}
"pet" means PET bottles and clear food containers. "organic" means kitchen and garden waste.
If the photo is unclear or shows several kinds of waste mixed together, use a confidence below 0.4.
Write "issues" and "instructions" in ${lang === "hi" ? "simple Hindi" : "simple English"}.`;
}

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

function cleanResult(raw) {
  const ok = raw && MATERIALS.includes(raw.material) && typeof raw.confidence === "number" && ["low", "medium", "high"].includes(raw.contamination);
  if (!ok) return { status: "failed" };
  if (raw.confidence < AI_MIN_CONFIDENCE) return { status: "low" };
  return {
    status: "done",
    ai: {
      material: raw.material, confidence: Math.round(raw.confidence * 100) / 100, contamination: raw.contamination,
      issues: (raw.issues || []).slice(0, 3).map((x) => String(x).slice(0, 120)),
      instructions: (raw.instructions || []).slice(0, 3).map((x) => String(x).slice(0, 120)),
    },
  };
}

async function checkWithGemini(file, lang) {
  const data = await readAsBase64(file);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(aiSettings.model())}:generateContent?key=${encodeURIComponent(aiSettings.key())}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: file.type, data } }, { text: aiPrompt(lang) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });
  if (!res.ok) return { status: "failed" };
  const body = await res.json();
  return cleanResult(JSON.parse(body.candidates[0].content.parts[0].text));
}

let samplePromise = null;
function getSample() {
  if (!samplePromise) samplePromise = window.claude?.use ? window.claude.use("sample").catch(() => null) : Promise.resolve(null);
  return samplePromise;
}

async function checkWithClaude(file, lang) {
  const sample = await getSample();
  const limits = sample ? await sample.limits().catch(() => null) : null;
  if (!sample || !limits?.images) return null;
  return cleanResult(await sample.json(aiPrompt(lang), { images: [file], modelTier: "quick" }));
}

async function analysePhoto(file, lang) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { status: "badType" };
  if (file.size > 5 * 1024 * 1024) return { status: "tooBig" };
  try {
    // Inside claude.ai the page cannot call other sites, so Claude does the check there.
    if (window.claude?.use) return (await checkWithClaude(file, lang)) || { status: "none" };
    if (aiSettings.key()) return await checkWithGemini(file, lang);
    return { status: "none" };
  } catch {
    return { status: "failed" };
  }
}
