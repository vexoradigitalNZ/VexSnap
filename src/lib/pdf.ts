import type { PDFDocument } from "pdf-lib";

export type PerPage = 1 | 2 | 4 | 6 | 8;
export type Paper = "A4" | "Letter";
export type Orientation = "portrait" | "landscape";
export const pageCount = (photos: number, perPage: PerPage) =>
  Math.ceil(photos / perPage);

export function pageSize(
  paper: Paper,
  orientation: Orientation,
): [number, number] {
  const [w, h] = paper === "A4" ? [595.28, 841.89] : [612, 792];
  return orientation === "portrait" ? [w, h] : [h, w];
}

export function layoutGrid(
  perPage: PerPage,
  orientation: Orientation,
): { columns: number; rows: number } {
  if (perPage === 1) return { columns: 1, rows: 1 };
  if (perPage === 2)
    return orientation === "portrait"
      ? { columns: 1, rows: 2 }
      : { columns: 2, rows: 1 };
  if (perPage === 4) return { columns: 2, rows: 2 };
  if (perPage === 6)
    return orientation === "portrait"
      ? { columns: 2, rows: 3 }
      : { columns: 3, rows: 2 };
  return orientation === "portrait"
    ? { columns: 2, rows: 4 }
    : { columns: 4, rows: 2 };
}

export function cells(
  perPage: PerPage,
  paper: Paper,
  orientation: Orientation,
) {
  const [pageWidth, pageHeight] = pageSize(paper, orientation);
  const { columns, rows } = layoutGrid(perPage, orientation);
  const margin = 32,
    gap = 14;
  const width = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
  const height = (pageHeight - margin * 2 - gap * (rows - 1)) / rows;
  return Array.from({ length: perPage }, (_, i) => ({
    x: margin + (i % columns) * (width + gap),
    y:
      pageHeight -
      margin -
      (Math.floor(i / columns) + 1) * height -
      Math.floor(i / columns) * gap,
    width,
    height,
  }));
}

export function fitWithin(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  const scale = Math.min(
    targetWidth / sourceWidth,
    targetHeight / sourceHeight,
  );
  return { width: sourceWidth * scale, height: sourceHeight * scale };
}

export async function buildPdf(
  blobs: Blob[],
  perPage: PerPage,
  paper: Paper,
  orientation: Orientation,
  onProgress: (done: number) => void,
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const doc: PDFDocument = await PDFDocument.create();
  const slots = cells(perPage, paper, orientation);
  const [width, height] = pageSize(paper, orientation);
  for (let i = 0; i < blobs.length; i++) {
    if (i % perPage === 0) doc.addPage([width, height]);
    const page = doc.getPages()[doc.getPageCount() - 1];
    const image = await doc.embedJpg(await blobs[i].arrayBuffer());
    const slot = slots[i % perPage];
    const fit = fitWithin(image.width, image.height, slot.width, slot.height);
    page.drawImage(image, {
      x: slot.x + (slot.width - fit.width) / 2,
      y: slot.y + (slot.height - fit.height) / 2,
      width: fit.width,
      height: fit.height,
    });
    onProgress(i + 1);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return doc.save();
}
