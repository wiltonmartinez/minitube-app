import "server-only";
import { NextResponse } from "next/server";
import { exigirModulo } from "@/lib/acceso-cuenta";
import { extraerVideoId } from "./datos-video";
import { ErrorYouTube } from "./youtube";

/** Envoltorio común de las rutas de YouTube: exige sesión, lee el JSON, saca el ID del video y traduce los errores. */
export async function rutaYouTube(req: Request, fn: (cuerpo: Record<string, unknown>, id: string) => Promise<unknown>) {
  if (!(await exigirModulo(req, "textube"))) return NextResponse.json({ error: "No tienes acceso a TexTUBE." }, { status: 403 });
  try {
    const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const id = extraerVideoId(String(cuerpo.video ?? ""));
    return NextResponse.json(await fn(cuerpo, id));
  } catch (e) {
    const estado = e instanceof ErrorYouTube ? e.estado : 400;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error." }, { status: estado });
  }
}
