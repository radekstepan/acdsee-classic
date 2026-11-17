/** Canvas-based image convert/resize (no native dependencies). */

export type ConvertFormat = "JPEG" | "PNG" | "WEBP";

export const CONVERT_FORMATS: { id: ConvertFormat; label: string; ext: string; mime: string }[] = [
  { id: "JPEG", label: "JPEG (JPG)", ext: "jpg", mime: "image/jpeg" },
  { id: "PNG", label: "PNG Image", ext: "png", mime: "image/png" },
  { id: "WEBP", label: "WebP Image", ext: "webp", mime: "image/webp" }
];

export function formatInfo(format: string): { ext: string; mime: string } {
  const found = CONVERT_FORMATS.find((f) => f.id === format);
  return found ?? { ext: "jpg", mime: "image/jpeg" };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode the image."));
    img.src = src;
  });
}

function drawToDataUrl(
  img: HTMLImageElement,
  width: number,
  height: number,
  mime: string,
  quality: number
): string {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable.");
  // JPEG has no alpha: paint the classic white matte first.
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL(mime, quality);
  if (!dataUrl.startsWith("data:")) throw new Error("Encoding failed.");
  return dataUrl;
}

/** Re-encode an image URL into the requested format. Quality is 0..1. */
export async function convertImage(
  src: string,
  format: string,
  qualityPercent: number
): Promise<{ dataUrl: string; ext: string }> {
  const { ext, mime } = formatInfo(format);
  const img = await loadImage(src);
  const quality = Math.min(1, Math.max(0.1, qualityPercent / 100));
  return { dataUrl: drawToDataUrl(img, img.naturalWidth, img.naturalHeight, mime, quality), ext };
}

/** Resize an image URL to exact pixel dimensions, keeping its encoding kind. */
export async function resizeImage(
  src: string,
  width: number,
  height: number,
  mime: string
): Promise<string> {
  const img = await loadImage(src);
  return drawToDataUrl(img, width, height, mime, 0.92);
}

export function mimeForFileName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".bmp")) return "image/bmp";
  return "image/jpeg";
}
