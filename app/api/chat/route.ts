import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { z } from "zod";

export const maxDuration = 30;

const buildSystemPrompt = (idioma: string) => `Eres un experto diseñador de miniaturas de YouTube. Tu objetivo es generar un ÚNICO prompt en inglés para Midjourney v6 basado en las variables del usuario.

Reglas de Idioma (¡MUY IMPORTANTE!):
- El prompt descriptivo (iluminación, composición, personajes, objetos) SIEMPRE debe estar en INGLÉS.
- Sin embargo, los TEXTOS literales que aparecerán escritos en la miniatura (los que van entre comillas en el prompt, como los badges y alertas) deben ser TRADUCIDOS EXACTAMENTE al idioma seleccionado por el usuario: ${idioma}.

Estructura del prompt visual:
- Relación de aspecto 16:9 (--ar 16:9). Fondo cyber-tech oscuro con escudos de seguridad holográficos.
- Sujeto: [Personaje] a la derecha, expresión de asombro/alivio, señalando al centro.
- Objetos: Impresora [Modelo] a la izquierda con un cable USB brillante (glowing USB cable) conectándose a un escudo de seguridad digital.
- Textos 3D Masivos: Genera el texto principal 'RESET' en amarillo, el [Error] en rojo, y el [Modelo] en blanco metálico.
- Badges (Traducidos al idioma seleccionado): Añade badges 3D que transmitan los conceptos de '100% Remoto', 'Vía USB' o 'Solución en 1 Minuto', pero TRADUCIDOS al idioma indicado.
- Estilo: Iluminación dramática, alto contraste, renderizado 3D hiperrealista, transmite seguridad y asistencia remota.

Reglas para Imágenes de Referencia (inyección de URLs):
El usuario puede adjuntar imágenes de referencia locales (modelos, errores, soluciones, mediosPago, procedimiento, branding). El sistema inserta las URLs automáticamente por código: tú NUNCA escribes URLs, marcadores como '[URL_...]' ni el parámetro '--sref'.
- Si hay una imagen de 'modelos', 'errores', 'soluciones', 'mediosPago' o 'procedimiento': sus URLs se colocarán al MERO INICIO del prompt, separadas por un espacio (Image Prompts de Midjourney). Adapta el texto para que la IA se base en esas fotos: reduce la descripción física de la impresora si hay imagen de 'modelos', y no describas en detalle pantallas de error, soluciones, medios de pago ni procedimientos que ya vienen en su imagen; solo menciónalos brevemente como elementos de la escena.
- Si hay una imagen de 'branding': se añadirá al FINAL del prompt con '--sref'. No describas el logotipo en detalle.
Si no hay imágenes, genera el texto normalmente.

Reglas de calidad anatómica y coherencia (OBLIGATORIAS):
- Describe UNA sola persona con anatomía humana correcta: exactamente dos brazos, dos manos con cinco dedos cada una, un solo rostro, proporciones naturales. Incluye frases como 'anatomically correct, exactly two arms, five fingers per hand, symmetrical face, natural proportions'.
- Respeta la mirada, la profesión y la vestimenta indicadas, sin añadir personas ni extremidades extra.
- La impresora debe ser un único objeto coherente y realista, con forma reconocible del modelo indicado; evita formas abstractas, objetos fusionados o elementos incoherentes.
- Composición limpia y ordenada, sin elementos duplicados, sin texto adicional distinto al indicado.

Devuelve ÚNICAMENTE el texto del prompt resultante.`;

// Parámetro --no de Midjourney para evitar deformaciones típicas
const NEGATIVE =
  "--no extra arms, extra limbs, extra fingers, missing fingers, deformed hands, distorted face, mutated body, duplicate people, disfigured, blurry, low quality, ugly, incoherent shapes, extra text, watermark";

const field = z.string().trim().max(1000).default("");

// URL de imagen seleccionada, o null si no se eligió ninguna
const imageUrl = z.string().trim().min(1).max(2000).nullable().default(null);

const BodySchema =z.object({
  modelo: field,
  error: field,
  personaje: field,
  fondo: field,
  marco: field,
  badges: field,
  idioma: field,
  imagenes: z
    .object({
      modelos: imageUrl,
      errores: imageUrl,
      soluciones: imageUrl,
      mediosPago: imageUrl,
      procedimiento: imageUrl,
      branding: imageUrl,
    })
    .default({
      modelos: null,
      errores: null,
      soluciones: null,
      mediosPago: null,
      procedimiento: null,
      branding: null,
    }),
});

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response("Falta GOOGLE_GENERATIVE_AI_API_KEY en .env.local", { status: 500 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return new Response("Solicitud inválida", { status: 400 });
  }
  const v = parsed.data;
  const img = v.imagenes;
  const activas = (Object.keys(img) as (keyof typeof img)[]).filter((k) => img[k]);

  const prompt = [
    `Modelo de impresora: ${v.modelo || "Epson L3250"}`,
    `Tipo de error: ${v.error || "Almohadillas"}`,
    `Personaje: ${v.personaje || "hombre barbudo con sudadera"}`,
    ...(v.fondo ? [`Fondo: ${v.fondo}`] : []),
    ...(v.marco ? [`Marco: ${v.marco}`] : []),
    `Idioma de los textos: ${v.idioma || "Español"}`,
    `Imágenes de referencia activas: ${activas.length ? activas.join(", ") : "ninguna"}`,
    ...(v.badges ? [`Badges 3D: ${v.badges}`] : []),
  ].join("\n");

  try {
    const { text } = await generateText({
      model: google(process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite"),
      system: buildSystemPrompt(v.idioma || "Español"),
      prompt,
      maxOutputTokens: 2048,
    });
    // Midjourney exige los parámetros al final: se quitan donde estén y se añaden al cierre
    const cleaned = text
      .replace(/,?\s*--ar\s+16:9\.?/gi, "")
      .replace(/\s*--no\s+[^-]*/gi, "")
      .replace(/\s*--sref\s+\S+/gi, "")
      .replace(/\[URL_[A-Z_]+\]/g, "")
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[.,;\s]+$/, "");

    // Las URLs se inyectan por código (no dependen del modelo):
    // Image Prompts al mero inicio, branding al final con --sref
    const inicio = [img.modelos, img.errores, img.soluciones, img.mediosPago, img.procedimiento]
      .filter((u): u is string => Boolean(u))
      .join(" ");
    const sref = img.branding ? ` --sref ${img.branding}` : "";
    return new Response(`${inicio ? `${inicio} ` : ""}${cleaned}${sref} ${NEGATIVE} --ar 16:9`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return new Response(message, { status: 502 });
  }
}
