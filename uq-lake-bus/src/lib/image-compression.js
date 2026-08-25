const MAX_EDGE = 1200;
const MAX_SOURCE_BYTES = 18 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 600_000;
const ACCEPTED_FILE_PATTERN = /\.(?:jpe?g|png|webp|heic|heif)$/i;

export async function readFoodPhotoLocation(file) {
  if (!file) return null;
  try {
    const { default: exifr } = await import("exifr");
    const gps = await exifr.gps(file);
    const latitude = Number(gps?.latitude);
    const longitude = Number(gps?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
    return { latitude, longitude };
  } catch {
    // Photos shared by iOS and social apps often have location metadata removed.
    return null;
  }
}

export async function compressFoodImage(file) {
  if (!file || (!file.type?.startsWith("image/") && !ACCEPTED_FILE_PATTERN.test(file.name || ""))) {
    throw new Error("Choose a photo from your phone.");
  }
  if (file.size > MAX_SOURCE_BYTES) throw new Error("This photo is too large. Choose one under 18 MB.");

  let source;
  try {
    source = await decodeImage(file);
  } catch {
    throw new Error("This photo could not be opened. On iPhone, try a screenshot or choose Most Compatible in Camera settings.");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    source.close();
    throw new Error("This browser could not prepare the photo. Try a screenshot instead.");
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(source.element, 0, 0, width, height);
  source.close();

  const encoded = await encodeUnderLimit(canvas);
  canvas.width = 1;
  canvas.height = 1;
  return { ...encoded, previewUrl: URL.createObjectURL(encoded.blob) };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { element: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close?.() };
    } catch {
      // Safari can expose createImageBitmap but still reject HEIC or large camera photos.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Empty image");
    return {
      element: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function encodeUnderLimit(canvas) {
  const attempts = [["image/webp", 0.68], ["image/webp", 0.54], ["image/jpeg", 0.64], ["image/jpeg", 0.48]];
  const sizes = [1, 0.86, 0.72, 0.58];
  let smallest = null;
  for (const size of sizes) {
    const working = size === 1 ? canvas : resizeCanvas(canvas, size);
    for (const [type, quality] of attempts) {
      const blob = await canvasToBlob(working, type, quality);
      if (!blob) continue;
      if (!smallest || blob.size < smallest.blob.size) smallest = { blob, width: working.width, height: working.height };
      if (blob.size <= MAX_OUTPUT_BYTES) {
        const result = { blob, width: working.width, height: working.height };
        if (working !== canvas) { working.width = 1; working.height = 1; }
        return result;
      }
    }
    if (working !== canvas) { working.width = 1; working.height = 1; }
  }
  if (smallest) throw new Error("This photo is still too large after compression. Try cropping it or use a screenshot.");
  throw new Error("We could not prepare this photo. Try a JPEG or screenshot instead.");
}

function resizeCanvas(source, scale) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return source;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}
