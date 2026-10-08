import { NextResponse } from "next/server";
import { explicarErrorCreditos } from "@/lib/fal-helpers";

// Consulta el saldo (créditos) de la cuenta de fal.ai. Solo lectura y gratuita.
// Endpoint oficial: GET https://api.fal.ai/v1/account/billing?expand=credits (exige una clave con alcance «Admin»).
// Se usa FAL_ADMIN_KEY si existe; si no, FAL_KEY. La clave nunca sale del servidor.

const URL_FACTURACION = "https://api.fal.ai/v1/account/billing?expand=credits";

export async function GET(req: Request) {
  void req; // fuerza respuesta dinámica: el saldo cambia con cada consulta
  const claveAdmin = process.env.FAL_ADMIN_KEY;
  const clave = claveAdmin || process.env.FAL_KEY;
  if (!clave) return NextResponse.json({ simulacion: true });

  try {
    const res = await fetch(URL_FACTURACION, {
      headers: { Authorization: `Key ${clave}`, Accept: "application/json" },
      cache: "no-store",
    });
    const texto = await res.text();
    if (!res.ok) {
      let tipo = "";
      try {
        tipo = (JSON.parse(texto) as { error?: { type?: string } }).error?.type ?? "";
      } catch {
        /* respuesta sin formato */
      }
      return NextResponse.json({ error: explicarErrorCreditos(res.status, tipo), usaClaveAdmin: !!claveAdmin }, { status: res.status === 429 ? 429 : 502 });
    }
    const j = JSON.parse(texto) as { username?: string; credits?: { current_balance?: number; currency?: string } };
    const saldo = j.credits?.current_balance;
    if (typeof saldo !== "number") {
      return NextResponse.json({ error: "fal.ai no devolvió el saldo de la cuenta." }, { status: 502 });
    }
    return NextResponse.json({
      saldo,
      moneda: j.credits?.currency ?? "USD",
      usuario: j.username ?? null,
      usaClaveAdmin: !!claveAdmin,
    });
  } catch {
    return NextResponse.json({ error: "No se pudo conectar con fal.ai. Revisa tu conexión a internet." }, { status: 502 });
  }
}
