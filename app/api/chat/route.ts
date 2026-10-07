import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { z } from "zod";

export const maxDuration = 30;

const buildSystemPrompt = (idioma: string) => `Eres un experto diseñador de miniaturas de YouTube. Tu objetivo es generar un ÚNICO prompt en lenguaje natural y descriptivo, en inglés, optimizado para Google Gemini (Imagen 3), basado en las variables del usuario.

Formato (MUY IMPORTANTE):
- Escribe en párrafos de lenguaje natural, como si le describieras la escena a un director de arte. PROHIBIDO usar parámetros técnicos de Midjourney: nada de '--ar', '--v', '--sref', '--iw', '--no' ni ningún otro parámetro con guiones dobles.
- NO escribas URLs, enlaces ni marcadores como '[URL_...]'. El sistema añade por código la frase de relación de aspecto 16:9: tú no la incluyas.

Reglas de Idioma:
- El prompt descriptivo (iluminación, composición, personajes, objetos) SIEMPRE debe estar en INGLÉS.
- Los TEXTOS literales que aparecerán escritos en la miniatura (los que van entre comillas en el prompt, como los badges y alertas) deben ser TRADUCIDOS EXACTAMENTE al idioma seleccionado por el usuario: ${idioma}.

Estructura del prompt visual:
- Fondo cyber-tech oscuro con escudos de seguridad holográficos (respeta el fondo y el marco que indique el usuario si los especifica).
- Sujeto: [Personaje] a la derecha, expresión de asombro/alivio, señalando al centro (respeta la emoción, la mirada, la profesión y la vestimenta indicadas).
- Objetos: Impresora [Marca y Modelo] a la izquierda (menciona la marca y el modelo exactos en la descripción de la impresora, y que el nombre de la marca se lee en su carcasa) con un cable USB brillante (glowing USB cable) conectándose a un escudo de seguridad digital.
- Textos 3D masivos (Gemini renderiza muy bien el texto, aprovéchalo): describe cada texto como tipografía gigante, 3D, con volumen, bordes biselados, contorno oscuro grueso y sombras fuertes, perfectamente legible y nítida. El texto principal 'RESET' en amarillo brillante, el [Error] en rojo vibrante y el [Modelo] en blanco metálico. El mensaje del usuario incluye una lista 'Textos 3D gigantes a renderizar'. Esos textos son OBLIGATORIOS: cada uno debe aparecer entre comillas en el prompt, con su color indicado. Usa el texto del [Error] y del [Marca y Modelo] COMPLETO, tal como lo escribió el usuario (por ejemplo 'ERROR 5B00' y 'EPSON L3250', con la marca incluida), sin recortarlo ni traducirlo. Indica que cada texto debe renderizarse EXACTAMENTE tal como está escrito entre comillas, letra por letra, sin errores ortográficos ni letras añadidas o inventadas.
- Badges (traducidos al idioma seleccionado): añade badges 3D flotantes que transmitan los conceptos de '100% Remoto', 'Vía USB' o 'Solución en 1 Minuto' (o los badges indicados por el usuario), TRADUCIDOS al idioma indicado, con las mismas reglas de tipografía masiva y legible.
- Estilo: iluminación dramática, alto contraste, renderizado 3D hiperrealista, transmite seguridad y asistencia remota.

Calidad anatómica y coherencia (OBLIGATORIAS, expresadas en lenguaje natural):
- Describe UNA sola persona con anatomía humana correcta: exactamente dos brazos, dos manos con cinco dedos cada una, un solo rostro simétrico y proporciones naturales. No añadas personas ni extremidades extra.
- La impresora debe ser un único objeto coherente y realista, con la forma reconocible del modelo indicado, sin formas abstractas, objetos fusionados ni elementos incoherentes.
- Composición limpia y ordenada, sin elementos duplicados y sin texto adicional distinto al indicado.
- Termina el prompt con una frase de exclusión en lenguaje natural, por ejemplo: 'Avoid extra limbs, extra or missing fingers, deformed hands, distorted faces, duplicate people, blurry or low-quality rendering, misspelled text, watermarks and incoherent shapes.'

Devuelve ÚNICAMENTE el texto del prompt resultante.`;

// Frase fija de relación de aspecto, insertada por código para no depender del modelo
const ASPECT_SENTENCE =
  "Genera una imagen en formato panorámico 16:9, ideal para una miniatura de YouTube.";

const field = z.string().trim().max(1000).default("");

const BodySchema = z.object({
  modelo: field,
  error: field,
  personaje: field,
  fondo: field,
  marco: field,
  badges: field,
  idioma: field,
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
  const modelo = v.modelo || "Epson L3250";
  const error = v.error || "Almohadillas";

  const prompt = [
    `Marca y modelo de impresora: ${modelo}`,
    `Tipo de error: ${error}`,
    `Personaje: ${v.personaje || "hombre barbudo con sudadera"}`,
    ...(v.fondo ? [`Fondo: ${v.fondo}`] : []),
    ...(v.marco ? [`Marco: ${v.marco}`] : []),
    `Idioma de los textos: ${v.idioma || "Español"}`,
    "Textos 3D gigantes a renderizar (literales, entre comillas en el prompt):",
    "- 'RESET' en amarillo brillante",
    `- '${error.toUpperCase()}' en rojo vibrante`,
    `- '${modelo.toUpperCase()}' en blanco metálico`,
    ...(v.badges ? [`- Badges (traducir al idioma indicado): ${v.badges}`] : []),
  ].join("\n");

  try {
    const { text } = await generateText({
      model: google(process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite"),
      system: buildSystemPrompt(v.idioma || "Español"),
      prompt,
      maxOutputTokens: 2048,
    });

    // Limpieza defensiva: sin parámetros de Midjourney, URLs ni marcadores del modelo
    const description = text
      .replace(/\s--[a-z]{1,6}\b[^-]*/gi, "")
      .replace(/\[URL_[A-Z_]+\]/g, "")
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/[ \t]+/g, " ")
      .trim();

    // La relación de aspecto se inyecta por código (no depende del modelo)
    return new Response(`${ASPECT_SENTENCE}\n\n${description}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return new Response(message, { status: 502 });
  }
}
