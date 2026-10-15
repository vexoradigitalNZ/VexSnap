import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PDFDict, PDFDocument, PDFName } from "pdf-lib";
import { buildPdf, type PdfText } from "../src/lib/pdf";

const fontFiles = {
  "/fonts/noto-sans-regular.ttf": "public/fonts/noto-sans-regular.ttf",
  "/fonts/noto-sans-semibold.ttf": "public/fonts/noto-sans-semibold.ttf",
};

function resourceCount(doc: PDFDocument, pageIndex: number, name: string) {
  const resources = doc.getPage(pageIndex).node.Resources();
  return resources?.lookup(PDFName.of(name), PDFDict).keys().length ?? 0;
}

test("five photos keep their order while first-page text changes available image rows", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const file = fontFiles[String(input) as keyof typeof fontFiles];
    if (!file) throw new Error(`Unexpected font request: ${input}`);
    return new Response(await readFile(file));
  };
  try {
    const jpeg = await readFile("tests/fixtures/photo.jpg");
    const photos = Array.from({ length: 5 }, () => new Blob([jpeg], { type: "image/jpeg" }));
    const cases: Array<{ text: PdfText; firstImages: number }> = [
      { text: { title: "", description: "" }, firstImages: 4 },
      { text: { title: "Furniture & Artwork Inventory — café", description: "" }, firstImages: 4 },
      { text: { title: "", description: "Careful handling.\n\nKeep upright." }, firstImages: 4 },
      { text: { title: "Furniture & Artwork Inventory", description: "Careful handling.\nKeep upright." }, firstImages: 4 },
      { text: { title: "Updated inventory", description: "A long note. ".repeat(170) }, firstImages: 2 },
    ];
    for (const { text, firstImages } of cases) {
      const progress: number[] = [];
      const bytes = await buildPdf(photos, 4, "A4", "portrait", (done) => progress.push(done), text);
      const doc = await PDFDocument.load(bytes);
      assert.equal(doc.getPageCount(), 2);
      assert.equal(resourceCount(doc, 0, "XObject"), firstImages);
      assert.equal(resourceCount(doc, 1, "XObject"), 5 - firstImages);
      assert.equal(resourceCount(doc, 0, "Font") > 0, !!(text.title || text.description));
      assert.deepEqual(progress, [1, 2, 3, 4, 5]);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
