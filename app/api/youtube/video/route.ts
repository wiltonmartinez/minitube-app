import { leerVideo } from "@/lib/textube/youtube";
import { rutaYouTube } from "@/lib/textube/rutas";

/** Lee el video (título, descripción y etiquetas actuales). No cambia nada. */
export const POST = (req: Request) => rutaYouTube(req, async (_c, id) => ({ video: id, snippet: await leerVideo(id) }));
