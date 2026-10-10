// GENERADOR DE ESCENARIOS para videos: miniatura, gancho narrativo, desarrollo y llamado a la acción.
//
// A partir de la marca, el modelo y el error (Bloque 1) y la profesión del cliente (Bloque 3) arma un escenario con 4 partes:
//   1. 🎨 El gancho visual (ideas para la miniatura)
//   2. 🔥 El gancho narrativo (primeros 5 segundos)
//   3. 📉 El desarrollo (mostrando el problema)
//   4. 💻 El llamado a la acción (la solución inmediata)
//
// Regla de negocio: el servicio vende SOLO la instalación remota de software hecha por un experto. No se venden licencias sueltas
// y no se hacen reparaciones físicas. Todo el guion habla de rapidez, solución digital y cero desarme (salvo la limpieza previa que
// exige el error 0014BD, que el guion dice con claridad para no prometer de más).
//
import { esPerfilTecnico, posturaDispositivo } from "@/lib/prompt-config";

// Es determinista: la misma semilla da el mismo guion; otra semilla da otra variante. También entrega el prompt completo para
// pegarlo en Claude o ChatGPT cuando se quiera una versión más creativa.

export type DatosProfesion = {
  personaje: string; // quién aparece y qué emoción muestra (miniatura)
  fondo: string; // escenario desenfocado
  negocio: string; // «tu negocio de sublimación»
  perdida: string; // lo que se pierde por tener el equipo parado
  broll: string; // plano de apoyo del negocio
  corto: string; // texto corto de miniatura propio de la profesión
};

/** Enfoque 3 (técnicos e ingenieros): ganchos de autoridad y seguridad, sin pánico ni pérdida de dinero. */
/** Enfoque 4 (cliente salvado): el software ya funcionó, la máquina vuelve a imprimir. */
const GANCHOS_EXITO = [
  "Hace unos minutos tu equipo estaba bloqueado… y mira cómo está imprimiendo ahora. Así de rápido se resuelve, sin llevarlo a ningún taller.",
  "¿Ves ese papel saliendo? Hace nada estaba parado y no imprimía: lo resolvimos por software, en minutos.",
  "Ya está imprimiendo otra vez, y no tuve que desarmar nada. Te cuento cómo se hizo.",
];
const CORTOS_EXITO = ["¡VOLVIÓ A IMPRIMIR!", "¡SALVADO!", "¡FUNCIONÓ!"];
const GANCHOS_EXPERTO = [
  "Si un cliente te trae un equipo bloqueado, no lo abras ni lo desarmes: hay una forma de dejarlo funcionando en minutos, y es por software.",
  "Esta es la herramienta que usan los técnicos que ya no pierden horas con equipos bloqueados: instalación remota y listo.",
  "Cuando el cliente cree que no tiene arreglo, tú lo resuelves en minutos y sin tocar un destornillador. Te muestro cómo.",
];
const CORTOS_EXPERTO = ["¡SOLUCIONADO!", "SOLUCIÓN REMOTA", "SIN DESARMAR"];

