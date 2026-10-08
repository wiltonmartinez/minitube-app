// Historial de versiones. La PRIMERA entrada es la versión actual (se muestra en la app y en /cambios).
// Al publicar un cambio: añadir una entrada nueva arriba y subir "version" en package.json.
export type Cambio = {
  version: string;
  fecha: string; // AAAA-MM-DD
  titulo: string;
  cambios: string[];
};

export const CHANGELOG: Cambio[] = [
  {
    version: "2.0.0",
    fecha: "2026-10-08",
    titulo: "Motor de arquetipos paramétricos y sincronización estricta",
    cambios: [
      "Arquetipos estructurados (id, género, etnia, edad, cabello y rasgos faciales: forma de cara, ojos, cejas, nariz y boca) como fuente única de verdad.",
      "Con un arquetipo activo (manual o con el azar), Género, Edad, Etnia, Cabello y Rasgos se sincronizan y se muestran bloqueados: no puede haber contradicciones.",
      "Nuevo selector «Postura de las manos»: con «Manos a la cabeza» el accesorio se fuerza a «Ninguno» y se bloquea; con accesorio, solo cable USB o celular.",
      "El prompt compone el personaje con todos los rasgos del arquetipo (cara, ojos, cejas, nariz y boca).",
    ],
  },
  {
    version: "1.10.0",
    fecha: "2026-10-08",
    titulo: "Cerebro de Postura (anatomía exacta de 2 manos)",
    cambios: [
      "Máquina de estados mutuamente excluyente: celular → una mano lo sostiene abajo y la otra se apoya o gesticula; cable USB → una mano lo sostiene frente a la cámara y la otra descansa; manos a la cabeza → las dos a los lados de la cabeza y sin accesorio.",
      "Prohibido llevar una mano a la cabeza, nariz, ojos o rostro cuando hay un objeto en la mano.",
      "Los gestos de manos por profesión ya no se usan en el prompt: la postura la decide solo el accesorio (campo «Manos» ahora refleja la postura).",
      "Regla de oro de anatomía: exactamente dos brazos y dos manos, cero extras ni duplicaciones.",
    ],
  },
  {
    version: "1.9.0",
    fecha: "2026-10-08",
    titulo: "Banco de 12 arquetipos físicos aleatorios",
    cambios: [
      "Nuevo banco de 12 arquetipos radicalmente distintos (calvo con barba tupida, joven asiático, rubia europea, afrodescendiente rapado a los lados, latina de rizos, mujer canosa recogida, bigote y ondulado…).",
      "Cada generación sortea UN arquetipo y lo inyecta como descripción completa del personaje; nunca repite el mismo dos veces seguidas (ni en el lote).",
      "Selector «Arquetipo físico» con candado; «Ninguno» devuelve el control a los selectores manuales.",
      "Las gafas siguen controladas por su propio menú (aleatorias, pueden salir sin gafas).",
    ],
  },
  {
    version: "1.8.0",
    fecha: "2026-10-08",
    titulo: "Más diversidad y doble acción corporal prohibida",
    cambios: [
      "El cabello sorteado ahora combina estilo y color (negro, castaño, rubio, pelirrojo…); se añade «Calvo».",
      "Variación de identidad obligatoria: texto reforzado (barba o sin ella, gorra o sin ella, rostros distintos).",
      "Prohibición de doble acción corporal: con accesorio, la otra mano va firme sobre la mesa o estirada a un lado; nunca agarrando la cabeza.",
      "Mirada fija y alta a la izquierda (~15% sobre la esquina inferior); prohibido mirar celular, mano o hacia abajo.",
    ],
  },
  {
    version: "1.7.0",
    fecha: "2026-10-08",
    titulo: "Identidad única del personaje",
    cambios: [
      "Cada generación rota género, edad (ahora hasta 56-65) y etnia (se añaden caucásica, afrodescendiente, asiática del Este, sudasiática y árabe).",
      "Nuevos selectores aleatorios de Cabello (corto, rizado, recogido, lacio, trenzas, con gorra lisa sin logos…) y Rasgos faciales (estructura del rostro, barba, pecas…).",
      "Regla de identidad única en el prompt: prohibido repetir la misma persona o rostros similares.",
      "Candados también en Género, Edad, Cabello y Rasgos; el lote al azar diversifica cada prompt.",
    ],
  },
  {
    version: "1.6.0",
    fecha: "2026-10-08",
    titulo: "Postura limpia con accesorio y mirada alta",
    cambios: [
      "Con cable USB o teléfono, la mano libre se apoya en la mesa o gesticula a un lado: prohibido tocarse la nariz, los ojos o cubrirse el rostro.",
      "Mirada fija y alta a la izquierda (~15% sobre la esquina inferior); prohibido mirar abajo, la mano, el celular o la cámara.",
      "Anatomía: dos brazos y dos manos con proporciones perfectas.",
    ],
  },
  {
    version: "1.5.1",
    fecha: "2026-10-08",
    titulo: "Mirada 8% más arriba",
    cambios: ["La elevación de la mirada sube otro 8%: de 10%-15% a 18%-23% más arriba que la esquina inferior absoluta."],
  },
  {
    version: "1.5.0",
    fecha: "2026-10-08",
    titulo: "Mirada elevada 10%-15%",
    cambios: [
      "La mirada y la cabeza apuntan al sector medio-izquierdo, 10%-15% más arriba que la esquina inferior absoluta, dentro del área libre.",
      "Anatomía reforzada: sin extremidades fantasma ni manos de más; el accesorio es pasivo y nunca es observado por los ojos.",
    ],
  },
  {
    version: "1.4.0",
    fecha: "2026-10-08",
    titulo: "Anatomía, mirada y accesorio pasivo",
    cambios: [
      "Directiva de anatomía perfecta: exactamente dos brazos y dos manos, sin extremidades, dedos ni manos flotantes extra.",
      "Regla suprema de la mirada: prohibido mirar el objeto en la mano; cabeza girada y mirada desorbitada fija en la esquina inferior izquierda.",
      "Con cable USB o teléfono, el accesorio se sostiene de forma pasiva y secundaria; toda la atención va al espacio del error.",
    ],
  },
  {
    version: "1.3.0",
    fecha: "2026-10-08",
    titulo: "Versiones y página de cambios",
    cambios: [
      "Número de versión visible en la app (y commit desplegado en Vercel) para distinguir qué versión se está usando.",
      "Nueva página /cambios con el historial de versiones.",
    ],
  },
  {
    version: "1.2.0",
    fecha: "2026-10-08",
    titulo: "Candados por variable",
    cambios: [
      "Candado 🔓/🔒 en Profesión, Etnia, Gafas, Accesorio, Marco, Badge y Paleta.",
      "Una variable bloqueada no cambia con «Generar al Azar», con el lote al azar ni con el re-sorteo automático.",
      "Vestimenta, Emociones, Manos y Fondo usan el candado de la Profesión.",
      "Al bloquear una opción «🎲 Aleatorio», se fija el valor sorteado en ese momento.",
    ],
  },
  {
    version: "1.1.0",
    fecha: "2026-10-08",
    titulo: "Dirección visual absoluta de la mirada",
    cambios: [
      "Regla imperativa: ojos muy abiertos y mirada fija y tensa hacia el sector inferior izquierdo (espacio del error), sin importar el accesorio.",
      "Prohíbe mirar a la cámara, al objeto o a la pantalla del teléfono.",
    ],
  },
  {
    version: "1.0.0",
    fecha: "2026-10-08",
    titulo: "Rediseño en 4 bloques y reglas de prompt",
    cambios: [
      "Formulario en 4 bloques con controlador maestro por profesión (16 perfiles).",
      "Editor de menús del panel maestro (guarda en localStorage).",
      "Marca de agua sutil «ResetEnLinea.com» en la esquina inferior izquierda.",
      "Accesorios en las manos (cable USB, teléfono, sin objeto) sorteados según el perfil.",
      "Espacio negativo inferior izquierdo, anti-logos en la ropa, impresoras de la marca al fondo desenfocado.",
      "Badges con placa e ícono (el azar nunca elige «Ninguno»), paletas de color y gafas aleatorias.",
      "Zonas seguras de YouTube y autogeneración del prompt en tiempo real.",
    ],
  },
  {
    version: "0.4.0",
    fecha: "2026-10-07",
    titulo: "Lote al azar y descarga ZIP",
    cambios: ["Lote al azar de N prompts.", "Descarga en ZIP con un .txt por prompt."],
  },
  {
    version: "0.3.0",
    fecha: "2026-10-07",
    titulo: "Lotes y estabilidad",
    cambios: ["Descarga de lotes (.txt).", "Modelo más estable y reintentos para evitar timeouts en producción."],
  },
  {
    version: "0.2.0",
    fecha: "2026-10-07",
    titulo: "Formulario ampliado",
    cambios: ["Nuevos menús, badges, gestos y aleatorización.", "Prompts para Gemini sin URLs de referencia."],
  },
  {
    version: "0.1.0",
    fecha: "2026-10-07",
    titulo: "Primera versión",
    cambios: ["Generador de prompts para miniaturas con Next.js y Gemini."],
  },
];

export const VERSION = CHANGELOG[0].version;
// Commit desplegado: lo inyecta Vercel; en local aparece «local»
export const COMMIT = (process.env.NEXT_PUBLIC_COMMIT ?? "local").slice(0, 7);
