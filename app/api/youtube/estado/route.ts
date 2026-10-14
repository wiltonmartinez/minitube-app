import { NextResponse } from "next/server";
import { exigirModulo } from "@/lib/acceso-cuenta";
import { youtubeConfigurado } from "@/lib/textube/youtube";

export async function GET(req: Request) {
  if (!(await exigirModulo(req, "textube"))) return NextResponse.json({ error: "No tienes acceso a TexTUBE." }, { status: 403 });
  return NextResponse.json({ configurado: youtubeConfigurado() });
}
