import { NextResponse } from "next/server";
import { VERSION_API, claveFal, crearId, respuestaError, verificarToken } from "@/lib/api-v1";
import { ErrorProveedor, enviarACola, esCuotaAgotada } from "@/lib/fal-cola";
import { imagenSimulada } from "@/lib/fal-helpers";
import { COMPOSICION, planificar, validarSolicitud } from "@/lib/motor";
import { elegirRuta } from "@/lib/prioridad";

// POST /api/v1/thumbnail — MiniTube decide la prioridad, arma el prompt y (si se pide) genera la imagen.
// Requiere «Authorization: Bearer <MINITUBE_API_TOKEN>». Sin FAL_KEY responde en MODO SIMULACIÓN (sin costo).
// La generación real usa la cola de fal.ai: responde 202 con un «id» y el cliente consulta GET /api/v1/thumbnail/{id}.

export async function POST(req: Request) {
  const sinPermiso = verificarToken(req);
  if (sinPermiso) return sinPermiso;

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return respuestaError("DATOS_INVALIDOS", "El cuerpo de la petición no es un JSON válido.", 400);
  }
  const v = validarSolicitud(cuerpo);
  if (!v.ok) return respuestaError("DATOS_INVALIDOS", v.mensaje, 400, { campos: v.campos });

  const { solicitud } = v;
  const ruta = elegirRuta(solicitud.modelo);
  const plan = planificar(solicitud, ruta.prioridad);

  const base = {
    version: VERSION_API,
    prioridad: ruta.prioridad,
    modeloIA: ruta.modelo.nombre,
    semilla: plan.semilla,
    personaje: plan.personaje,
    profesion: plan.profesion,
    plano: plan.plano,
    emocion: plan.emocion,
    promptImagen: plan.promptImagen,
    promptGemini: plan.promptGemini,
    composicion: COMPOSICION, // lo que TexTube aplica por código (marca de agua, ventana de error, zonas libres)
    // Lo que costaría generar la imagen con el modelo elegido (aunque no se genere): sirve para estimar un lote antes de gastar
    costoEstimadoUSD: ruta.generacion === "manual" ? 0 : ruta.modelo.costoUsd,
  };

  // Pruebas locales de errores (nunca en producción): «x-minitube-simular: cuota | proveedor»
  const simular = process.env.NODE_ENV !== "production" ? req.headers.get("x-minitube-simular") : null;
  const sinCuota = () =>
    respuestaError(
      "CUOTA_AGOTADA",
      "Se agotó el saldo o la cuota del proveedor de imágenes. No se usó ningún modelo de pago alternativo: guarda «promptGemini» y genera la imagen a mano.",
      429,
      { promptGemini: plan.promptGemini, prioridad: ruta.prioridad },
    );
  if (simular === "cuota") return sinCuota();
  // Prioridad normal en modo «manual»: no se genera nada automáticamente, se devuelve el prompt para hacerlo a mano
  if (solicitud.generarImagen && ruta.generacion === "manual") {
    return respuestaError(
      "CUOTA_AGOTADA",
      "La generación automática de prioridad normal está desactivada (MINITUBE_MODELO_NORMAL=manual). No se usó ningún modelo de pago: guarda «promptGemini» y genera la imagen a mano.",
      429,
      { promptGemini: plan.promptGemini, prioridad: ruta.prioridad },
    );
  }
  if (simular === "proveedor") return respuestaError("FALLO_PROVEEDOR", "El proveedor de imágenes falló (simulado).", 502);

  if (!solicitud.generarImagen) {
    return NextResponse.json({
      ...base,
      id: null,
      estado: "completado",
      imagen: null,
      costoAproxUSD: 0,
      simulacion: false,
      aviso: "Solo prompt: no se generó ninguna imagen (generarImagen = false).",
    });
  }

  const clave = claveFal();
  if (!clave) {
    return NextResponse.json({
      ...base,
      id: null,
      estado: "completado",
      imagen: { url: imagenSimulada(ruta.modelo), ancho: 1280, alto: 720 },
      costoAproxUSD: 0,
      simulacion: true,
      aviso: "Modo simulación: falta FAL_KEY en el servidor, la imagen es de prueba y no tiene costo.",
    });
  }

  try {
    const { statusUrl, responseUrl } = await enviarACola(ruta.modelo.endpoint, ruta.modelo.entrada(plan.promptImagen), clave);
    const id = crearId({ s: statusUrl, r: responseUrl, m: ruta.modelo.id }, process.env.MINITUBE_API_TOKEN!);
    return NextResponse.json(
      {
        ...base,
        id,
        estado: "en_cola",
        imagen: null,
        costoAproxUSD: ruta.modelo.costoUsd,
        simulacion: false,
        aviso: "Imagen en proceso: consulta GET /api/v1/thumbnail/{id} cada pocos segundos hasta que esté lista.",
      },
      { status: 202 },
    );
  } catch (e) {
    const err = e instanceof ErrorProveedor ? e : new ErrorProveedor(502, "");
    if (esCuotaAgotada(err.status, err.detalle)) return sinCuota();
    console.error("[api v1] fallo del proveedor:", err.status, err.detalle.slice(0, 200)); // sin datos secretos
    return respuestaError("FALLO_PROVEEDOR", "El proveedor de imágenes falló. Vuelve a intentar en un momento.", 502);
  }
}
