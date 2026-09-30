/**
 * Smoke de la hiérarchie portefeuille → dossier (étapes 3a/3b).
 * Vérifie que le projet est bien dans l'URL à chaque niveau.
 */
import { createRequire } from "node:module";
import { join } from "node:path";

const ROOT = process.cwd();
const { chromium } = createRequire(join(ROOT, "..", "InvoicePilot-AI", "package.json"))(
  "playwright",
);

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://localhost:5174", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1500);
await page.fill('input[type="email"]', "samiriggui@gmail.com");
await page.fill('input[type="password"]', "Qatrial2026!");
await page.locator('button[type="submit"]').first().click();
await page.waitForTimeout(4000);
console.log("1. apres login    :", page.url());
await page.screenshot({
  path: ".refonte-shots/verif-portfolio.png",
  fullPage: true,
  animations: "disabled",
});

const card = page.locator('main [class*="cursor-pointer"]').first();
if (await card.count()) {
  await card.click();
  await page.waitForTimeout(3500);
}
console.log("2. clic dossier   :", page.url());
await page.screenshot({
  path: ".refonte-shots/verif-dashboard.png",
  fullPage: true,
  animations: "disabled",
});

const navLinks = await page.locator("nav a").allTextContents();
const target = navLinks.findIndex((label) => /requirement|exigence/i.test(label));
if (target >= 0) {
  await page.locator("nav a").nth(target).click();
  await page.waitForTimeout(3000);
}
console.log("3. nav exigences  :", page.url());

// URL directe : preuve que le dossier est partageable
const current = page.url();
await page.goto(current, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(3000);
console.log("4. URL directe    :", page.url());

await browser.close();