export const PROFESIONES_GUION: Record<string, DatosProfesion> = {
  "Asistente Corporativa": { personaje: "Asistente corporativa con blusa formal y gafas, con una mano en la frente y la otra sobre una pila de papeles", fondo: "Oficina moderna desenfocada con luz azulada", negocio: "tu oficina", perdida: "reportes, facturas y documentos que tu jefe espera hoy", broll: "la bandeja de impresión vacía y el reloj de la oficina", corto: "¡OFICINA PARADA!" },
  Teletrabajadora: { personaje: "Teletrabajadora en su escritorio de casa, con las manos en la cabeza frente a la laptop y la impresora", fondo: "Escritorio de home office con luces LED", negocio: "tu trabajo desde casa", perdida: "contratos y entregables que tienes que imprimir y firmar hoy", broll: "tu escritorio de home office con papeles pendientes", corto: "¡NO PUEDO IMPRIMIR!" },
  Recepcionista: { personaje: "Recepcionista tras el mostrador, con gesto de alarma mirando la impresora mientras otros esperan", fondo: "Recepción moderna con iluminación cálida", negocio: "tu recepción", perdida: "recibos, formularios y turnos de clientes que están esperando", broll: "la fila de clientes frente al mostrador", corto: "¡CLIENTES ESPERANDO!" },
  Coordinadora: { personaje: "Coordinadora con una carpeta en la mano y cara de urgencia, mirando la impresora bloqueada", fondo: "Sala de control con luz ambiental azul", negocio: "tu área", perdida: "horarios, listados y órdenes del día que tu equipo necesita ya", broll: "las hojas del día sin imprimir sobre el escritorio", corto: "¡EQUIPO ESPERANDO!" },
  "Diseñador(a) Gráfico": { personaje: "Diseñadora gráfica con una pantalla de pruebas de color detrás, agarrándose la cabeza frente a la impresora", fondo: "Estudio creativo con luces RGB moradas", negocio: "tu estudio de diseño", perdida: "pruebas de color y entregas a clientes con fecha límite", broll: "las pruebas de color pendientes sobre la mesa", corto: "¡ENTREGA EN RIESGO!" },
  Sublimación: { personaje: "Dueña de un negocio de estampados con delantal de taller, sosteniendo una taza a medio terminar y con la otra mano en la frente", fondo: "Taller moderno con planchas térmicas y neón amarillo", negocio: "tu negocio de sublimación", perdida: "pedidos de tazas, camisetas y regalos que tienes que entregar", broll: "la plancha térmica apagada, los pedidos apilados y el reloj de pared", corto: "¡NO IMPRIME!" },
  Fotografía: { personaje: "Fotógrafo(a) con una cámara colgando del cuello y una foto impresa a medias en la mano, con cara de pánico", fondo: "Estudio fotográfico con aros de luz y paneles LED azules", negocio: "tu estudio fotográfico", perdida: "fotos impresas y álbumes que tus clientes vienen a recoger", broll: "los aros de luz encendidos y el álbum a medio imprimir", corto: "¡FOTOS SIN IMPRIMIR!" },
  Fotocopias: { personaje: "Encargado(a) de un centro de copiado, con las manos en la cabeza junto a la fila de clientes", fondo: "Centro de copiado tecnológico con letreros luminosos", negocio: "tu centro de copiado", perdida: "la fila de clientes que espera sus copias e impresiones", broll: "la fila de clientes y el letrero de «copias» encendido", corto: "¡CLIENTES ESPERANDO!" },
  "Impresión en vinilo": { personaje: "Dueño(a) de un taller de vinilo con un rollo en la mano y gesto de desesperación frente al equipo", fondo: "Taller de gran formato con luces cian y magenta", negocio: "tu taller de vinilo", perdida: "rótulos, calcomanías y pedidos de gran formato con fecha de entrega", broll: "los rollos de vinilo sin usar y los pedidos pendientes", corto: "¡TALLER PARADO!" },
  "Profesor(a) Primaria": { personaje: "Profesora de primaria con una guía en la mano y los ojos muy abiertos frente a la impresora del aula", fondo: "Aula inteligente con pizarra digital brillante", negocio: "tu aula", perdida: "guías y evaluaciones que tus estudiantes necesitan mañana", broll: "la pizarra del aula y las guías sin imprimir", corto: "¡CLASE EN RIESGO!" },
  "Profesor(a) Bachillerato": { personaje: "Profesor de bachillerato con un examen en la mano y gesto de alarma ante la impresora bloqueada", fondo: "Sala de profesores moderna con luz azulada", negocio: "tu clase", perdida: "exámenes y talleres que tienes que entregar a tus estudiantes", broll: "los exámenes sin imprimir y el reloj de la sala de profesores", corto: "¡EXAMEN SIN IMPRIMIR!" },
  "Técnico de Impresoras": { personaje: "Técnico de impresoras con herramientas en la mesa y cara de frustración frente a un equipo bloqueado", fondo: "Escritorio de técnico con luces LED", negocio: "tu taller de servicio técnico", perdida: "clientes con equipos en espera y trabajos acumulados", broll: "la mesa de trabajo con varios equipos pendientes", corto: "¡EQUIPOS EN ESPERA!" },
  "Técnico de computadores": { personaje: "Técnico de computadores con una torre abierta detrás, mirando con angustia la impresora bloqueada de un cliente", fondo: "Estudio gamer con luces RGB o espacio digital oscuro", negocio: "tu servicio técnico", perdida: "clientes que esperan su equipo y tickets sin cerrar", broll: "los equipos de clientes en fila y las herramientas sobre la mesa", corto: "¡CLIENTE ESPERANDO!" },
  "Ingeniero de sistemas": { personaje: "Ingeniero de sistemas frente a un monitor con tickets de soporte, con las manos en la cabeza ante la impresora", fondo: "Centro de servidores con luces de neón", negocio: "tu oficina de TI", perdida: "tickets de soporte y reportes que dependen de esa impresora", broll: "el monitor con la lista de tickets pendientes", corto: "¡TICKETS SIN CERRAR!" },
  "Administrador de Empresa": { personaje: "Administrador(a) de empresa de traje, con un contrato en la mano y expresión de urgencia frente a la impresora", fondo: "Oficina ejecutiva de cristal con ciudad de fondo", negocio: "tu empresa", perdida: "facturas, contratos y reportes que necesitas para hoy", broll: "la oficina ejecutiva y los documentos pendientes de firma", corto: "¡DOCUMENTOS PARADOS!" },
  Litografía: { personaje: "Operario(a) de litografía con un pliego en la mano y gesto de alarma ante el equipo detenido", fondo: "Sala de producción gráfica con iluminación industrial", negocio: "tu litografía", perdida: "trabajos de impresión por encargo con fecha de entrega", broll: "los pliegos sin imprimir y el reloj de producción", corto: "¡PRODUCCIÓN PARADA!" },
};

