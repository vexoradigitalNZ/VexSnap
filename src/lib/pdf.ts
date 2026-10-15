import type { PDFDocument, PDFFont } from "pdf-lib";

export type PerPage = 1 | 2 | 4 | 6 | 8;
export type Paper = "A4" | "Letter";
export type Orientation = "portrait" | "landscape";
export const pageCount = (photos: number, perPage: PerPage) =>
  Math.ceil(photos / perPage);

export type PdfText = { title: string; description: string };

const margin = 32;
const gap = 14;
const titleSize = 22;
const descriptionSize = 10.5;
const titleLineHeight = 27;
const descriptionLineHeight = 15;

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
  topInset = 0,
  visibleRows = layoutGrid(perPage, orientation).rows,
) {
  const [pageWidth, pageHeight] = pageSize(paper, orientation);
  const { columns } = layoutGrid(perPage, orientation);
  const width = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
  const height =
    (pageHeight - margin * 2 - topInset - gap * (visibleRows - 1)) /
    visibleRows;
  return Array.from({ length: columns * visibleRows }, (_, i) => ({
    x: margin + (i % columns) * (width + gap),
    y:
      pageHeight -
      margin -
      topInset -
      (Math.floor(i / columns) + 1) * height -
      Math.floor(i / columns) * gap,
    width,
    height,
  }));
}

export function firstPageRows(
  perPage: PerPage,
  paper: Paper,
  orientation: Orientation,
  topInset: number,
) {
  const { rows } = layoutGrid(perPage, orientation);
  const originalHeight = cells(perPage, paper, orientation)[0].height;
  const [, pageHeight] = pageSize(paper, orientation);
  const available = pageHeight - margin * 2 - topInset;
  if (available < 90)
    throw new Error(
      "The PDF title and description are too long to leave room for photos. Shorten the text and try again.",
    );
  const minimumHeight = Math.max(90, originalHeight * 0.72);
  // Keep a row only while its photo slots remain comfortably readable.
  return Math.min(
    rows,
    Math.max(1, Math.floor((available + gap) / (minimumHeight + gap))),
  );
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.trim().split(/\s+/u)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const character of word) {
        if (line && font.widthOfTextAtSize(line + character, size) > maxWidth) {
          lines.push(line);
          line = "";
        }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines;
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
  text: PdfText = { title: "", description: "" },
): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const doc: PDFDocument = await PDFDocument.create();
  const slots = cells(perPage, paper, orientation);
  const [width, height] = pageSize(paper, orientation);
  const title = text.title.trim();
  const description = text.description.trim();
  let firstSlots = slots;
  if (title || description) {
    const { default: fontkit } = await import("@pdf-lib/fontkit");
    doc.registerFontkit(fontkit);
    const [regularBytes, semiboldBytes] = await Promise.all([
      fetch("/fonts/noto-sans-regular.ttf").then((response) => response.arrayBuffer()),
      fetch("/fonts/noto-sans-semibold.ttf").then((response) => response.arrayBuffer()),
    ]);
    const regular = await doc.embedFont(regularBytes, { subset: true });
    const semibold = await doc.embedFont(semiboldBytes, { subset: true });
    const textWidth = width - margin * 2;
    const titleLines = title
      ? wrapText(title, semibold, titleSize, textWidth)
      : [];
    const descriptionLines = description
      ? wrapText(description, regular, descriptionSize, textWidth)
      : [];
    const titleHeight = titleLines.length * titleLineHeight;
    const descriptionHeight = descriptionLines.length * descriptionLineHeight;
    const topInset =
      titleHeight + descriptionHeight + (title && description ? 8 : 0) + 22;
    const rows = firstPageRows(perPage, paper, orientation, topInset);
    firstSlots = cells(perPage, paper, orientation, topInset, rows);
    const first = doc.addPage([width, height]);
    let y = height - margin - titleSize;
    for (const line of titleLines) {
      first.drawText(line, {
        x: margin,
        y,
        size: titleSize,
        font: semibold,
        color: rgb(23 / 255, 50 / 255, 77 / 255),
      });
      y -= titleLineHeight;
    }
    if (title && description) y -= 8;
    if (!title) y = height - margin - descriptionSize;
    for (const line of descriptionLines) {
      if (line)
        first.drawText(line, {
          x: margin,
          y,
          size: descriptionSize,
          font: regular,
          color: rgb(66 / 255, 73 / 255, 75 / 255),
        });
      y -= descriptionLineHeight;
    }
  }
  const firstCount = firstSlots.length;
  for (let i = 0; i < blobs.length; i++) {
    const laterIndex = i - firstCount;
    if (i === 0 && doc.getPageCount() === 0) doc.addPage([width, height]);
    else if (laterIndex >= 0 && laterIndex % perPage === 0)
      doc.addPage([width, height]);
    const page = doc.getPages()[doc.getPageCount() - 1];
    const image = await doc.embedJpg(await blobs[i].arrayBuffer());
    const slot = i < firstCount ? firstSlots[i] : slots[laterIndex % perPage];
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
