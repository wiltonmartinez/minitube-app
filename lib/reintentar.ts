/**
 * fetch que insiste cuando la conexión se corta (internet inestable): reintenta si la petición ni siquiera llegó a conectar
 * («Failed to fetch») o tardó demasiado, con una espera creciente. NO reintenta si el servidor sí respondió (aunque sea con error).
 * Úsalo en lecturas y en acciones que se pueden repetir sin riesgo (entrar, pedir el enlace). No en las que crean o borran datos.
 */
export async function fetchConReintentos(url: string, init?: RequestInit, opciones: { intentos?: number; esperaMs?: number; tiempoMaxMs?: number } = {}): Promise<Response> {
	const { intentos = 4, esperaMs = 700, tiempoMaxMs = 12_000 } = opciones;
	for (let i = 0; i < intentos; i++) {
		const control = new AbortController();
		const reloj = setTimeout(() => control.abort(), tiempoMaxMs);
		try {
			return await fetch(url, { ...init, signal: control.signal });
		} catch {
			// sin conexión o demasiado lento: se vuelve a intentar
		} finally {
			clearTimeout(reloj);
		}
		if (i < intentos - 1) await new Promise((ok) => setTimeout(ok, esperaMs * (i + 1)));
	}
	throw new Error("No se pudo conectar: tu internet está inestable. Espera unos segundos y vuelve a intentarlo.");
}
