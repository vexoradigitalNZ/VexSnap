import assert from "node:assert/strict";
import test from "node:test";
import {
  cells,
  fitWithin,
  layoutGrid,
  pageCount,
  pageSize,
  type PerPage,
} from "../src/lib/pdf";
import {
  compressionFor,
  detectImage,
  outputDimensions,
  sequenceName,
} from "../src/lib/photo";

test("page counts round up", () => {
  assert.equal(pageCount(17, 4), 5);
  assert.equal(pageCount(8, 8), 1);
  assert.equal(pageCount(0, 2), 0);
});
test("all PDF layouts fit page with sensible grids", () => {
  for (const perPage of [1, 2, 4, 6, 8] as PerPage[]) {
    for (const orientation of ["portrait", "landscape"] as const) {
      const grid = layoutGrid(perPage, orientation);
      assert.equal(grid.columns * grid.rows, perPage);
      const [w, h] = pageSize("A4", orientation);
      const slots = cells(perPage, "A4", orientation);
      assert.equal(slots.length, perPage);
      slots.forEach((slot) => {
        assert.ok(slot.x >= 0 && slot.y >= 0);
        assert.ok(slot.x + slot.width <= w);
        assert.ok(slot.y + slot.height <= h);
      });
    }
  }
  assert.deepEqual(layoutGrid(6, "portrait"), { columns: 2, rows: 3 });
  assert.deepEqual(layoutGrid(8, "landscape"), { columns: 4, rows: 2 });
});
test("filenames follow collection order and pad", () => {
  assert.equal(sequenceName(0, 2), "photo-001.jpg");
  assert.equal(sequenceName(11, 12), "photo-012.jpg");
  assert.equal(sequenceName(999, 1000), "photo-1000.jpg");
});
test("compression presets and custom boundaries", () => {
  assert.deepEqual(
    compressionFor("balanced", { quality: 0.5, maxDimension: 800 }),
    { quality: 0.82, maxDimension: 2400 },
  );
  assert.deepEqual(
    compressionFor("custom", { quality: 1, maxDimension: 9000 }),
    { quality: 0.95, maxDimension: 6000 },
  );
});
test("file signatures identify only supported image containers", () => {
  assert.equal(
    detectImage(new Uint8Array([255, 216, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
    "jpeg",
  );
  assert.equal(
    detectImage(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])),
    "png",
  );
  assert.equal(
    detectImage(new Uint8Array(Buffer.from("RIFF1234WEBP"))),
    "webp",
  );
  assert.equal(
    detectImage(new Uint8Array(Buffer.from("1234ftypheic"))),
    "heic",
  );
  assert.equal(detectImage(new Uint8Array(Buffer.from("hello world!"))), null);
});
test("image fit keeps aspect ratio and never enlarges", () => {
  assert.deepEqual(outputDimensions(4000, 3000, 2400), {
    width: 2400,
    height: 1800,
  });
  assert.deepEqual(outputDimensions(4000, 3000, 2400, 90), {
    width: 1800,
    height: 2400,
  });
  assert.deepEqual(outputDimensions(800, 600, 2400), {
    width: 800,
    height: 600,
  });
  assert.deepEqual(fitWithin(4000, 2000, 100, 100), { width: 100, height: 50 });
});
