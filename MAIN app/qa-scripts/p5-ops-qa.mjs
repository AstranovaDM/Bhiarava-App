import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "qa-screenshots");
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.QA_BASE || "http://127.0.0.1:5173";

async function shot(page, name) {
  const fp = path.join(OUT, name);
  await page.screenshot({ path: fp, fullPage: false });
  console.log("shot", name);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(25000);

  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"], input[name="email"]').first().fill("admin@bhairava.com");
  await page.locator('input[type="password"]').first().fill("admin@2026");
  await page
    .getByRole("button", { name: /sign in|log in|continue/i })
    .first()
    .click()
    .catch(async () => {
      await page.locator('input[type="password"]').first().press("Enter");
    });
  await page.waitForTimeout(1500);

  await page.goto(BASE + "/projects/PRJ-01?tab=documents", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const workspace = page.getByTestId("ops-workspace");
  await workspace.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  console.log("ops-workspace visible", await workspace.isVisible().catch(() => false));
  await shot(page, "p5-complete-01-documents.png");

  // Documents section already default
  const docRow = page.locator('[data-testid^="ops-doc-row-"]').first();
  if (await docRow.count()) {
    await docRow.click();
    await page.waitForTimeout(400);
  }
  await shot(page, "p5-complete-02-doc-detail.png");

  await page.getByTestId("ops-section-registration").click();
  await page.waitForTimeout(600);
  const regRow = page.locator('[data-testid^="ops-reg-row-"]').first();
  if (await regRow.count()) {
    await regRow.click();
    await page.waitForTimeout(400);
  }
  await shot(page, "p5-complete-03-registration.png");

  await page.getByTestId("ops-section-resale").click();
  await page.waitForTimeout(600);
  const resaleRow = page.locator('[data-testid^="ops-resale-row-"]').first();
  if (await resaleRow.count()) {
    await resaleRow.click();
    await page.waitForTimeout(400);
  }
  await shot(page, "p5-complete-04-resale.png");

  // Add document flow
  await page.getByTestId("ops-section-documents").click();
  await page.waitForTimeout(400);
  if (await page.getByTestId("ops-add-doc").count()) {
    await page.getByTestId("ops-add-doc").click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder*="master-layout"]').fill("p5-qa-internal-note.pdf");
    await page.getByRole("button", { name: /save/i }).first().click().catch(() => {});
    await page.waitForTimeout(800);
  }
  await shot(page, "p5-complete-05-after-add-doc.png");

  // DOM sanity
  const html = await page.content();
  console.log("has ops-documents", html.includes("ops-documents") || (await page.getByTestId("ops-documents").count()) > 0);
  console.log("ComingSoon still?", /Vault with visibility model ships in P3/.test(html));

  await browser.close();
  console.log("P5 QA done");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