/** Profesión que no está en la tabla (por ejemplo una agregada en «Editar menús del panel maestro»): se usa un texto genérico con su fondo. */
export function datosProfesion(nombre: string, fondoCatalogo?: string): DatosProfesion {
  return (
    PROFESIONES_GUION[nombre] ?? {
      personaje: `Persona que trabaja como ${nombre}, con las manos en la cabeza frente a la impresora bloqueada`,
      fondo: fondoCatalogo || "Lugar de trabajo desenfocado con sensación de urgencia",
      negocio: "tu trabajo",
      perdida: "los trabajos que tienes que entregar hoy",
      broll: "tu lugar de trabajo con los pendientes sobre la mesa",
      corto: "¡TRABAJO PARADO!",
    }
  );
}

export type InfoError = {
  mensaje: string; // lo que se ve en pantalla (b-roll)
  luces: string;
  porque: string[]; // explicación breve
  cortos: string[]; // textos de la miniatura (máximo 3 palabras)
  previo?: string; // paso previo que exige el error
  revisar?: string; // aviso: revisar el texto antes de grabar
};

const REPARACION =
  "cambiar o lavar las almohadillas no quita el aviso; lo que lo quita es reiniciar el contador del 100 % al 0 %";

const ERRORES_GUION: Record<string, InfoError> = {
  ALMOHADILLAS: {
    mensaje: "«Una almohadilla de tinta de la impresora está al final de su vida útil. Póngase en contacto con el servicio técnico de Epson.»",
    luces: "la luz de error parpadeando y el panel sin dejar imprimir",
    porque: ["el contador de almohadillas llegó a su límite y la impresora se bloquea por software: no está rota", REPARACION, "si el negocio sigue parado, la tinta se seca y puede tapar los cabezales: esperar sale más caro"],
    cortos: ["¡NO IMPRIME!", "¡BLOQUEADA!", "¡ALMOHADILLAS!"],
  },
  "E-11": {
    mensaje: "el código «E-11 · Error de tampón» en la pantalla de la impresora (y el aviso de almohadillas en el PC)",
    luces: "la pantalla de la impresora mostrando E-11",
    porque: ["el contador del tampón (las almohadillas) llegó a su límite y el equipo se bloquea por software", "cambiar o lavar las almohadillas no lo soluciona: hay que reiniciar el contador", "mientras tanto la tinta se seca y el problema se encarece"],
    cortos: ["¡ERROR E-11!", "¡BLOQUEADA!", "¡NO IMPRIME!"],
  },
  "5B00": {
    mensaje: "el «Código de asistencia 5B00» (absorbedor de tinta lleno) en el PC y en la pantalla de la impresora",
    luces: "las luces de la impresora parpadeando",
    porque: ["el absorbedor de tinta (las almohadillas) está lleno según el contador y la impresora se bloquea por software", "cambiar o lavar el absorbedor no quita el error; lo quita reiniciar el contador del 100 % al 0 %", "cada día sin imprimir, la tinta se seca y puede tapar los cabezales"],
    cortos: ["¡ERROR 5B00!", "¡BLOQUEADA!", "¡NO IMPRIME!"],
  },
  "1700": {
    mensaje: "el aviso «1700» (absorbedor de tinta casi lleno) en el PC y en la pantalla de la impresora",
    luces: "el aviso en pantalla y las luces de la impresora",
    porque: ["el 1700 es el aviso previo: el bloqueo 5B00 llega en pocas impresiones", "conviene resolverlo ahora, antes de que se detenga en pleno trabajo", "lavar o cambiar el absorbedor no quita el aviso; lo quita reiniciar el contador"],
    cortos: ["¡AVISO 1700!", "¡SE BLOQUEARÁ!", "¡ANTES DEL 5B00!"],
  },
  P07: {
    mensaje: "el código «P07» en la impresora (que en el PC aparece como «Código de asistencia 5B00»)",
    luces: "las luces de la impresora parpadeando con el código",
    porque: ["el absorbedor de tinta está lleno según el contador y la impresora se bloquea por software", "cambiar o lavar el absorbedor no quita el error; lo quita reiniciar el contador", "cada día sin imprimir, la tinta se seca y puede tapar los cabezales"],
    cortos: ["¡ERROR P07!", "¡BLOQUEADA!", "¡NO IMPRIME!"],
  },
  E08: {
    mensaje: "el aviso «E08» en la impresora (en el PC: «1700», absorbedor casi lleno)",
    luces: "las luces de la impresora indicando el aviso",
    porque: ["el E08 es el aviso previo: el bloqueo llega en pocas impresiones", "conviene resolverlo ahora, antes de que se detenga en pleno trabajo", "lavar o cambiar el absorbedor no quita el aviso; lo quita reiniciar el contador"],
    cortos: ["¡AVISO E08!", "¡SE BLOQUEARÁ!", "¡ANTES DEL P07!"],
  },
  "0014BD": {
    mensaje: "el «Error 0014BD» en la pantalla del plotter y en el PC",
    luces: "la pantalla del plotter con el error y el trabajo detenido",
    porque: ["el 0014BD lo activa el sensor de tinta: el plotter queda bloqueado por software y no imprime", "si queda tinta o suciedad cerca del sensor, el error vuelve después del reset", "cada hora parada es producción que no sale"],
    cortos: ["¡ERROR 0014BD!", "¡BLOQUEADO!", "¡NO IMPRIME!"],
    previo: "Este error exige un paso previo del cliente: limpiar bien el sensor de tinta y cambiar la almohadilla por una nueva antes del reset.",
  },
};
ERRORES_GUION.TAMPÓN = { ...ERRORES_GUION["E-11"], mensaje: "el código «E-11 · Error de tampón» en la pantalla de la impresora", cortos: ["¡ERROR DE TAMPÓN!", "¡BLOQUEADA!", "¡NO IMPRIME!"] };
ERRORES_GUION.COMBINADO = { ...ERRORES_GUION.ALMOHADILLAS, mensaje: "el aviso de almohadillas en el PC y el código «E-11» en la pantalla de la impresora", cortos: ["¡NO IMPRIME!", "¡BLOQUEADA!", "¡ERROR E-11!"] };
ERRORES_GUION["RESET PASS ADMIN"] = {
  mensaje: "la pantalla del plotter pidiendo la contraseña de administrador",
  luces: "la pantalla del plotter y el menú bloqueado",
  porque: ["el plotter exige una contraseña de administrador y no deja avanzar", "sin ese acceso, el equipo no se puede reiniciar ni configurar", "cada hora parada es producción que no sale"],
  cortos: ["¡PIDE CONTRASEÑA!", "¡BLOQUEADO!", "¡NO AVANZA!"],
  revisar: "No tengo el significado exacto de «reset pass admin» en este equipo: revisa la explicación antes de grabar.",
};

