"use client";
/* eslint-disable @next/next/no-img-element -- Thumbnails are small browser-created blob URLs and must remain local. */

import { useEffect, useRef, useState } from "react";
import { PhotoCard } from "@/components/PhotoCard";
import { CompressionSettings } from "@/components/CompressionSettings";
import {
  buildPdf,
  firstPageRows,
  layoutGrid,
  pageCount,
  pageSize,
  type Orientation,
  type Paper,
  type PerPage,
} from "@/lib/pdf";
import {
  compressionFor,
  formatBytes,
  makeThumbnail,
  renderJpeg,
  sequenceName,
  validateFile,
  type Compression,
  type Photo,
  type Preset,
  type Rotation,
} from "@/lib/photo";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
function move<T>(items: T[], from: number, to: number) {
  const next = [...items];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [preset, setPreset] = useState<Preset>("balanced");
  const [custom, setCustom] = useState<Compression>({
    quality: 0.82,
    maxDimension: 2400,
  });
  const [perPage, setPerPage] = useState<PerPage>(4);
  const [paper, setPaper] = useState<Paper>("A4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfDescription, setPdfDescription] = useState("");
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [actualSize, setActualSize] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const cache = useRef(new Map<string, Blob>());
  const photoRef = useRef<Photo[]>([]);
  const picker = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dragIndex = useRef<number | null>(null);
  useEffect(() => {
    photoRef.current = photos;
  }, [photos]);
  useEffect(
    () => () => {
      photoRef.current.forEach((photo) => URL.revokeObjectURL(photo.thumbUrl));
    },
    [],
  );
  useEffect(() => {
    if (previewId) dialog.current?.showModal();
    else dialog.current?.close();
  }, [previewId]);

  const config = compressionFor(preset, custom);
  const total = photos.reduce((sum, photo) => sum + photo.file.size, 0);
  const hasPdfText = !!(pdfTitle.trim() || pdfDescription.trim());
  const [previewWidth] = pageSize(paper, orientation);
  const approximateLines = (value: string, points: number) =>
    value ? value.replace(/\r\n?/g, "\n").split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length * points * 0.5 / (previewWidth - 64))), 0) : 0;
  const previewInset = approximateLines(pdfTitle.trim(), 22) * 27 +
    approximateLines(pdfDescription.trim(), 10.5) * 15 +
    (pdfTitle.trim() && pdfDescription.trim() ? 8 : 0) + 22;
  let previewFirstCount: number = perPage;
  if (hasPdfText) {
    try {
      previewFirstCount = firstPageRows(perPage, paper, orientation, previewInset) * layoutGrid(perPage, orientation).columns;
    } catch {
      previewFirstCount = 0;
    }
  }
  const pages = hasPdfText
    ? 1 + pageCount(Math.max(0, photos.length - previewFirstCount), perPage)
    : pageCount(photos.length, perPage);
  const selected = photos.find((photo) => photo.id === previewId);
  function invalidate() {
    cache.current.clear();
    setActualSize(null);
    setPdfBlob(null);
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length || busy) return;
    const failures: string[] = [];
    setBusy(`Adding 0 of ${files.length}…`);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setBusy(`Adding ${i + 1} of ${files.length}…`);
      await new Promise((resolve) => setTimeout(resolve, 0));
      try {
        await validateFile(file);
        const thumbUrl = await makeThumbnail(file);
        setPhotos((previous) => [
          ...previous,
          {
            id: crypto.randomUUID(),
            file,
            name: file.name,
            thumbUrl,
            rotation: 0,
          },
        ]);
      } catch {
        failures.push(
          `${file.name}: unsupported, damaged, or unreadable in this browser. For HEIC, try exporting a JPEG from your photo library.`,
        );
      }
    }
    invalidate();
    setErrors(failures);
    setBusy("");
    if (picker.current) picker.current.value = "";
    if (camera.current) camera.current.value = "";
  }
  function updatePhotos(next: Photo[]) {
    setPhotos(next);
    invalidate();
  }
  function remove(id: string) {
    const photo = photos.find((item) => item.id === id);
    if (photo) URL.revokeObjectURL(photo.thumbUrl);
    if (previewId === id) setPreviewId(null);
    updatePhotos(photos.filter((item) => item.id !== id));
  }
  function rotate(id: string, degrees: number) {
    updatePhotos(
      photos.map((photo) =>
        photo.id === id
          ? {
              ...photo,
              rotation: ((photo.rotation + degrees + 360) % 360) as Rotation,
            }
          : photo,
      ),
    );
  }
  function changePreset(next: Preset) {
    setPreset(next);
    invalidate();
  }
  function changeCustom(next: Compression) {
    setCustom(next);
    invalidate();
  }

  async function compressed(): Promise<Blob[]> {
    const result: Blob[] = [],
      failures: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      setBusy(`Compressing ${i + 1} of ${photos.length}…`);
      await new Promise((resolve) => setTimeout(resolve, 0));
      let blob = cache.current.get(photo.id);
      if (!blob) {
        try {
          blob = await renderJpeg(photo.file, photo.rotation, config);
          cache.current.set(photo.id, blob);
        } catch {
          failures.push(
            `${photo.name}: could not compress this photo. Try a smaller image or convert HEIC to JPEG.`,
          );
          continue;
        }
      }
      result.push(blob);
    }
    if (failures.length) {
      setErrors(failures);
      throw new Error(
        "Some photos could not be processed. Remove or replace the named photos, then try again.",
      );
    }
    setActualSize(result.reduce((sum, blob) => sum + blob.size, 0));
    return result;
  }
  async function run(action: "compress" | "images" | "pdf") {
    if (busy || !photos.length) return;
    setErrors([]);
    setPdfBlob(null);
    try {
      const blobs = await compressed();
      if (action === "images") {
        if (blobs.length === 1) download(blobs[0], sequenceName(0, 1));
        else {
          setBusy("Creating ZIP…");
          const { default: JSZip } = await import("jszip");
          const zip = new JSZip();
          blobs.forEach((blob, i) =>
            zip.file(sequenceName(i, blobs.length), blob),
          );
          download(
            await zip.generateAsync(
              { type: "blob", compression: "STORE" },
              (progress) =>
                setBusy(`Creating ZIP… ${Math.round(progress.percent)}%`),
            ),
            "vexsnap-images.zip",
          );
        }
      }
      if (action === "pdf") {
        setBusy("Creating PDF…");
        const bytes = await buildPdf(
          blobs,
          perPage,
          paper,
          orientation,
          (done) => setBusy(`Creating PDF… ${done} of ${blobs.length}`),
          { title: pdfTitle, description: pdfDescription },
        );
        setPdfBlob(
          new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
        );
      }
    } catch (error) {
      setErrors((previous) => [
        ...previous,
        error instanceof Error
          ? error.message
          : action === "pdf"
            ? "PDF generation failed. Try fewer photos."
            : "Export failed. Try fewer photos.",
      ]);
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <span className="brand-mark" aria-hidden="true">VS</span>
        <span className="brand">Vex<span>Snap</span></span>
        <span className="top-note">A Vexora Digital tool</span>
      </header>
      <section className="hero">
        <div className="eyebrow">SIMPLE PHOTO TOOLS</div>
        <h1>Compress photos.<br /><em>Create PDFs.</em></h1>
        <p>
          Compress photos, download smaller JPEGs, or combine them into a PDF.
        </p>
        <div className="add-actions">
          <button
            className="button primary add-button"
            onClick={() => picker.current?.click()}
            disabled={!!busy}
          >
            <span aria-hidden="true">＋</span> Add Photos
          </button>
          <button
            className="button subtle camera-button"
            onClick={() => camera.current?.click()}
            disabled={!!busy}
          >
            Take a photo
          </button>
        </div>
        <input
          ref={picker}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          multiple
          onChange={(event) => void addFiles(event.target.files)}
          aria-label="Choose photos"
        />
        <input
          ref={camera}
          className="visually-hidden"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => void addFiles(event.target.files)}
          aria-label="Take a photo with camera"
        />
        <p className="privacy">Your photos stay on your device.</p>
      </section>
      {errors.length > 0 && (
        <div className="error-box" role="alert">
          <strong>Something needs attention</strong>
          {errors.map((error, i) => (
            <p key={i}>{error}</p>
          ))}
          <button className="text-button" onClick={() => setErrors([])}>
            Dismiss
          </button>
        </div>
      )}
      {busy && (
        <div className="progress" role="status" aria-live="polite">
          <span className="spinner" />
          {busy}
        </div>
      )}
      {photos.length > 0 && (
        <>
          <section
            className="section collection"
            aria-labelledby="collection-title"
          >
            <div className="section-head">
              <div>
                <div className="eyebrow">01 / YOUR COLLECTION</div>
                <h2 id="collection-title">
                  Your photos <span className="count">{photos.length}</span>
                </h2>
                <p>
                  Drag to reorder, or use the arrows. Your order carries through
                  to every export.
                </p>
              </div>
              <button
                className="text-button remove-all"
                disabled={!!busy}
                onClick={() => {
                  if (window.confirm(`Remove all ${photos.length} photos?`)) {
                    photos.forEach((photo) =>
                      URL.revokeObjectURL(photo.thumbUrl),
                    );
                    updatePhotos([]);
                  }
                }}
              >
                Remove all
              </button>
            </div>
            <div className="photo-grid">
              {photos.map((photo, i) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  index={i}
                  count={photos.length}
                  busy={!!busy}
                  onPreview={() => setPreviewId(photo.id)}
                  onMove={(nextIndex) =>
                    updatePhotos(move(photos, i, nextIndex))
                  }
                  onRotate={(degrees) => rotate(photo.id, degrees)}
                  onRemove={() => remove(photo.id)}
                  onDragStart={() => {
                    dragIndex.current = i;
                  }}
                  onDrop={() => {
                    if (dragIndex.current !== null && dragIndex.current !== i)
                      updatePhotos(move(photos, dragIndex.current, i));
                    dragIndex.current = null;
                  }}
                  onDragEnd={() => {
                    dragIndex.current = null;
                  }}
                />
              ))}
            </div>
            <div className="size-strip">
              <div>
                <span>Original size</span>
                <strong>{formatBytes(total)}</strong>
              </div>
              <div>
                <span>Compressed size</span>
                <strong>
                  {actualSize === null
                    ? "Ready to calculate"
                    : formatBytes(actualSize)}
                </strong>
              </div>
              <div>
                <span>Reduction</span>
                <strong>
                  {actualSize === null
                    ? "—"
                    : `${Math.round((1 - actualSize / total) * 100)}%`}
                </strong>
              </div>
            </div>
          </section>
          <CompressionSettings
            preset={preset}
            custom={custom}
            busy={!!busy}
            actualSize={actualSize}
            onPreset={changePreset}
            onCustom={changeCustom}
            onCalculate={() => void run("compress")}
          />
          <section className="section" aria-labelledby="export-title">
            <div className="eyebrow">03 / TAKE THEM WITH YOU</div>
            <h2 id="export-title">Choose your output</h2>
            <div className="output-grid">
              <div className="output-card">
                <div className="output-icon">↧</div>
                <h3>Compressed images</h3>
                <p>
                  Download smaller JPEG copies of your photos. Multiple photos
                  come in one ZIP file.
                </p>
                <button
                  className="button primary full"
                  disabled={!!busy}
                  onClick={() => void run("images")}
                >
                  Export Images <span>↗</span>
                </button>
              </div>
              <div className="output-card pdf-card">
                <div className="output-icon">▤</div>
                <h3>One neat PDF</h3>
                <p>Combine your photos into a document, in the order above.</p>
                <div className="pdf-settings">
                  <div className="pdf-text-settings">
                    <h4>PDF Title &amp; Description</h4>
                    <label htmlFor="pdf-title">Document Title <span>(optional)</span></label>
                    <input
                      id="pdf-title"
                      type="text"
                      placeholder="Enter a title for your PDF"
                      value={pdfTitle}
                      disabled={!!busy}
                      onChange={(event) => {
                        setPdfTitle(event.target.value);
                        setPdfBlob(null);
                      }}
                    />
                    <label htmlFor="pdf-description">Description / Notes <span>(optional)</span></label>
                    <textarea
                      id="pdf-description"
                      rows={3}
                      placeholder="Add a short description or notes about these images..."
                      value={pdfDescription}
                      disabled={!!busy}
                      onChange={(event) => {
                        setPdfDescription(event.target.value);
                        setPdfBlob(null);
                      }}
                    />
                  </div>
                  <fieldset>
                    <legend>Images per page</legend>
                    <div className="segmented">
                      {([1, 2, 4, 6, 8] as PerPage[]).map((value) => (
                        <button
                          key={value}
                          className={perPage === value ? "active" : ""}
                          aria-pressed={perPage === value}
                          onClick={() => {
                            setPerPage(value);
                            setPdfBlob(null);
                          }}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="select-row">
                    <label>
                      Paper
                      <select
                        value={paper}
                        onChange={(event) => {
                          setPaper(event.target.value as Paper);
                          setPdfBlob(null);
                        }}
                      >
                        <option>A4</option>
                        <option>Letter</option>
                      </select>
                    </label>
                    <label>
                      Orientation
                      <select
                        value={orientation}
                        onChange={(event) => {
                          setOrientation(event.target.value as Orientation);
                          setPdfBlob(null);
                        }}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div className="pdf-preview">
                  <div className={`paper-preview ${orientation}`}>
                    {hasPdfText && (
                      <div className="preview-page-text" aria-hidden="true">
                        {pdfTitle.trim() && <b>{pdfTitle.trim()}</b>}
                        {pdfDescription.trim() && <span>{pdfDescription.trim()}</span>}
                      </div>
                    )}
                    <div
                      className="preview-grid"
                      style={{
                        gridTemplateColumns: `repeat(${layoutGrid(perPage, orientation).columns}, 1fr)`,
                        gridTemplateRows: `repeat(${Math.max(1, previewFirstCount / layoutGrid(perPage, orientation).columns)}, 1fr)`,
                      }}
                    >
                      {Array.from({ length: Math.min(perPage, previewFirstCount) }, (_, i) => (
                        <span key={i}>
                          {photos[i] ? (
                            <img
                              src={photos[i].thumbUrl}
                              alt=""
                              style={{
                                transform: `rotate(${photos[i].rotation}deg)`,
                              }}
                            />
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <strong>
                      {hasPdfText ? "About " : ""}{pages} {pages === 1 ? "page" : "pages"}
                    </strong>
                    <span>
                      {photos.length} photos · {perPage} per page
                      <br />
                      {paper} · {orientation}
                    </span>
                    {hasPdfText && (
                      <div className="preview-copy">
                        {pdfTitle.trim() && <b>{pdfTitle.trim()}</b>}
                        {pdfDescription.trim() && <span>{pdfDescription.trim()}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  className="button primary full"
                  disabled={!!busy}
                  onClick={() => void run("pdf")}
                >
                  Create PDF <span>↗</span>
                </button>
                {pdfBlob && (
                  <button
                    className="button secondary full download-pdf"
                    onClick={() =>
                      download(
                        pdfBlob,
                        `vexsnap-${new Date().toISOString().slice(0, 10)}.pdf`,
                      )
                    }
                  >
                    Download PDF ↓
                  </button>
                )}
              </div>
            </div>
          </section>
        </>
      )}
      <footer>
        <span className="footer-brand">Vex<span>Snap</span></span>
        <small>A Vexora Digital tool</small>
      </footer>
      <dialog
        ref={dialog}
        className="preview-dialog"
        onClose={() => setPreviewId(null)}
        aria-label={selected ? `Preview ${selected.name}` : "Photo preview"}
      >
        {selected && (
          <>
            <div className="dialog-head">
              <strong title={selected.name}>{selected.name}</strong>
              <button
                onClick={() => setPreviewId(null)}
                aria-label="Close preview"
              >
                ×
              </button>
            </div>
            <img
              src={selected.thumbUrl}
              alt={selected.name}
              style={{ transform: `rotate(${selected.rotation}deg)` }}
            />
            <div className="dialog-foot">
              {formatBytes(selected.file.size)} · Rotation {selected.rotation}°
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
