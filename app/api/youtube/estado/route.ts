import { NextResponse } from "next/server";
import { exigirSesion } from "@/lib/acceso";
import { youtubeConfigurado } from "@/lib/textube/youtube";

export async function GET(req: Request) {
  if (!(await exigirSesion(req))) return NextResponse.json({ error: "Necesitas iniciar sesión." }, { status: 401 });
  return NextResponse.json({ configurado: youtubeConfigurado() });
}