const CODIGO_AVISO = /^000[0-9A-F]000[0-9A-F]$/i;

/** Quita los prefijos de la lista del panel («Error 5b00», «Codigo 5b00») y deja el código en mayúsculas. */
export function normalizarErrorGuion(error: string): string {
  return error.trim().replace(/^(error|c[oó]digo)\s+/i, "").replace(/\s+/g, " ").toUpperCase();
}

export function infoError(errorCrudo: string): InfoError {
  const e = normalizarErrorGuion(errorCrudo);
  if (e === "ERROR ALMOHADILLAS") return ERRORES_GUION.ALMOHADILLAS;
  if (ERRORES_GUION[e]) return ERRORES_GUION[e];
  if (CODIGO_AVISO.test(e)) {
    const c = e.toLowerCase();
    return {
      mensaje: `el aviso «${c}» en la pantalla del plotter y en el PC`,
      luces: "las notificaciones que aparecen una y otra vez en el plotter y en el PC",
      porque: [`el ${c} es un aviso del contador: el plotter te advierte que muy pronto se va a bloquear`, "todavía imprime, pero las notificaciones no paran y, al bloquearse, la producción se detiene en pleno trabajo", "apagar y encender no quita el aviso: solo se borra con un reset"],
      cortos: [`¡AVISO ${c}!`, "¡SE BLOQUEARÁ!", "¡ANTES DEL BLOQUEO!"],
      revisar: "La explicación está escrita para el aviso 00000008; con otro código, confirma que el significado sea el mismo antes de grabar.",
    };
  }
  return {
    mensaje: `el mensaje de error «${errorCrudo.trim()}»`,
    luces: "las luces y la pantalla del equipo",
    porque: ["el equipo se bloqueó por software y no deja imprimir", "no es una falla física: se resuelve reiniciando lo que lo bloquea"],
    cortos: ["¡NO IMPRIME!", "¡BLOQUEADO!", "¡ERROR!"],
    revisar: "Este error no está en la lista conocida: el guion es genérico, completa el detalle del error antes de grabar.",
  };
}

