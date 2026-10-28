import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const external = [];
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => {
  if (/^https?:/.test(request.url()) && !new URL(request.url()).hostname.match(/^(localhost|127\.0\.0\.1)$/)) external.push(request.url());
});
try {
  await page.goto(process.env.VEXSNAP_TEST_URL ?? "http://localhost:3100");
  assert.equal(await page.locator(".workflow h2").count(), 3);
  assert.equal(await page.locator(".photo-card").count(), 0);
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(".skip-link").evaluate(el => el === document.activeElement), true);
  assert.equal(await page.locator(".skip-link").evaluate(el => getComputedStyle(el).outlineStyle), "solid");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  assert.match(await page.evaluate(() => document.activeElement.textContent), /Add Photos/);
  await page.screenshot({ path: ".next/interface-desktop.png", fullPage: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `empty overflow at ${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('input[aria-label="Choose photos"]').setInputFiles("tests/fixtures/photo.jpg");
  await page.locator(".photo-card").waitFor();
  const preview = page.getByRole("button", { name: "Preview photo.jpg", exact: true });
  await preview.focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.getByRole("dialog").isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").isVisible(), false);
  assert.equal(await preview.evaluate(el => el === document.activeElement), true);
  await page.getByRole("button", { name: /Custom Set your own/ }).click();
  const quality = page.getByRole("slider").first();
  await quality.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await quality.inputValue(), "83");
  await page.evaluate(() => {
    window.sawProcessing = false;
    new MutationObserver(() => {
      if (document.querySelector('.progress[role="status"]')) window.sawProcessing = true;
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole("button", { name: "Calculate compressed size" }).click();
  await page.getByRole("button", { name: "Recalculate compressed size" }).waitFor();
  assert.equal(await page.evaluate(() => window.sawProcessing), true);
  await page.getByLabel("Paper").selectOption("Letter");
  await page.getByRole("button", { name: /Create PDF/ }).click();
  await page.getByRole("button", { name: /Download PDF/ }).waitFor();
  assert.match(await page.locator(".export-result").innerText(), /Your PDF is ready/);
  await page.screenshot({ path: ".next/interface-mobile.png", fullPage: true });
  await page.locator('input[aria-label="Choose photos"]').setInputFiles({ name: "bad.png", mimeType: "image/png", buffer: Buffer.from("broken") });
  await page.locator('.error-box[role="alert"]').waitFor();
  await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  await page.locator('.error-box[role="alert"]').waitFor({ state: "hidden" });
  assert.equal(await page.locator('.error-box[role="alert"]').count(), 0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.locator("html").evaluate(el => getComputedStyle(el).scrollBehavior), "auto");
  assert.deepEqual(errors, []);
  assert.deepEqual(external, [], "Files and processing must stay local");
  console.log("INTERFACE PASS: empty layouts, keyboard entry and preview, focus return, custom slider, Letter PDF success, error dismissal, reduced motion, no external requests or runtime errors");
} finally {
  await browser.close();
}
