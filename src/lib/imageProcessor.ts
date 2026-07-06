"use client";

import imageCompression from "browser-image-compression";

export interface ProcessedImage {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  sizeKb: number;
}

/**
 * Procesa una imagen de pedido:
 * 1. Elimina metadatos EXIF (usando canvas)
 * 2. Redimensiona a máximo 1920px en el lado más largo
 * 3. Comprime a ≤ 200KB
 * 4. Convierte a WebP
 */
export async function processImageForUpload(
  file: File
): Promise<ProcessedImage> {
  const img = await loadImage(file);
  const { width, height } = getTargetDimensions(img.width, img.height, 1920);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  const webpBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Canvas toBlob falló"));
      },
      "image/webp",
      0.82
    );
  });

  let finalBlob: Blob = webpBlob;
  if (webpBlob.size > 200 * 1024) {
    const compressedFile = new File(
      [webpBlob],
      file.name.replace(/\.[^.]+$/, ".webp"),
      { type: "image/webp" }
    );
    finalBlob = await imageCompression(compressedFile, {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/webp",
    });
  }

  const previewUrl = URL.createObjectURL(finalBlob);
  const finalSizeKb = Math.round(finalBlob.size / 1024);

  return {
    file: new File([finalBlob], `${Date.now()}.webp`, { type: "image/webp" }),
    previewUrl,
    width,
    height,
    sizeKb: finalSizeKb,
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Error cargando imagen"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Error leyendo archivo"));
    reader.readAsDataURL(file);
  });
}

function getTargetDimensions(
  w: number,
  h: number,
  maxSide: number
): { width: number; height: number } {
  if (w <= maxSide && h <= maxSide) return { width: w, height: h };
  if (w >= h) {
    return { width: maxSide, height: Math.round((h / w) * maxSide) };
  }
  return { width: Math.round((w / h) * maxSide), height: maxSide };
}

export function revokePreviewUrl(url: string): void {
  try { URL.revokeObjectURL(url); } catch {}
}