export type Equipo = { nombre: string; etiqueta: string; tipo: "plotter" | "impresora"; bloqueado: string; el: string; lo: string };

/** Los SureColor (F570, F571, T3170…) son plotters (masculino); el resto, impresoras (femenino). Marca y modelo son opcionales. */
export function equipoGuion(marca: string, modelo: string, plotterForzado = false): Equipo {
  const m = modelo.trim().toUpperCase().replace(/^SC-?/, "");
  const marcaBonita = marca.trim() ? marca.trim().charAt(0).toUpperCase() + marca.trim().slice(1).toLowerCase() : "";
  const plotter = plotterForzado || /^(F57[01]|T3170X?)$/.test(m) || /sure\s*color|-sc$/i.test(marca);
  const nombre = plotter ? (m ? `Epson SureColor ${m}` : "") : `${marcaBonita} ${m}`.trim();
  const tipo = plotter ? "plotter" : "impresora";
  return plotter
    ? { nombre, etiqueta: nombre || tipo, tipo, bloqueado: "bloqueado", el: "el", lo: "lo" }
    : { nombre, etiqueta: nombre || tipo, tipo, bloqueado: "bloqueada", el: "la", lo: "la" };
}

const GANCHOS = [
  "Si {tu_equipo} de {negocio_corto} acaba de bloquearse y tienes {perdida}, cada hora parada es plata que no entra… y te cuento cómo salir de esto sin llevar{lo} a ningún taller.",
  "Imagina esto: {perdida}, y justo {tu_equipo} se bloquea y no imprime ni una hoja más. Mira esto.",
  "¿{tu_equipo_cap} {bloqueado} con {perdida} en juego? No {lo} lleves al técnico todavía: esto se resuelve por software.",
];

export type Escenario = {
  equipo: string;
  visual: { personaje: string; edadGenero?: string; fondo: string; elemento: string; manos?: string; textoCorto: string; alternativas: string[] };
  gancho: string;
  desarrollo: { broll: string[]; explicacion: string[] };
  cta: string;
  cierre: string;
  avisos: string[];
  texto: string;
};

const mayuscula = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);

