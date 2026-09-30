/**
 * Reproduit l'état bloqué d'un navigateur réel et vérifie que l'app se répare
 * seule : localStorage figé sur l'ancienne API + mutation d'auth coincée
 * dans la file IndexedDB.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = createRequire(join(ROOT, "..", "InvoicePilot-AI", "package.json"))(
  "playwright",
);

const BASE = "http://localhost:5174";
const STALE_API = "http://192.168.1.37:3001/api";

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// --- état "cassé" identique à celui du navigateur de l'utilisateur ---------
await page.addInitScript((stale) => {
  localStorage.setItem("qatrial:api-url", stale);
  localStorage.setItem("qatrial:mode", "server");
  const req = indexedDB.open("qatrial-offline", 1);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains("mutations")) {
      db.createObjectStore("mutations", { keyPath: "id", autoIncrement: true });
    }
  };
  req.onsuccess = () => {
    const tx = req.result.transaction("mutations", "readwrite");
    tx.objectStore("mutations").add({
      method: "POST",
      url: `${stale}/auth/login`,
      body: JSON.stringify({ email: "x@y.z", password: "secret" }),
      headers: { "Content-Type": "application/json" },
      timestamp: Date.now(),
    });
  };
}, STALE_API);

await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(4000);

const state = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const req = indexedDB.open("qatrial-offline", 1);
      req.onsuccess = () => {
        const tx = req.result.transaction("mutations", "readonly");
        const count = tx.objectStore("mutations").count();
        count.onsuccess = () =>
          resolve({
            apiUrl: localStorage.getItem("qatrial:api-url"),
            envMarker: localStorage.getItem("qatrial:api-url:env"),
            queued: count.result,
          });
        count.onerror = () => resolve({ queued: -1 });
      };
      req.onerror = () => resolve({ queued: -1 });
    }),
);

console.log("apiUrl apres demarrage :", state.apiUrl);
console.log("marqueur env           :", state.envMarker);
console.log("mutations en file      :", state.queued);

const banner = await page.locator("text=/queued write/i").count();
console.log("bandeau 'queued write' :", banner === 0 ? "absent" : "TOUJOURS LA");

// --- connexion reelle ------------------------------------------------------
await page.fill('input[type="email"]', "samiriggui@gmail.com");
await page.fill('input[type="password"]', "Qatrial2026!");
await page.locator('button[type="submit"]').first().click();
await page.waitForTimeout(4000);
console.log("URL apres login        :", page.url());
console.log(
  "connecte               :",
  page.url().includes("/app") ? "OUI" : "NON",
);

await page.screenshot({ path: join(ROOT, ".refonte-shots", "selfheal.png") });
await browser.close();
