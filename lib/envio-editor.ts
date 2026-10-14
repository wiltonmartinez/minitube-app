"use client";

// Puente entre PromptTUBE (React) y el Editor de capas (página estática del mismo sitio).
// La imagen viaja por IndexedDB (mismo origen, sin límite de 5 MB): PromptTUBE la deja en «ajustes/envio»
// y el editor la recoge al abrirse (la guarda en la carpeta de su enfoque y la pone como fondo).

export type EnvioEditor = { blob: Blob; nombre: string; /** 1 a 4, o null si no hay enfoque */ enfoque: number | null; proyecto: string };

const BD = "gestor-tube-almacen";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => {
      // mismas tiendas que crea el editor (public/editor/almacen.js)
      if (!r.result.objectStoreNames.contains("vfs")) r.result.createObjectStore("vfs");
      if (!r.result.objectStoreNames.contains("ajustes")) r.result.createObjectStore("ajustes");
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}

/** Deja la imagen lista para que el Editor de capas la recoja al abrirse. */
export async function enviarAlEditor(envio: EnvioEditor): Promise<void> {
  const db = await abrir();
  await new Promise<void>((ok, mal) => {
    const t = db.transaction("ajustes", "readwrite");
    t.objectStore("ajustes").put(envio, "envio");
    t.oncomplete = () => ok();
    t.onerror = () => mal(t.error);
    t.onabort = () => mal(t.error);
  });
  db.close();
}

/** Nombre de archivo seguro para la imagen: «enfoque3-tecnico-de-impresoras-20261013-2130». */
export function nombreImagenEnvio(enfoque: number | null, profesion: string, ahora = new Date()): string {
  const p = (x: number) => String(x).padStart(2, "0");
  const limpio = profesion
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const sello = `${ahora.getFullYear()}${p(ahora.getMonth() + 1)}${p(ahora.getDate())}-${p(ahora.getHours())}${p(ahora.getMinutes())}`;
  return [enfoque ? `enfoque${enfoque}` : "sin-enfoque", limpio, sello].filter(Boolean).join("-");
}
