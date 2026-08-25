const MAX_EDGE = 1400;
const MAX_SOURCE_BYTES = 18 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 1_500_000;

export async function compressFoodImage(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("Choose an image from your phone.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("This photo is too large. Choose one under 18 MB.");

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This photo format is not supported by this browser. On iPhone, choose a JPEG or use a screenshot.");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await canvasToBlob(canvas, "image/webp", 0.74);
  if (!blob) throw new Error("We could not prepare this photo. Try a different image.");
  if (blob.size > MAX_OUTPUT_BYTES) {
    const smaller = await canvasToBlob(canvas, "image/webp", 0.56);
    if (!smaller || smaller.size > MAX_OUTPUT_BYTES) throw new Error("This photo is still too large after compression.");
    return { blob: smaller, width, height, previewUrl: URL.createObjectURL(smaller) };
  }
  return { blob, width, height, previewUrl: URL.createObjectURL(blob) };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
