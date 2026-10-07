import { readdir } from "node:fs/promises";
import path from "node:path";

const CATEGORIES = [
  "modelos",
  "errores",
  "soluciones",
  "branding",
  "mediosPago",
  "procedimiento",
] as const;

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);

type Asset = { name: string; path: string };

async function readCategory(category: string): Promise<Asset[]> {
  const dir = path.join(process.cwd(), "public", "Assets", category);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  // Si hay el mismo nombre en varios formatos (ej. .png y .webp) se prefiere .png
  const byBase = new Map<string, string>();
  for (const file of entries) {
    const ext = path.extname(file).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;
    const base = path.basename(file, path.extname(file)).toLowerCase();
    const prev = byBase.get(base);
    if (!prev || (ext === ".png" && path.extname(prev).toLowerCase() !== ".png")) {
      byBase.set(base, file);
    }
  }

  return [...byBase.values()]
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }))
    .map((file) => ({
      name: file,
      path: `/Assets/${category}/${encodeURIComponent(file)}`,
    }));
}

export async function GET() {
  const entries = await Promise.all(
    CATEGORIES.map(async (c) => [c, await readCategory(c)] as const),
  );
  return Response.json(Object.fromEntries(entries));
}
