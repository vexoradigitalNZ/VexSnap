export type Preset = "small" | "balanced" | "high" | "custom";
export type Rotation = 0 | 90 | 180 | 270;
export type Photo = {
  id: string;
  file: File;
  name: string;
  thumbUrl: string;
  rotation: Rotation;
};
export type Compression = { quality: number; maxDimension: number };

export const presets: Record<Exclude<Preset, "custom">, Compression> = {
  small: { quality: 0.68, maxDimension: 1600 },
  balanced: { quality: 0.82, maxDimension: 2400 },
  high: { quality: 0.9, maxDimension: 3200 },
};

export function compressionFor(
  preset: Preset,
  custom: Compression,
): Compression {
  return preset === "custom"
    ? {
        quality: Math.min(0.95, Math.max(0.4, custom.quality)),
        maxDimension: Math.min(6000, Math.max(640, custom.maxDimension)),
      }
    : presets[preset];
}

export function outputDimensions(
  width: number,
  height: number,
  max: number,
  rotation: Rotation = 0,
) {
  const scale = Math.min(1, max / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  return rotation % 180 === 0
    ? { width: w, height: h }
    : { width: h, height: w };
}

export function sequenceName(index: number, count: number) {
  return `photo-${String(index + 1).padStart(Math.max(3, String(count).length), "0")}.jpg`;
}

export function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type ImageKind = "jpeg" | "png" | "webp" | "heic";
export function detectImage(bytes: Uint8Array): ImageKind | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n))
    return "png";
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (
    ascii(4, 8) === "ftyp" &&
    ["heic", "heix", "hevc", "hevx", "heif", "heis", "mif1", "msf1"].includes(
      ascii(8, 12),
    )
  )
    return "heic";
  return null;
}

export async function validateFile(file: File): Promise<ImageKind> {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const kind = detectImage(bytes);
  if (!kind)
    throw new Error(`${file.name}: unsupported or invalid image format.`);
  return kind;
}

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};
export async function decodeImage(file: Blob): Promise<DecodedImage> {
  // Modern browsers apply EXIF orientation during decode. HTMLImageElement is
  // also a fallback for older Safari and formats its bitmap API cannot read.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      /* Try the image element decoder below. */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => {
        image.src = "";
        URL.revokeObjectURL(url);
      },
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Image decode failed");
  }
}

export async function renderJpeg(
  file: File,
  rotation: Rotation,
  config: Compression,
): Promise<Blob> {
  let bitmap: DecodedImage;
  try {
    bitmap = await decodeImage(file);
  } catch {
    throw new Error(
      `${file.name}: this browser could not read the image. HEIC photos may need conversion to JPEG in your photo library.`,
    );
  }
  try {
    const { width, height } = outputDimensions(
      bitmap.width,
      bitmap.height,
      config.maxDimension,
      rotation,
    );
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx)
      throw new Error(
        `${file.name}: not enough browser memory to process this photo.`,
      );
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    const scale = Math.min(
      1,
      config.maxDimension / Math.max(bitmap.width, bitmap.height),
    );
    const drawW = Math.round(bitmap.width * scale);
    const drawH = Math.round(bitmap.height * scale);
    ctx.drawImage(bitmap.source, -drawW / 2, -drawH / 2, drawW, drawH);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", config.quality),
    );
    canvas.width = 0;
    canvas.height = 0;
    if (!blob || blob.type !== "image/jpeg")
      throw new Error(
        `${file.name}: JPEG compression failed. Try a smaller image size.`,
      );
    return blob;
  } finally {
    bitmap.close();
  }
}

export async function makeThumbnail(file: File): Promise<string> {
  const bitmap = await decodeImage(file);
  try {
    const { width, height } = outputDimensions(
      bitmap.width,
      bitmap.height,
      360,
    );
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Thumbnail creation failed");
    ctx.drawImage(bitmap.source, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.75),
    );
    canvas.width = 0;
    canvas.height = 0;
    if (!blob || blob.type !== "image/jpeg") throw new Error("Thumbnail creation failed");
    return URL.createObjectURL(blob);
  } finally {
    bitmap.close();
  }
}