export function generarEscenario(opts: { marca?: string; modelo?: string; error: string; profesion: string; plotter?: boolean; genero?: string; edadAnios?: number; dispositivo?: string; enfoque?: 1 | 2 | 3 | 4; experto?: boolean; fondoCatalogo?: string; semilla?: number }): Escenario {
  const { error, profesion } = opts;
  const marca = opts.marca ?? "";
  const modelo = opts.modelo ?? "";
  const n = Math.abs(Math.trunc(opts.semilla ?? 0));
  const p = datosProfesion(profesion, opts.fondoCatalogo);
  const err = infoError(error);
  const eq = equipoGuion(marca, modelo, opts.plotter);
  const tuEquipo = `tu ${eq.etiqueta}`;
  const equipoCapital = eq.nombre || `${mayuscula(eq.el)} ${eq.tipo}`;
  const negocioCorto = p.negocio.startsWith("tu ") ? p.negocio.slice(3) : p.negocio;
  const exito = opts.enfoque === 4; // Cliente Salvado: éxito y alivio
  const experto = !exito && (opts.experto ?? opts.enfoque === 3); // Solución del Experto: autoridad y seguridad, no pánico
  const ganchoBase = exito ? GANCHOS_EXITO[n % GANCHOS_EXITO.length] : experto ? GANCHOS_EXPERTO[n % GANCHOS_EXPERTO.length] : GANCHOS[n % GANCHOS.length];
  const gancho = ganchoBase
    .replace("{tu_equipo_cap}", mayuscula(tuEquipo))
    .replace("{tu_equipo}", tuEquipo)
    .replace("{bloqueado}", eq.bloqueado)
    .replace("llevar{lo}", `llevar${eq.lo}`)
    .replace("{lo}", eq.lo)
    .replace("{perdida}", p.perdida)
    .replace("{negocio_corto}", negocioCorto);
  const opcionesCorto = exito ? CORTOS_EXITO : experto ? CORTOS_EXPERTO : [...err.cortos, p.corto];
  const textoCorto = opcionesCorto[n % opcionesCorto.length];
  const alternativas = [...new Set(opcionesCorto)].filter((c) => c !== textoCorto).slice(0, 2);

  const edadGenero = opts.edadAnios
    ? `${opts.genero === "Mujer" ? "Mujer" : opts.genero === "Hombre" ? "Hombre" : "Persona"} de ${opts.edadAnios} años, con el rostro real de esa edad (no un modelo de stock).`
    : undefined;
  const postura = opts.dispositivo ? posturaDispositivo(opts.dispositivo, esPerfilTecnico(profesion), opts.enfoque) : null;
  const manos = postura ? `${opts.dispositivo}: ${postura.manosEs}.` : undefined;
  const visual = {
    personaje: exito
      ? `${profesion} con alivio y alegría: sonrisa amplia y ojos brillantes al ver cómo ${tuEquipo} vuelve a imprimir.`
      : experto
      ? `${profesion} con seguridad y autoridad: sonrisa confiada, mirada fija al frente y cuerpo inclinado hacia adelante, tras encontrar la herramienta remota que resuelve el equipo de su cliente.`
      : `${p.personaje}.`,
    edadGenero,
    manos,
    fondo: `${p.fondo}, con sensación de urgencia.`,
    elemento: exito
      ? `${tuEquipo} imprimiendo con normalidad, con el papel saliendo, sobre la mesa, a la derecha; el espacio de abajo a la izquierda queda libre.`
      : `${tuEquipo} ${eq.bloqueado} sobre la mesa, a la derecha, y el error visible (${err.mensaje}); el espacio de abajo a la izquierda queda libre para una foto o captura del error.`,
    textoCorto,
    alternativas,
  };
  const desarrollo = {
    broll: exito
      ? [`${equipoCapital} imprimiendo con normalidad.`, "El papel saliendo de la impresora, con la imagen terminada.", "Corte al cliente celebrando frente a su equipo funcionando."]
      : experto
      ? [`Primer plano de la pantalla con ${err.mensaje} en el equipo del cliente.`, `${equipoCapital} con ${err.luces}.`, "Corte al técnico, seguro y sonriente, instalando el software remoto desde su PC."]
      : [`Primer plano de la pantalla con ${err.mensaje}.`, `${equipoCapital} con ${err.luces}.`, `Corte rápido a ${p.broll}.`],
    explicacion: exito
      ? [`Hace unos minutos ${tuEquipo} estaba ${eq.bloqueado}; ahora vuelve a imprimir.`, "Se resolvió por software, con una instalación remota hecha por un experto, sin mover ni abrir la máquina."]
      : experto
      ? [...err.porque.map((s) => `${mayuscula(s)}.`), "Tu cliente espera su equipo y tú eres quien lo resuelve: con la herramienta remota lo dejas funcionando sin abrir nada."]
      : [...err.porque.map((s) => `${mayuscula(s)}.`), `Por eso ${p.negocio} está detenido: ${p.perdida} no pueden esperar.`],
  };
  const extra = err.previo ? " Antes de empezar te indicamos la limpieza previa que este error exige, para que el reset quede definitivo." : "";
  const cta = `La solución es por software. No tienes que desarmar nada ni llevar ${eq.el} ${eq.tipo} al técnico: conectas ${tuEquipo} por cable USB a tu PC con Windows y nosotros hacemos la instalación remota ahora mismo, en vivo y en minutos, para que sigas produciendo hoy.${extra}`;
  const cierre = "Cierre en pantalla: botón o enlace de WhatsApp y el aviso de que solo se atienden mensajes (sin llamadas).";
  const avisos = [err.previo, err.revisar].filter((a): a is string => !!a);

  const texto = [
    `ESCENARIO · ${eq.etiqueta} · ${error.trim()} · ${profesion}`,
    "",
    "1. 🎨 EL GANCHO VISUAL (miniatura)",
    `• Personaje y emoción: ${visual.personaje}`,
    ...(visual.edadGenero ? [`• Edad y género: ${visual.edadGenero}`] : []),
    ...(visual.manos ? [`• Dispositivo y postura de manos: ${visual.manos}`] : []),
    `• Fondo y contexto: ${visual.fondo}`,
    `• Elemento clave: ${visual.elemento}`,
    `• Texto corto: ${textoCorto}${alternativas.length ? `  (alternativas: ${alternativas.join(" · ")})` : ""}`,
    "",
    "2. 🔥 EL GANCHO NARRATIVO (primeros 5 segundos)",
    `«${gancho}»`,
    "",
    "3. 📉 EL DESARROLLO (mostrando el problema)",
    "En pantalla (b-roll):",
    ...desarrollo.broll.map((b, i) => `  ${i + 1}. ${b}`),
    "Qué decir:",
    ...desarrollo.explicacion.map((e) => `  • ${e}`),
    "",
    "4. 💻 EL CALL TO ACTION (la solución inmediata)",
    `«${cta}»`,
    cierre,
    ...(avisos.length ? ["", ...avisos.map((a) => `⚠️ ${a}`)] : []),
  ].join("\n");

  return { equipo: eq.etiqueta, visual, gancho, desarrollo, cta, cierre, avisos, texto };
}

