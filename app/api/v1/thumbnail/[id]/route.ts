import { NextResponse } from "next/server";
import { VERSION_API, claveFal, leerId, respuestaError, verificarToken } from "@/lib/api-v1";
import { ErrorProveedor, consultarCola, esCuotaAgotada } from "@/lib/fal-cola";
import { buscarModelo } from "@/lib/image-models";

// GET /api/v1/thumbnail/{id} — estado de una imagen en proceso. Responde: en_cola · generando · completado (con la imagen).
// El «id» es opaco y está firmado con el token: nadie puede inventarlo ni alterarlo.

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sinPermiso = verificarToken(req);
  if (sinPermiso) return sinPermiso;

  const { id } = await ctx.params;
  const datos = leerId(id, process.env.MINITUBE_API_TOKEN!);
  if (!datos) return respuestaError("NO_ENCONTRADO", "El id no es válido o no pertenece a este servicio.", 404);
  const clave = claveFal();
  if (!clave) return respuestaError("SERVICIO_NO_CONFIGURADO", "El servidor no tiene FAL_KEY: no hay trabajos reales que consultar.", 503);
  const modelo = buscarModelo(datos.m);

  try {
    const e = await consultarCola(datos.s, datos.r, clave);
    if (e.estado !== "completado") {
      return NextResponse.json({ version: VERSION_API, id, estado: e.estado, imagen: null, simulacion: false, aviso: null });
    }
    return NextResponse.json({
      version: VERSION_API,
      id,
      estado: "completado",
      imagen: { url: e.url, ancho: e.ancho, alto: e.alto },
      costoAproxUSD: modelo?.costoUsd ?? null,
      simulacion: false,
      aviso: null,
    });
  } catch (err) {
    const p = err instanceof ErrorProveedor ? err : new ErrorProveedor(502, "");
    if (esCuotaAgotada(p.status, p.detalle)) {
      return respuestaError("CUOTA_AGOTADA", "Se agotó el saldo o la cuota del proveedor de imágenes.", 429);
    }
    console.error("[api v1] fallo al consultar:", p.status, p.detalle.slice(0, 200)); // sin datos secretos
    return respuestaError("FALLO_PROVEEDOR", "No se pudo consultar el estado de la imagen en el proveedor.", 502);
  }
}
