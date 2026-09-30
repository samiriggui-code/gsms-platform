/**
 * Filet visuel de la refonte front (phase 0).
 *
 * Capture les écrans clés en clair ET en sombre, pour comparer avant/après
 * chaque lot de la refonte. QAtrial n'a AUCUN test de rendu — les 9 fichiers
 * de test existants ne couvrent que la logique et les contrats API. Ces
 * captures sont donc la seule protection contre une régression visuelle.
 *
 * Usage :
 *   node scripts/capture-refonte.mjs              → .refonte-shots/before/
 *   node scripts/capture-refonte.mjs after-phase1 → .refonte-shots/after-phase1/
 *
 * Prérequis :
 *   - le front tourne (npm run dev → http://localhost:5174)
 *   - identifiants, sinon seul l'écran de login est capturé :
 *       $env:QATRIAL_EMAIL="..." ; $env:QATRIAL_PASSWORD="..."
 *
 * Playwright n'est pas une dépendance de QAtrial : le script le résout depuis
 * une app voisine du monorepo. Pour le rendre autonome : npm i -D playwright
 */
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LABEL = process.argv[2] || "before";
const OUT = join(ROOT, ".refonte-shots", LABEL);
const BASE = process.env.QATRIAL_URL || "http://localhost:5174";

/** Résolution tolérante : node_modules local, sinon app voisine. */
function loadPlaywright() {
  const candidates = [
    join(ROOT, "package.json"),
    join(ROOT, "..", "InvoicePilot-AI", "package.json"),
    join(ROOT, "..", "grace", "package.json"),
  ];
  for (const from of candidates) {
    try {
      return createRequire(from)("playwright");
    } catch {
      /* essai suivant */
    }
  }
  throw new Error(
    "playwright introuvable. Installe-le dans QAtrial : npm i -D playwright",
  );
}

/** Écrans représentatifs — pas tous, ceux qui portent le pattern visuel. */
const SCREENS = [
  { path: "/app/dashboard", file: "01-dashboard", note: "15 composants, recharts" },
  { path: "/app/requirements", file: "02-requirements", note: "route par défaut" },
  { path: "/app/kpi", file: "03-kpi", note: "cartes KPI — cœur de la refonte" },
  { path: "/app/tests", file: "04-tests", note: "tableau dense" },
  { path: "/app/deviations", file: "05-deviations", note: "badges de statut" },
  { path: "/app/documents", file: "06-documents" },
  { path: "/app/suppliers", file: "07-suppliers" },
  { path: "/app/settings/general", file: "08-settings", note: "formulaires" },
];

const THEMES = ["light", "dark"];

async function seedTheme(context, theme) {
  // zustand persist — même forme que useThemeStore (clé qatrial:theme)
  await context.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({ state: { theme: value }, version: 0 }),
        );
      } catch {
        /* stockage indisponible */
      }
    },
    ["qatrial:theme", theme],
  );
}

async function login(page) {
  const email = process.env.QATRIAL_EMAIL;
  const password = process.env.QATRIAL_PASSWORD;
  if (!email || !password) return false;

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);

  const emailField = page.locator('input[type="email"], input[name="email"]').first();
  if ((await emailField.count()) === 0) return true; // déjà authentifié

  await emailField.fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3000);

  return !page.url().includes("/login");
}

async function run() {
  const { chromium } = loadPlaywright();
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });

  let captured = 0;

  for (const theme of THEMES) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    await seedTheme(context, theme);
    const page = await context.newPage();

    const authed = await login(page);
    if (!authed) {
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: join(OUT, `00-login-${theme}.png`),
        fullPage: true,
        animations: "disabled",
      });
      console.log(`ok  00-login-${theme}.png`);
      console.log(
        "    ⚠ pas d'identifiants (QATRIAL_EMAIL / QATRIAL_PASSWORD) — écrans internes non capturés",
      );
      captured += 1;
      await context.close();
      continue;
    }

    for (const screen of SCREENS) {
      try {
        await page.goto(`${BASE}${screen.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        // laisse le temps aux graphes recharts et aux chargements i18n
        await page.waitForTimeout(2500);
        await page.screenshot({
          path: join(OUT, `${screen.file}-${theme}.png`),
          fullPage: true,
          animations: "disabled",
        });
        console.log(`ok  ${screen.file}-${theme}.png${screen.note ? `  (${screen.note})` : ""}`);
        captured += 1;
      } catch (err) {
        console.log(`ECHEC ${screen.file}-${theme} : ${err.message}`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log(`\n${captured} captures → .refonte-shots/${LABEL}/`);
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
