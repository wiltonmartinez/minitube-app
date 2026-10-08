// Palabras prohibidas en los PROMPTS DE IMAGEN. Se comprueban en las pruebas y, en la API, sobre lo que escribe el
// cliente (marca, modelo y error), para que nada de esto llegue a un generador de imágenes.
// (No afecta al título ni a la descripción del video: eso lo genera TexTube.)

export const PROHIBIDOS: { nombre: string; patron: RegExp }[] = [
  { nombre: "WhatsApp", patron: /whats\s?app|\bwa\.me\b/i },
  { nombre: "reparar", patron: /\brepar(?:ar|ando|aci[oó]n|aciones)\b|\brepair(?:s|ing|ed)?\b/i },
  { nombre: "tutorial", patron: /\btutorial(?:es)?\b/i },
  // Números de teléfono: con prefijo internacional, agrupados (123-456-7890) o de 10 dígitos o más.
  // Los códigos de error de 8 dígitos (00000008, 0014BD…) no se confunden con teléfonos.
  { nombre: "número de teléfono", patron: /\+\s?\d{1,3}[\s.-]?\d{6,}|\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b|\b\d{10,}\b/ },
  { nombre: "número de teléfono (texto)", patron: /n[uú]mero\s+de\s+tel[eé]fono|phone\s+number/i },
];

/** Devuelve los nombres de las palabras prohibidas que aparecen en el texto (lista vacía = limpio). */
export function auditarPrompt(texto: string): string[] {
  return PROHIBIDOS.filter((p) => p.patron.test(texto)).map((p) => p.nombre);
}
