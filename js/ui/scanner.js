/* Camera QR scanning. Uses the browser's BarcodeDetector where it exists (Chrome on Android),
   otherwise loads the small jsQR library. Needs https or localhost (Live Server is fine). */

let scanStream = null, scanFrame = 0;

function loadJsQR() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
    s.onload = () => (window.jsQR ? resolve(window.jsQR) : reject(new Error("jsqr")));
    s.onerror = () => reject(new Error("jsqr"));
    document.head.appendChild(s);
  });
}

async function startScan(video, onCode) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("insecure");
  stopScan();
  scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
  video.srcObject = scanStream;
  video.setAttribute("playsinline", "");
  await video.play();

  const done = (text) => {
    const code = String(text).toUpperCase().match(/TC-(?:B|\d{4})-\d{4}/)?.[0];
    if (!code) return false;
    stopScan();
    onCode(code);
    return true;
  };

  if ("BarcodeDetector" in window) {
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const tick = async () => {
      if (!scanStream) return;
      try { const found = await detector.detect(video); if (found[0] && done(found[0].rawValue)) return; } catch { /* next frame */ }
      scanFrame = requestAnimationFrame(tick);
    };
    tick();
    return;
  }

  const decode = await loadJsQR();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const tick = () => {
    if (!scanStream) return;
    if (video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hit = decode(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
      if (hit && done(hit.data)) return;
    }
    scanFrame = requestAnimationFrame(tick);
  };
  tick();
}

function stopScan() {
  cancelAnimationFrame(scanFrame);
  if (scanStream) scanStream.getTracks().forEach((tr) => tr.stop());
  scanStream = null;
}
