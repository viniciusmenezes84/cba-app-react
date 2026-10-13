export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
export const PHOTO_SIZE = 768;

export function cropRectangle(width, height, zoom = 1, horizontal = 0, vertical = 0) {
  const side = Math.min(width, height) / Math.max(1, Math.min(3, zoom));
  return { x: (width - side) * (Math.max(-100, Math.min(100, horizontal)) + 100) / 200,
    y: (height - side) * (Math.max(-100, Math.min(100, vertical)) + 100) / 200, side };
}

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) { URL.revokeObjectURL(url); reject(new Error('Imagem inválida.')); return; }
      resolve({ image, url, dispose: () => URL.revokeObjectURL(url) });
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível abrir a imagem.')); };
    image.src = url;
  });
}

export async function prepareProfilePhoto(file) {
  if (!file?.size || file.size > MAX_SOURCE_BYTES) throw new Error('Escolha uma foto de até 15 MB.');
  const heic = /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);
  if (!heic && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && !(file.type === '' && /\.(jpg|jpeg|png|webp)$/i.test(file.name))) {
    throw new Error('Use uma foto JPG, PNG, WebP, HEIC ou HEIF.');
  }
  try { return await loadImage(file); }
  catch {
    if (!heic) throw new Error('A imagem está inválida ou não pôde ser aberta. Escolha outra foto.');
    try {
      // Download the HEIC decoder only when native decoding is unavailable.
      const { heicTo } = await import('heic-to');
      return await loadImage(await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 }));
    } catch { throw new Error('Não foi possível converter esta foto HEIC. Tente outra imagem ou exporte-a como JPG.'); }
  }
}

export function drawProfileCrop(canvas, image, crop, size = PHOTO_SIZE) {
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu preparar a imagem.');
  const rect = cropRectangle(image.naturalWidth, image.naturalHeight, crop.zoom, crop.horizontal, crop.vertical);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
  ctx.drawImage(image, rect.x, rect.y, rect.side, rect.side, 0, 0, size, size);
}

export async function encodeProfilePhoto(image, crop) {
  const canvas = document.createElement('canvas');
  drawProfileCrop(canvas, image, crop);
  for (const quality of [0.85, 0.7, 0.55]) {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size <= 900 * 1024) return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Não foi possível preparar o envio. Tente outra foto.'));
      reader.readAsDataURL(blob);
    });
  }
  throw new Error('Não foi possível reduzir a foto. Escolha uma imagem menor.');
}
