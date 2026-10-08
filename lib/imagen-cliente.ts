"use client";

// Utilidades de imagen del navegador (canvas): reducir fotos antes de enviarlas o guardarlas.

export async function cargarImagen(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((ok, fallo) => {
    img.onload = () => ok();
    img.onerror = () => fallo(new Error("No se pudo leer la imagen."));
    img.src = src;
  });
  return img;
}

/** Reduce una imagen (URL, data URI o blob URL) a un JPEG con el lado largo máximo indicado; devuelve un data URI. */
export async function reducirImagen(src: string, maxLado: number, calidad: number): Promise<string> {
  const img = await cargarImagen(src);
  const ancho = img.naturalWidth || 1280;
  const alto = img.naturalHeight || 720;
  const k = Math.min(1, maxLado / Math.max(ancho, alto));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(ancho * k));
  canvas.height = Math.max(1, Math.round(alto * k));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; // los PNG con transparencia se aplanan sobre blanco
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", calidad);
}

/** Igual que reducirImagen pero a partir de un archivo subido por el usuario. */
export async function reducirArchivo(archivo: File, maxLado: number, calidad: number): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    return await reducirImagen(url, maxLado, calidad);
  } finally {
    URL.revokeObjectURL(url);
  }
}
