import { aplicarTextos, validarCambios } from "@/lib/textube/youtube";
import { rutaYouTube } from "@/lib/textube/rutas";

/** Cambia el título, la descripción y/o las etiquetas del video; devuelve el original para el respaldo. */
export const POST = (req: Request) =>
  rutaYouTube(req, async (c, id) => {
    const cambios = validarCambios({ titulo: c.titulo, descripcion: c.descripcion, etiquetas: c.etiquetas });
    if (!Object.keys(cambios).length) throw new Error("No hay nada que aplicar.");
    return { video: id, ...(await aplicarTextos(id, cambios)) };
  });
