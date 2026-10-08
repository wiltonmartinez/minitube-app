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
    version: "4.0.0",
    fecha: "2026-10-08",
    titulo: "API pública del motor de miniaturas (para TexTube)",
    cambios: [
      "Nuevo POST /api/v1/thumbnail: recibe marca, modelo y error y devuelve el prompt para la imagen (inglés) y el prompt de Gemini (español); opcionalmente genera la imagen.",
      "Seguridad: exige «Authorization: Bearer <MINITUBE_API_TOKEN>» (401 sin token; si el servidor no lo tiene configurado, queda cerrada con 503).",
      "Generación asíncrona por la cola de fal.ai: POST responde 202 con un id firmado y GET /api/v1/thumbnail/{id} consulta el estado.",
      "Errores en JSON y en español: 400 datos inválidos, 401 sin token, 429 cuota agotada (con el prompt de Gemini incluido), 502 fallo del proveedor.",
      "Misma escena con la misma semilla; enfoque «error» (pánico) o «solución» (alivio). Modo simulación sin FAL_KEY.",
      "Enrutador de prioridad: los plotters F570, F571, T3170 y T3170X (se reconocen aunque se escriban «SC-F570», «SureColor F571» o «sc t3170x») son prioridad ALTA: Seedream 5.0 Pro, plano detalle, mujer joven de 20 a 30 años, profesión de sublimación, vinilo o fotografía y plotters de la marca en el fondo.",
      "El resto de modelos son prioridad NORMAL con FLUX.2 Pro (≈ USD 0.03). Con MINITUBE_MODELO_NORMAL=manual no se genera nada y la API devuelve el prompt de Gemini (429).",
      "El panel web aplica y muestra la prioridad alta al escribir uno de esos plotters en el bloque 1: bloquea plano, modo y modelo de IA y limita profesión y arquetipo.",
    ],
  },
  {
    version: "3.6.0",
    fecha: "2026-10-08",
    titulo: "Ver los créditos de fal.ai",
    cambios: [
      "Nuevo botón «Ver saldo» en el panel de generación: muestra los créditos de tu cuenta de fal.ai (solo cuando lo pulsas; es una consulta gratuita de solo lectura).",
      "La consulta exige una clave de fal.ai con alcance «Admin»: se usa FAL_ADMIN_KEY si la configuras o, si no, FAL_KEY; si no tiene alcance Admin, la app te explica cómo crearla.",
      "Sin clave, avisa de que está en modo simulación.",
    ],
  },
  {
    version: "3.5.0",
    fecha: "2026-10-08",
    titulo: "Todo al azar excepto marca, modelo y error",
    cambios: [
      "«Generar al Azar» y el lote al azar sortean ahora TODO salvo marca, modelo y error: persona (arquetipo o personalización), profesión, plano, marco, idioma, gafas, postura o accesorio, paleta y badge.",
      "Antes plano, idioma y género/edad eran fijos en el azar; ahora también cambian.",
      "Nuevos candados 🔒 en Plano, Idioma, Modo del personaje y Rostro; los campos bloqueados siguen sin cambiar.",
    ],
  },
  {
    version: "3.4.0",
    fecha: "2026-10-08",
    titulo: "10 arquetipos de mujeres latinas de 20 a 30 años",
    cambios: [
      "Diez arquetipos nuevos de mujeres de 20 a 30 años de países distintos: México, Colombia (costa Caribe), Argentina, Chile, Perú, Venezuela, Cuba, Brasil, Ecuador y Costa Rica.",
      "Cada una es diferente en cabello, rostro, ojos, piel y cuerpo, con belleza natural y armónica (atractivas pero reales, con textura de piel realista).",
      "El prompt nombra el país de origen en lugar de una etnia genérica. Ahora hay 30 arquetipos.",
    ],
  },
  {
    version: "3.3.0",
    fecha: "2026-10-08",
    titulo: "Postura: escribiendo en una laptop",
    cambios: [
      "Nueva postura «Escribiendo en una laptop»: las dos manos teclean en UNA laptop abierta sobre la mesa, a la derecha-centro del encuadre y lejos de las esquinas inferiores, con la tapa lisa y sin logos.",
      "El personaje escribe mientras mira aterrado al espacio vacío; la mirada nunca va al teclado ni a la pantalla.",
      "El accesorio queda forzado a «Ninguno» y bloqueado; el sorteo «según perfil» reparte ahora entre 7 opciones.",
    ],
  },
  {
    version: "3.2.0",
    fecha: "2026-10-08",
    titulo: "Gafas elegantes metálicas",
    cambios: [
      "Nuevas gafas elegantes de montura metálica fina: doradas y plateadas, como alternativa sobria a las de pasta gruesa estilo vidIQ.",
      "El sorteo «Aleatorio» incluye ahora los 7 estilos (o ninguna).",
      "Las gafas del prompt de la API ahora van en inglés, con cristales claros para que los ojos se vean siempre y sin logos en la montura.",
    ],
  },
  {
    version: "3.1.0",
    fecha: "2026-10-08",
    titulo: "Más accesorios: portátil, tablet y manos en la impresora",
    cambios: [
      "Nuevos accesorios en la mano: portátil (cerrado, junto al pecho) y tablet (con la pantalla encendida, junto al pecho).",
      "Nueva postura «Ambas manos en la impresora»: las dos manos tocan la MISMA impresora del modelo seleccionado, sobre la mesa y lejos de las esquinas inferiores (la única impresora que se ve de cerca; las demás siguen al fondo).",
      "Mismas reglas anatómicas: una mano sostiene el objeto y la otra descansa o gesticula; prohibido tocarse la cabeza o la cara.",
      "El sorteo «según perfil» reparte ahora entre 6 opciones (los perfiles técnicos tienden al cable, al portátil y a las manos en la impresora).",
      "La mirada sigue prohibida hacia cualquier accesorio.",
    ],
  },
  {
    version: "3.0.0",
    fecha: "2026-10-08",
    titulo: "De generador de prompts a generador de miniaturas",
    cambios: [
      "Generación de imágenes 16:9 por API (fal.ai) con 4 modelos a elegir: GPT Image 2, Nano Banana Pro, Seedream 5.0 Pro y FLUX.2 Pro, con costo aproximado a la vista y descarga en PNG.",
      "Modo simulación sin costo cuando no hay clave FAL_KEY, para probar toda la interfaz.",
      "Prompt para la API en inglés, sin porcentajes (la mirada se describe con el espacio), con interruptor «Texto 3D dentro de la imagen» y restricciones negativas al final. El prompt para Gemini se conserva.",
      "Bloque 2 rediseñado: «Arquetipo listo» (20 arquetipos de 20 a 70 años) o «Personalizar» (estilo facial o detalle completo: rostro, ojos, cejas, nariz, labios, cabello, vello, complexión y hombros), con validador de armonía y cuerpo según el plano (siempre de la cintura hacia arriba).",
      "Listas del personaje editables desde «Editar menús del panel maestro».",
      "Foto de referencia del personaje (Nano Banana Pro y FLUX.2 Pro), referencias guardadas e historial local de miniaturas.",
      "Variantes A/B para «Probar y comparar» de YouTube Studio: pánico, sorpresa y alivio, con paleta y badge distintos (respetan los candados) y confirmación antes de gastar dinero real.",
      "El lote (ZIP) puede incluir las imágenes generadas y el prompt enviado a la API.",
      "Pruebas automáticas con Vitest (60 pruebas).",
    ],
  },
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
