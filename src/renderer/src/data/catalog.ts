/** Image format metadata used by the browser, menus and dialogs. */

export interface FormatInfo {
  ext: string;
  type: string;
  short: string;
  bpp: number;
  color: string;
}

export const FORMATS: Record<string, FormatInfo> = {
  jpg: { ext: "jpg", type: "JPEG Image", short: "JPEG", bpp: 24, color: "#c03030" },
  jpeg: { ext: "jpeg", type: "JPEG Image", short: "JPEG", bpp: 24, color: "#c03030" },
  gif: { ext: "gif", type: "GIF Image", short: "GIF", bpp: 8, color: "#2060c0" },
  bmp: { ext: "bmp", type: "Bitmap Image", short: "BMP", bpp: 24, color: "#208020" },
  png: { ext: "png", type: "PNG Image", short: "PNG", bpp: 24, color: "#8030a0" },
  tif: { ext: "tif", type: "TIFF Image", short: "TIFF", bpp: 24, color: "#c07010" },
  tiff: { ext: "tiff", type: "TIFF Image", short: "TIFF", bpp: 24, color: "#c07010" },
  webp: { ext: "webp", type: "WebP Image", short: "WEBP", bpp: 24, color: "#307080" },
  svg: { ext: "svg", type: "SVG Image", short: "SVG", bpp: 24, color: "#606060" },
  avif: { ext: "avif", type: "AVIF Image", short: "AVIF", bpp: 24, color: "#7050a0" },
  heic: { ext: "heic", type: "HEIC Image", short: "HEIC", bpp: 24, color: "#405090" },
  heif: { ext: "heif", type: "HEIF Image", short: "HEIF", bpp: 24, color: "#405090" }
};

/** Filter/list order shown in the Address bar and Options dialog. */
export const FORMAT_LIST: FormatInfo[] = [
  FORMATS.jpg,
  FORMATS.gif,
  FORMATS.bmp,
  FORMATS.png,
  FORMATS.tif,
  FORMATS.webp,
  FORMATS.svg,
  FORMATS.avif,
  FORMATS.heic
];

/** Canvas can only encode these in the renderer without native code. */
export const CONVERT_FORMATS: { ext: string; label: string; format: string }[] = [
  { ext: "jpg", label: "JPEG (JPG)", format: "JPEG" },
  { ext: "png", label: "PNG Image", format: "PNG" },
  { ext: "webp", label: "WebP Image", format: "WEBP" }
];

export const formatFor = (ext: string): FormatInfo =>
  FORMATS[ext.toLowerCase()] ?? {
    ext: ext.toLowerCase(),
    type: `${ext.toUpperCase()} Image`,
    short: ext.toUpperCase(),
    bpp: 24,
    color: "#808080"
  };

export const defaultFormats = (): Record<string, boolean> =>
  Object.fromEntries(Object.keys(FORMATS).map((ext) => [ext, true]));

/** Bundled demo photos (browser/demo mode has no filesystem). */
export const DEMO_PHOTO_FILES = [
  "10044373",
  "10873296",
  "11143817",
  "11351028",
  "11439335",
  "11667359",
  "12080620",
  "13894051",
  "14309274",
  "1437601",
  "18500759",
  "19779565",
  "26795218",
  "27353932",
  "27454892",
  "30323953",
  "32345615",
  "32762927",
  "33544535",
  "34632989",
  "35142333",
  "358345",
  "36713391",
  "36790029",
  "37511454",
  "37568054",
  "37871412",
  "37969727",
  "39813049",
  "40090812",
  "40133180",
  "40266327",
  "4127415",
  "4364610",
  "4555326",
  "4555327",
  "5823136",
  "6794882",
  "697244",
  "7372261",
  "8208689",
  "8914027",
  "9282736"
];

export const demoPhotoUrl = (index: number): string => {
  const name = DEMO_PHOTO_FILES[index % DEMO_PHOTO_FILES.length];
  return `photos/${name}.jpg`;
};
