// Small, display-only black-border cleanup. Never changes the stored photo,
// chooses another cover, or hides the original while processing it.
const results = new Map();
const pending = new Map();
const queue = [];
let running = 0;

export function trimFoodPhotoBlackBars(url, maxEdge = 1200) {
  if (!url || /^(data|blob):/.test(url)) return Promise.resolve(url);
  const key = `${maxEdge}:${url}`;
  if (results.has(key)) return Promise.resolve(results.get(key));
  if (pending.has(key)) return pending.get(key);
  const promise = new Promise((resolve) => queue.push({ key, url, maxEdge, resolve }));
  pending.set(key, promise);
  drain();
  return promise;
}

function drain() {
  while (running < 2 && queue.length) {
    const job = queue.shift();
    running++;
    trim(job.url, job.maxEdge).catch(() => job.url).then((url) => {
      results.set(job.key, url);
      while (results.size > 96) results.delete(results.keys().next().value);
      pending.delete(job.key);
      job.resolve(url);
    }).finally(() => { running--; drain(); });
  }
}

async function decode(blob) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); }
    catch { /* Safari fallback below. */ }
  }
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = objectUrl;
    });
    return image;
  } finally { URL.revokeObjectURL(objectUrl); }
}

async function trim(url, maxEdge) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  let image;
  try {
    // Pixel analysis is supplemental. Reload avoids cached no-Origin responses;
    // the visible image remains a normal, non-CORS-dependent <img>.
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'reload', signal: controller.signal });
    if (!response.ok) return url;
    const blob = await response.blob();
    if (blob.size > 1_500_000) return url;
    image = await decode(blob);
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    if (!imageWidth || !imageHeight) return url;
    const scale = Math.min(1, 220 / Math.max(imageWidth, imageHeight));
    const width = Math.max(1, Math.round(imageWidth * scale));
    const height = Math.max(1, Math.round(imageHeight * scale));
    const sample = document.createElement('canvas');
    sample.width = width;
    sample.height = height;
    const context = sample.getContext('2d', { willReadFrequently: true });
    if (!context) return url;
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const black = (x, y) => {
      const i = (y * width + x) * 4;
      return pixels[i] < 13 && pixels[i + 1] < 13 && pixels[i + 2] < 13 && pixels[i + 3] > 220;
    };
    const row = (y) => {
      let count = 0;
      for (let x = 0; x < width; x++) if (black(x, y)) count++;
      return count / width > 0.985;
    };
    const column = (x) => {
      let count = 0;
      for (let y = 0; y < height; y++) if (black(x, y)) count++;
      return count / height > 0.985;
    };
    const scan = (length, at) => {
      let count = 0;
      while (count < length * 0.7 && at(count)) count++;
      return count;
    };
    const top = scan(height, row);
    const bottom = scan(height, (i) => row(height - 1 - i));
    const left = scan(width, column);
    const right = scan(width, (i) => column(width - 1 - i));
    // Only substantial, nearly solid edge bands qualify; avoid cropping shadows.
    if (top + bottom < height * 0.06 && left + right < width * 0.06) return url;
    const cropWidth = (width - left - right) / width * imageWidth;
    const cropHeight = (height - top - bottom) / height * imageHeight;
    if (cropWidth < imageWidth * 0.45 || cropHeight < imageHeight * 0.3) return url;
    const output = document.createElement('canvas');
    const outputScale = Math.min(1, maxEdge / Math.max(cropWidth, cropHeight));
    output.width = Math.max(1, Math.round(cropWidth * outputScale));
    output.height = Math.max(1, Math.round(cropHeight * outputScale));
    const outputContext = output.getContext('2d', { alpha: false });
    if (!outputContext) return url;
    outputContext.drawImage(image, left / width * imageWidth, top / height * imageHeight,
      cropWidth, cropHeight, 0, 0, output.width, output.height);
    return output.toDataURL('image/jpeg', maxEdge > 256 ? 0.92 : 0.85);
  } finally {
    clearTimeout(timeout);
    image?.close?.();
  }
}
