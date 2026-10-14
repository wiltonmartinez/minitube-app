import { restaurarSnippet, type Snippet } from "@/lib/textube/youtube";
import { rutaYouTube } from "@/lib/textube/rutas";

/** Restaura el título, la descripción y las etiquetas guardados en el respaldo del navegador. */
export const POST = (req: Request) =>
  rutaYouTube(req, async (c, id) => {
    const s = c.snippet as Snippet | undefined;
    if (!s || typeof s !== "object" || typeof s.title !== "string") throw new Error("No hay respaldo de este video.");
    return { video: id, ...(await restaurarSnippet(id, s)) };
  });
