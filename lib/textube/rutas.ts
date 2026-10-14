import "server-only";
import { NextResponse } from "next/server";
import { exigirSesion } from "@/lib/acceso";
import { extraerVideoId } from "./datos-video";
import { ErrorYouTube } from "./youtube";

/** Envoltorio común de las rutas de YouTube: exige sesión, lee el JSON, saca el ID del video y traduce los errores. */
export async function rutaYouTube(req: Request, fn: (cuerpo: Record<string, unknown>, id: string) => Promise<unknown>) {
  if (!(await exigirSesion(req))) return NextResponse.json({ error: "Necesitas iniciar sesión." }, { status: 401 });
  try {
    const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const id = extraerVideoId(String(cuerpo.video ?? ""));
    return NextResponse.json(await fn(cuerpo, id));
  } catch (e) {
    const estado = e instanceof ErrorYouTube ? e.estado : 400;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error." }, { status: estado });
  }
}
