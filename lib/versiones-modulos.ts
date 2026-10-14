// Versión y historial de cambios de cada módulo (independientes de la versión general de la app, que está en lib/changelog.ts).
// La versión actual es la primera de la lista. Al cambiar un módulo: añadir una entrada arriba.
import type { Modulo } from "./modulos";

export type VersionModulo = { version: string; fecha: string; titulo: string; cambios: string[] };

export const VERSIONES_MODULOS: Record<Modulo, VersionModulo[]> = {
  textube: [
    { version: "1.4.0", fecha: "2026-10-14", titulo: "Historial de versiones de tus datos", cambios: ["Se guardan versiones de tus menús, variables y plantillas (solas, antes de editar, o cuando tú lo pides) y puedes volver a cualquiera.", "Cada módulo muestra su propia versión y su historial."] },
    { version: "1.3.0", fecha: "2026-10-14", titulo: "Las plantillas originales usan {accion}", cambios: ["«Reset» de la descripción pasa a {accion} y «reset» de las etiquetas a {accion_h}."] },
    { version: "1.2.0", fecha: "2026-10-14", titulo: "Variables propias", cambios: ["Variables con su lista de valores (Acción: Reset, Diagnóstico, Activación) y sus marcadores {x}, {x_l}, {x_h}.", "Botones para insertar marcadores en el editor de plantillas."] },
    { version: "1.1.0", fecha: "2026-10-14", titulo: "Menús editables", cambios: ["Crear, cambiar y eliminar marcas, errores sugeridos, opciones de error y plantillas propias.", "Copia de seguridad en un archivo."] },
    { version: "1.0.0", fecha: "2026-10-13", titulo: "TexTUBE dentro de la app", cambios: ["Generar títulos, descripción y etiquetas, aplicarlos al video con respaldo y deshacer.", "Resultados idénticos a los de Gestor TUBE; acceso con contraseña."] },
  ],
  promptube: [
    { version: "2.2.0", fecha: "2026-10-14", titulo: "Historial de versiones de tus menús", cambios: ["Versiones de los menús y del catálogo que editas, con opción de volver a una anterior.", "Nuevo nombre PrompTUBE y descripción propia."] },
    { version: "2.1.0", fecha: "2026-10-13", titulo: "Envío a CapaTUBE", cambios: ["Pega la imagen de Gemini o ChatGPT y mándala a CapaTUBE como fondo, guardada en la carpeta de su enfoque."] },
    { version: "2.0.0", fecha: "2026-10-13", titulo: "«Aleatorio» por defecto", cambios: ["Género, edad, emoción, etnia, rostro, gafas, dispositivo, profesión y mirada arrancan en «🎲 Aleatorio» y respetan el enfoque."] },
    { version: "1.0.0", fecha: "2026-10-10", titulo: "Enfoques estratégicos", cambios: ["Enfoques 1 a 4 (autoridad, pánico, solución del experto, cliente salvado) con edad, emoción, mirada y dispositivo coherentes."] },
  ],
  capatube: [
    { version: "1.3.0", fecha: "2026-10-14", titulo: "Ocultar la descripción y versión propia", cambios: ["Botón para esconder la descripción y ganar espacio.", "Versión e historial propios del módulo."] },
    { version: "1.2.0", fecha: "2026-10-14", titulo: "Tema oscuro y pestañas", cambios: ["Mismo aspecto que TexTUBE y PrompTUBE: tema oscuro, letra de la app y pestañas con estilo de navegador."] },
    { version: "1.1.0", fecha: "2026-10-13", titulo: "Más fácil de usar", cambios: ["Clic sobre la capa para elegirla, flechas del teclado, pestañas Capas / Fondo / Guardar, guía de 3 pasos y secciones plegables."] },
    { version: "1.0.0", fecha: "2026-10-13", titulo: "CapaTUBE dentro de la app", cambios: ["Editor de capas independiente de Python: guarda en una carpeta real o en el navegador.", "Carpeta de entrada de fondos por enfoque y variaciones L3210-01, -02… con candado."] },
  ],
};

export const versionActual = (m: Modulo) => VERSIONES_MODULOS[m][0].version;
