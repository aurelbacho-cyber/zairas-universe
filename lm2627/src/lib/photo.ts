/**
 * Photos are stored inline in the season data, so they are downscaled hard
 * before saving — a season of full-resolution phone photos would make the
 * export file unusable.
 */
const MAX_EDGE = 1024;
const QUALITY = 0.72;

export async function readPhoto(file: File): Promise<string> {
  const original = await fileToDataUrl(file);
  try {
    return await downscale(original);
  } catch {
    return original;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function downscale(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no canvas context'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', QUALITY));
    };
    img.onerror = () => reject(new Error('cannot decode image'));
    img.src = dataUrl;
  });
}
