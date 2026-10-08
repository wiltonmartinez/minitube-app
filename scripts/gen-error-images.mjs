// Genera lib/error-images.generated.ts con la lista de imágenes de public/Assets/errores.
// Uso: npm run gen:error-images   (volver a ejecutar cada vez que se añadan o quiten imágenes)
import { readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "public", "Assets", "errores");
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

// Si existe el mismo nombre en varios formatos se prefiere .png (nitidez del texto)
const byBase = new Map();
for (const file of readdirSync(dir)) {
  const ext = path.extname(file).toLowerCase();
  if (!IMAGE_EXT.has(ext)) continue;
  const base = path.basename(file, path.extname(file)).toLowerCase();
  const prev = byBase.get(base);
  if (!prev || (ext === ".png" && path.extname(prev).toLowerCase() !== ".png")) byBase.set(base, file);
}

const files = [...byBase.values()].sort((a, b) =>
  a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }),
);

const out = `// ARCHIVO GENERADO por scripts/gen-error-images.mjs — no editar a mano.
export const ERROR_IMAGE_FILES: readonly string[] = ${JSON.stringify(files, null, 2)};
`;
writeFileSync(path.join(process.cwd(), "lib", "error-images.generated.ts"), out);
console.log(`${files.length} imágenes de error listadas`);
