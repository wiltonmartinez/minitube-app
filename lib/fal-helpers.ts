import type { ModeloIA } from "@/lib/image-models";

// Funciones auxiliares de la ruta /api/generate (Next.js no permite exportarlas desde route.ts).

/** Traduce los errores de fal.ai a mensajes claros en español. */
export function explicarError(status: number, detalle: string): string {
  const d = detalle.toLowerCase();
  if (status === 401 || status === 403 || d.includes("unauthorized") || d.includes("invalid key"))
    return "La clave FAL_KEY no es válida o no tiene permiso. Revisa que esté bien copiada en .env.local.";
  if (status === 402 || d.includes("balance") || d.includes("insufficient") || d.includes("exhausted"))
    return "Tu cuenta de fal.ai no tiene saldo suficiente. Agrega crédito en fal.ai/dashboard/billing.";
  if (status === 429) return "fal.ai recibió demasiadas solicitudes. Espera unos segundos y vuelve a intentar.";
  if (d.includes("content") && (d.includes("policy") || d.includes("moderation") || d.includes("safety")))
    return "El modelo rechazó el prompt por su política de contenido. Cambia algún detalle y vuelve a intentar.";
  if (status === 422) return "fal.ai rechazó los parámetros del prompt o del tamaño de imagen. Prueba con otro modelo.";
  if (status >= 500) return "fal.ai tuvo un problema temporal. Vuelve a intentar en un momento.";
  return "No se pudo generar la imagen. Vuelve a intentar o prueba con otro modelo.";
}

/** Imagen de prueba 16:9 (SVG) para probar la interfaz sin gastar dinero. */
export function imagenSimulada(modelo: ModeloIA, referencias = 0): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs>
<rect width="1280" height="720" fill="url(#g)"/>
<rect x="24" y="24" width="1232" height="672" fill="none" stroke="#f97316" stroke-width="6" stroke-dasharray="24 14"/>
<text x="640" y="320" text-anchor="middle" font-family="Arial, sans-serif" font-size="110" font-weight="700" fill="#ffffff">SIMULACIÓN</text>
<text x="640" y="410" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" fill="#fde68a">${modelo.nombre}</text>
<text x="640" y="480" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#e2e8f0">Imagen de prueba 16:9 · sin costo · sin FAL_KEY${referencias ? ` · ${referencias} referencia(s)` : ""}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Errores de la consulta de créditos de fal.ai, en español. */
export function explicarErrorCreditos(status: number, tipo = ""): string {
  if (status === 401 || status === 403 || tipo === "authorization_error")
    return "fal.ai no permitió consultar el saldo: esta consulta exige una clave con alcance «Admin». Crea una en fal.ai/dashboard/keys (alcance Admin) y guárdala como FAL_ADMIN_KEY.";
  if (status === 429 || tipo === "rate_limited") return "fal.ai recibió demasiadas consultas. Espera unos segundos y vuelve a intentar.";
  if (status >= 500) return "fal.ai tuvo un problema temporal al consultar el saldo. Vuelve a intentar en un momento.";
  return "No se pudo consultar el saldo de fal.ai.";
}

/** «USD 24.50» (el saldo siempre con 2 decimales). */
export function formatearSaldo(valor: number, moneda: string): string {
  return `${moneda || "USD"} ${valor.toFixed(2)}`;
}
