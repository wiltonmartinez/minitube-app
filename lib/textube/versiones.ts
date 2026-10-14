// Qué guarda TexTUBE en el navegador (lo que cubre su historial de versiones) y la foto automática «antes de editar».
import { guardarAutomatica } from "../historial-datos";

export const CLAVES_TEXTUBE = ["textube:config", "textube:plantillas"];

/** Guarda cómo estaba todo antes de editar (como mucho una vez cada 10 minutos). Nunca lanza. */
export function fotoAntesDeEditar(motivo: string): void {
  try {
    guardarAutomatica(window.localStorage, "textube", CLAVES_TEXTUBE, motivo);
  } catch {
    /* sin almacenamiento */
  }
}
