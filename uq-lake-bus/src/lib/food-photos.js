// Keep the author's original cover. Try another uploaded photo only if that
// file cannot load; no classification, canvas decoding or image rewriting.
export function foodPhotoUrls(post) {
  return [...new Set([post.imageUrl, ...(post.images || []).map((image) => image.url)]
    .filter((url) => typeof url === 'string' && url.trim()))].slice(0, 3);
}