/* ───────── prompt para pegar en Claude o ChatGPT ───────── */
const PROMPT_BASE = `Actúa como un Estratega Experto de YouTube y Guionista de alto impacto. Tu objetivo es funcionar como un "Generador de Escenarios" para un canal de YouTube que ofrece un servicio de instalación de software remoto para desbloquear impresoras (Epson/Canon) y plotters (errores de almohadillas, 5b00, 0014bd, etc.).
REGLA DE NEGOCIO ESTRICTA: El servicio vende exclusivamente la instalación remota del software hecha por un experto. NO se venden licencias sueltas y NO se hacen reparaciones físicas de hardware. Toda la comunicación debe reflejar rapidez, solución digital y cero desarme de equipos.
Cada vez que yo te dé las variables del Bloque 1 (Problema Técnico) y del Bloque 3 (Profesión del Cliente), tú me devolverás un escenario completo estructurado de la siguiente manera:
1. 🎨 EL GANCHO VISUAL (Ideas para la Miniatura)

* Personaje y emoción: (Ej: Arquitecto estresado agarrándose la cabeza).
* Fondo y contexto: (Ej: Taller o escritorio desenfocado que muestre urgencia).
* Elemento clave: La máquina bloqueada y el error visible.
* Texto corto (máximo 3 palabras): Textos de alto impacto (Ej: "¡NO IMPRIME!").

2. 🔥 EL GANCHO NARRATIVO (Script - Primeros 5 segundos)

* Una frase inicial directa a la cámara que conecte instantáneamente con el dolor, la pérdida de dinero o el pánico por el tiempo perdido específico de esa profesión.

3. 📉 EL DESARROLLO (Mostrando el problema)

* Indicación de qué mostrar en pantalla (b-roll): El mensaje exacto de error en el PC del usuario o las luces parpadeando en la máquina. Breve explicación de por qué el negocio está detenido.

4. 💻 EL CALL TO ACTION (La Solución Inmediata)

* El pitch de tu servicio: Explicar que la solución es por software, que no necesitan llevar la impresora al técnico físico y que nosotros hacemos la instalación remota ahora mismo.

Para empezar, genera el primer escenario con estos datos:

* Bloque 1 (Problema): Marca: {marca} / Modelo: {modelo} / Error: {error}.
* Bloque 3 (Profesión): {profesion}.`;

export function promptParaIA(marca: string, modelo: string, error: string, profesion: string): string {
  return PROMPT_BASE.replace("{marca}", marca.trim() || "(sin indicar)").replace("{modelo}", modelo.trim().toUpperCase() || "(sin indicar)").replace("{error}", error.trim()).replace("{profesion}", profesion);
}
