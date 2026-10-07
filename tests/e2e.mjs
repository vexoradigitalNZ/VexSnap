import assert from "node:assert/strict";
import { chromium } from "playwright";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  acceptDownloads: true,
  viewport: { width: 390, height: 844 },
});
try {
  await page.goto(process.env.VEXSNAP_TEST_URL ?? "http://localhost:3100");
  assert.equal(await page.title(), "VexSnap — Compress photos. Create PDFs.");
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1800;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 1800, 1200);
    gradient.addColorStop(0, "#bb3158");
    gradient.addColorStop(0.5, "#478cbd");
    gradient.addColorStop(1, "#fad983");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1800, 1200);
    for (let i = 0; i < 1000; i++) {
      ctx.fillStyle = `hsl(${i % 360} 65% 65%)`;
      ctx.fillRect((i * 71) % 1800, (i * 127) % 1200, 8, 8);
    }
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const buffer = Buffer.from(png, "base64");
  await page
    .locator('input[aria-label="Choose photos"]')
    .setInputFiles(
      ["first", "second", "third", "fourth"].map((name) => ({
        name: `${name}.png`,
        mimeType: "image/png",
        buffer,
      })),
    );
  await page.locator(".photo-card").nth(3).waitFor();
  await page
    .locator(".photo-card")
    .first()
    .getByRole("button", { name: /Move .* later/ })
    .click();
  assert.match(
    await page.locator(".photo-card").first().locator(".file-name").innerText(),
    /second/,
  );
  await page
    .locator(".photo-card")
    .first()
    .getByRole("button", { name: /Rotate .* right/ })
    .click();
  await page
    .locator(".photo-card")
    .last()
    .getByRole("button", { name: /Remove/ })
    .click();
  assert.equal(await page.locator(".photo-card").count(), 3);
  await page.getByRole("button", { name: "Calculate compressed size" }).click();
  await page.getByText("Compressed size", { exact: true }).waitFor();
  await page.waitForFunction(() =>
    document.querySelector(".size-strip")?.textContent?.includes("%"),
  );
  const sizeText = await page.locator(".size-strip").innerText();
  assert.match(sizeText, /Reduction/);
  assert.ok(Number.parseInt(await page.locator(".size-strip strong").nth(2).innerText()) > 0);
  const imageDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export Images/ }).click();
  const zipDownload = await imageDownload;
  assert.equal(zipDownload.suggestedFilename(), "vexsnap-images.zip");
  const zip = await JSZip.loadAsync(
    await (await import("node:fs/promises")).readFile(await zipDownload.path()),
  );
  assert.deepEqual(Object.keys(zip.files).sort(), [
    "photo-001.jpg",
    "photo-002.jpg",
    "photo-003.jpg",
  ]);
  const firstJpeg = await zip.file("photo-001.jpg").async("nodebuffer");
  assert.equal(firstJpeg[0], 255);
  assert.equal(firstJpeg[1], 216);
  const firstDimensions = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/jpeg" }));
    const result = [bitmap.width, bitmap.height];
    bitmap.close();
    return result;
  }, firstJpeg.toString("base64"));
  assert.deepEqual(firstDimensions, [1200, 1800]);
  for (const perPage of [1, 2, 4, 6, 8]) {
    await page
      .getByRole("button", { name: String(perPage), exact: true })
      .click();
    await page.getByRole("button", { name: /Create PDF/ }).click();
    const button = page.getByRole("button", { name: /Download PDF/ });
    await button.waitFor();
    const event = page.waitForEvent("download");
    await button.click();
    const pdfDownload = await event;
    assert.match(pdfDownload.suggestedFilename(), /^vexsnap-\d{4}-\d{2}-\d{2}\.pdf$/);
    const pdf = await PDFDocument.load(
      await (
        await import("node:fs/promises")
      ).readFile(await pdfDownload.path()),
    );
    assert.equal(pdf.getPageCount(), Math.ceil(3 / perPage));
    assert.ok(pdf.getPage(0).getHeight() > pdf.getPage(0).getWidth());
  }
  await page.getByLabel("Orientation").selectOption("landscape");
  await page.getByRole("button", { name: /Create PDF/ }).click();
  await page.getByRole("button", { name: /Download PDF/ }).waitFor();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download PDF/ }).click();
  const landscapePdf = await PDFDocument.load(
    await (
      await import("node:fs/promises")
    ).readFile(await (await event).path()),
  );
  assert.ok(
    landscapePdf.getPage(0).getWidth() > landscapePdf.getPage(0).getHeight(),
  );
  for (const width of [320, 390, 768, 1280, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `overflow at ${width}px`,
    );
  }
  await page
    .locator('input[aria-label="Choose photos"]')
    .setInputFiles(
      Array.from({ length: 14 }, (_, i) => ({
        name: `extra-${i}.png`,
        mimeType: "image/png",
        buffer,
      })),
    );
  await page.locator(".photo-card").nth(16).waitFor();
  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: /Create PDF/ }).click();
  await page.getByRole("button", { name: /Download PDF/ }).waitFor();
  const largeEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download PDF/ }).click();
  const largePdf = await PDFDocument.load(
    await (
      await import("node:fs/promises")
    ).readFile(await (await largeEvent).path()),
  );
  assert.equal(largePdf.getPageCount(), 5);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove all" }).click();
  await page
    .locator('input[aria-label="Choose photos"]')
    .setInputFiles({ name: "only.png", mimeType: "image/png", buffer });
  await page.locator(".photo-card").first().waitFor();
  const singleEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export Images/ }).click();
  assert.equal((await singleEvent).suggestedFilename(), "photo-001.jpg");
  await page
    .locator('input[aria-label="Choose photos"]')
    .setInputFiles({
      name: "bad.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("not an image"),
    });
  await page.locator(".error-box").waitFor();
  assert.match(await page.locator(".error-box").innerText(), /bad.jpg/);
  console.log(
    "E2E PASS: import, reorder, rotate, remove, compress, direct JPEG, ZIP, five PDF layouts, 17-photo page count, landscape, corrupt file, responsive widths",
  );
} finally {
  await browser.close();
}
