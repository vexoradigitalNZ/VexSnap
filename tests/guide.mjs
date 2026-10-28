import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const base = process.env.VEXSNAP_TEST_URL || 'http://localhost:3100';
try {
  await page.goto(base);
  const button = page.getByRole('link', { name: /How to use VexSnap/ });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const buttonBox = await button.boundingBox();
    const noteBox = await page.locator('.topbar-guide .top-note').boundingBox();
    assert.ok(buttonBox.y >= noteBox.y + noteBox.height);
    assert.ok(Math.abs(buttonBox.x + buttonBox.width - noteBox.x - noteBox.width) < 2);
  }
  const popupPromise = page.waitForEvent('popup');
  await button.click();
  const guide = await popupPromise;
  await guide.waitForLoadState();
  const video = guide.locator('video');
  await guide.waitForFunction(() => document.querySelector('video')?.readyState >= 1);
  async function play() {
    await video.evaluate(async v => { v.muted = true; await v.play(); v.currentTime = 3; });
    await guide.waitForFunction(() => !document.querySelector('video').paused);
  }
  async function assertStopped() {
    assert.deepEqual(await video.evaluate(v => ({ paused: v.paused, time: v.currentTime })), { paused: true, time: 0 });
  }
  await play();
  await guide.getByRole('button', { name: 'Stop video' }).click();
  await assertStopped();
  await play();
  await guide.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await assertStopped();
  await guide.evaluate(() => { delete document.visibilityState; });
  await play();
  await guide.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await assertStopped();
  await play();
  const handle = await video.elementHandle();
  await guide.getByRole('link', { name: 'Back to app' }).click();
  await guide.waitForURL(base + '/');
  await guide.waitForFunction(v => v.paused && v.currentTime === 0, handle);
  assert.deepEqual(await handle.evaluate(v => ({ paused: v.paused, time: v.currentTime })), { paused: true, time: 0 });
  await page.screenshot({ path: '.next/guide-button-top-right.png', fullPage: true });
  console.log('PASS: top-right placement at four widths; Stop, hidden tab, pagehide, and navigation all stop and reset video.');
} finally {
  await browser.close();
}
