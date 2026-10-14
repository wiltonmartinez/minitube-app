// Qué guarda PrompTUBE en el navegador (lo que cubre su historial de versiones) y la foto automática «antes de editar».
import { guardarAutomatica } from "./historial-datos";

export const CLAVES_PROMPTUBE = ["minitube.listas.v1", "minitube.catalogo.v1"];

/** Guarda cómo estaban los menús antes de editarlos (como mucho una vez cada 10 minutos). Nunca lanza. */
export function fotoAntesDeEditarMenus(): void {
  try {
    guardarAutomatica(window.localStorage, "promptube", CLAVES_PROMPTUBE, "Antes de editar los menús del panel");
  } catch {
    /* sin almacenamiento */
  }
}
