/* ── editor de capas: cada capa es un PNG transparente; al final se guarda el PNG FINAL ── */
const CP = { W: 1920, H: 1080, capas: [], sel: null, listo: false, arrastre: null, subiendoA: null, siguiente: 1, bib: [], badges: [], dis: { ocultos: [], nombres: {}, presets: [] }, guias: true, bloqueo: false, version: null, versionDe: "", vers: {}, hist: null, histI: 0, restaurando: false };
/** Escala en X y en Y (los marcos pueden tener ancho y alto distintos; las demás capas usan la misma). */
const cpEsc = (c) => [c.escalaX ?? c.escala, c.escalaY ?? c.escala];
const cpTam = (c) => { const [sx, sy] = cpEsc(c); return [c.bmp.width * sx, c.bmp.height * sy]; };
/** Dibuja una capa; con «recorte» solo se ve la parte que cae dentro del hueco del marco de referencia. */
function cpPintar(g, c) {
  if (!c.visible || !c.bmp) return;
  g.save(); g.globalAlpha = c.opacidad;
  if (c.recorte && c.tipo !== "marco") { const m = cpMarcoRef(); if (m) { const ab = cpAbertura(m); g.beginPath(); g.rect(ab.x, ab.y, ab.w, ab.h); g.clip(); } }
  const [w, h] = cpTam(c); g.drawImage(c.bmp, c.x, c.y, w, h); g.restore();
}
/** Capas en el orden en que se dibujan (de abajo hacia arriba). La lista se muestra como en Photoshop: arriba = encima, abajo = fondo. */
/** Nombre del proyecto → nombre de archivo (el servidor lo vuelve a limpiar). */
const cpNombreArchivo = () => $("cp-proyecto").value.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, "_").replace(/^[._]+|[._]+$/g, "").slice(0, 80);
const cpOrdenDibujo = () => [...CP.capas].reverse(); // la primera de la lista queda encima; la última es el fondo
const CP_FUENTE = "Impact, 'Arial Black', 'Segoe UI Black', sans-serif";

function cpCrear(tipo, nombre, extra) {
  const c = { id: "c" + CP.siguiente++, tipo, nombre, visible: true, x: 0, y: 0, escala: 1, opacidad: 1, bmp: null, ...extra };
  cpRehacer(c);
  return c;
}
function cpLienzo(w, h) { const k = document.createElement("canvas"); k.width = w; k.height = h; return k; }

/* Capa de texto 3D pro: cada línea con su estilo (naranja fuego, cromo, dorado…), contorno grueso, bisel, brillo, extrusión y sombra */
const TEXTO_ESTILOS = {
  naranja: { n: "Naranja fuego", stops: [[0, "#fff0a0"], [0.25, "#ffc12e"], [0.6, "#ff8a00"], [1, "#ec5a00"]], contorno: "#2a1408", ext: "#8a3a00" },
  blanco: { n: "Blanco 3D", stops: [[0, "#ffffff"], [0.5, "#f1f4fa"], [1, "#b4c0d6"]], contorno: "#17224a", ext: "#5d6d96" },
  cromo: { n: "Cromo plata", stops: [[0, "#ffffff"], [0.45, "#eef2f8"], [0.55, "#b9c4d6"], [1, "#8794ab"]], contorno: "#141c33", ext: "#4d586f" },
  amarillo: { n: "Amarillo", stops: [[0, "#fffbb0"], [0.4, "#ffe033"], [1, "#e49a00"]], contorno: "#2b2000", ext: "#8a5a00" },
  rojo: { n: "Rojo", stops: [[0, "#ff8a7a"], [0.45, "#ee2a1c"], [1, "#8f0b05"]], contorno: "#1f0200", ext: "#5c0602" },
  verde: { n: "Verde", stops: [[0, "#c8ffb0"], [0.45, "#2fd150"], [1, "#0b6b25"]], contorno: "#021a08", ext: "#064d1a" },
  azul: { n: "Azul eléctrico", stops: [[0, "#bfe4ff"], [0.45, "#2a8cff"], [1, "#0a3fa8"]], contorno: "#02132e", ext: "#082a70" },
  dorado: { n: "Dorado", stops: [[0, "#fff6c2"], [0.3, "#f1c232"], [0.55, "#a77b00"], [0.75, "#ffdf6b"], [1, "#8a6200"]], contorno: "#2a1d00", ext: "#5b4000" },
  naranja3d: { n: "Naranja 3D (pro)", stops: [[0, "#fff56b"], [0.3, "#ffc61a"], [0.62, "#ff8c00"], [1, "#f0540a"]], contorno: "#000000", ext: "#a8400a" },
  plateado3d: { n: "Blanco plateado 3D (pro)", stops: [[0, "#ffffff"], [0.4, "#f4f6fa"], [0.55, "#c9d0dc"], [1, "#8d97a8"]], contorno: "#000000", ext: "#2b3342" },
  acero: { n: "Acero cepillado", stops: [[0, "#ffffff"], [0.35, "#dfe4ea"], [0.5, "#9aa4b2"], [1, "#5b6574"]], contorno: "#0e131c", ext: "#2c3441" },
  bronce: { n: "Bronce", stops: [[0, "#ffe2b0"], [0.35, "#d99a4e"], [0.6, "#9c5f22"], [1, "#6b3a10"]], contorno: "#1f1005", ext: "#4a2808" },
  cobre: { n: "Cobre", stops: [[0, "#ffd9c4"], [0.35, "#f08a5d"], [0.65, "#b4501f"], [1, "#7a2f0f"]], contorno: "#220a02", ext: "#55200a" },
  orarosa: { n: "Oro rosa", stops: [[0, "#fff0ea"], [0.35, "#f4c1b0"], [0.65, "#d8907d"], [1, "#a8604f"]], contorno: "#2a1210", ext: "#6f3a30" },
  hielo: { n: "Hielo", stops: [[0, "#ffffff"], [0.4, "#cfeeff"], [0.75, "#7cc8f2"], [1, "#3e8fc4"]], contorno: "#06304f", ext: "#1c5b88" },
  cian: { n: "Cian neón", stops: [[0, "#e8ffff"], [0.4, "#4ff3ff"], [1, "#00a9c4"]], contorno: "#002a33", ext: "#006a7d" },
  magenta: { n: "Magenta neón", stops: [[0, "#ffe6fb"], [0.4, "#ff4fd8"], [1, "#b0008f"]], contorno: "#2e0027", ext: "#760063" },
  acido: { n: "Verde ácido", stops: [[0, "#f6ffc2"], [0.4, "#b6ff2a"], [1, "#5ea800"]], contorno: "#0f2200", ext: "#3a6800" },
  morado: { n: "Morado", stops: [[0, "#efdcff"], [0.45, "#a45cff"], [1, "#5217b0"]], contorno: "#16052e", ext: "#35108a" },
  rosa: { n: "Rosa chicle", stops: [[0, "#fff0f8"], [0.45, "#ff7ac2"], [1, "#d0307f"]], contorno: "#3a0620", ext: "#8a1f55" },
  arcoiris: { n: "Arcoíris", stops: [[0, "#ff4d4d"], [0.2, "#ffb020"], [0.4, "#f2ee2a"], [0.6, "#36d96b"], [0.8, "#2e9bff"], [1, "#b15cff"]], contorno: "#1a1a1a", ext: "#3a3a3a" },
  propio: { n: "Color propio" },
};
/** Acabados: efectos de superficie que se dibujan sobre el color (metal, cristal, burbuja, neón…). */
const TEXTO_ACABADOS = [["ninguno", "Ninguno (liso)"], ["metal", "Metalizado (cromo con horizonte)"], ["cristal", "Cristalino (vidrio transparente)"], ["burbuja", "Burbuja (jabón irisado)"], ["neon", "Neón (resplandor)"], ["gel", "Gel brillante (gelatina)"], ["hielo", "Hielo escarchado"], ["holografico", "Holográfico (arcoíris)"], ["caramelo", "Caramelo (rayas)"], ["brillantina", "Brillantina (destellos)"]];
/** Tipos de efecto de un clic: aplican el estilo a todas las líneas y fijan contorno, sombra, extrusión, bisel y brillo. */
const TEXTO_EFECTOS = {
  naranja3d: { n: "Naranja 3D", estilo: "naranja3d", ajustes: { conContorno: true, contornoGrosor: 26, contornoColor: "", conSombra: true, sombraDist: 11, sombraAngulo: 60, sombraBlur: 6, sombraOpacidad: 90, sombraAuto: false, sombraColor: "#000000", profundidad: 12, bisel: 85, brillo: 65, cursiva: 6, anillo: 0, colorPrincipal: "" } },
  plateado3d: { n: "Blanco plateado 3D", estilo: "plateado3d", ajustes: { conContorno: true, contornoGrosor: 26, contornoColor: "", conSombra: true, sombraDist: 11, sombraAngulo: 60, sombraBlur: 6, sombraOpacidad: 90, sombraAuto: false, sombraColor: "#000000", profundidad: 12, bisel: 80, brillo: 70, cursiva: 6, anillo: 0, colorPrincipal: "" } },
  cromo_espejo: { n: "✨ Metalizado cromo espejo", estilo: "cromo", ajustes: { acabado: "metal", acabadoFuerza: 85, conContorno: true, contornoGrosor: 22, contornoColor: "#0b1020", conSombra: true, sombraDist: 10, sombraAngulo: 60, sombraBlur: 6, sombraOpacidad: 85, sombraAuto: false, sombraColor: "#000000", profundidad: 10, bisel: 40, brillo: 30, cursiva: 6, anillo: 0, colorPrincipal: "" } },
  oro_liquido: { n: "✨ Oro líquido metalizado", estilo: "dorado", ajustes: { acabado: "metal", acabadoFuerza: 80, conContorno: true, contornoGrosor: 22, contornoColor: "#2a1a00", conSombra: true, sombraDist: 10, sombraAngulo: 60, sombraBlur: 6, sombraOpacidad: 85, sombraAuto: false, sombraColor: "#000000", profundidad: 10, bisel: 50, brillo: 30, cursiva: 6, anillo: 0, colorPrincipal: "" } },
  acero_metal: { n: "✨ Acero metalizado", estilo: "acero", ajustes: { acabado: "metal", acabadoFuerza: 75, conContorno: true, contornoGrosor: 20, contornoColor: "#0a0f18", conSombra: true, sombraDist: 9, sombraAngulo: 60, sombraBlur: 5, sombraOpacidad: 85, sombraAuto: false, sombraColor: "#000000", profundidad: 10, bisel: 40, brillo: 25, cursiva: 6, anillo: 0, colorPrincipal: "" } },
  cristal: { n: "💎 Cristalino (vidrio)", estilo: "hielo", ajustes: { acabado: "cristal", acabadoFuerza: 90, conContorno: true, contornoGrosor: 14, contornoColor: "#06304f", conSombra: true, sombraDist: 12, sombraAngulo: 60, sombraBlur: 10, sombraOpacidad: 60, sombraAuto: false, sombraColor: "#001a33", profundidad: 6, bisel: 0, brillo: 0, cursiva: 6, anillo: 0, colorPrincipal: "" } },
  burbuja: { n: "🫧 Burbuja de jabón", estilo: "cian", ajustes: { acabado: "burbuja", acabadoFuerza: 90, conContorno: true, contornoGrosor: 12, contornoColor: "#3a1a66", conSombra: true, sombraDist: 12, sombraAngulo: 60, sombraBlur: 10, sombraOpacidad: 55, sombraAuto: false, sombraColor: "#1a0a33", profundidad: 0, bisel: 0, brillo: 0, cursiva: 6, anillo: 0, colorPrincipal: "" } },
  neon: { n: "💡 Neón brillante", estilo: "magenta", ajustes: { acabado: "neon", acabadoFuerza: 90, conContorno: false, contornoGrosor: 0, contornoColor: "", conSombra: false, sombraDist: 0, sombraAngulo: 60, sombraBlur: 0, sombraOpacidad: 0, sombraAuto: true, sombraColor: "#000000", profundidad: 0, bisel: 0, brillo: 0, cursiva: 6, anillo: 0, colorPrincipal: "" } },
  gel: { n: "🍬 Gel brillante", estilo: "rojo", ajustes: { acabado: "gel", acabadoFuerza: 90, conContorno: true, contornoGrosor: 20, contornoColor: "", conSombra: true, sombraDist: 10, sombraAngulo: 60, sombraBlur: 6, sombraOpacidad: 85, sombraAuto: true, sombraColor: "#000000", profundidad: 8, bisel: 50, brillo: 0, cursiva: 6, anillo: 0, colorPrincipal: "" } },
  hielo: { n: "❄️ Hielo escarchado", estilo: "hielo", ajustes: { acabado: "hielo", acabadoFuerza: 90, conContorno: true, contornoGrosor: 16, contornoColor: "#06304f", conSombra: true, sombraDist: 10, sombraAngulo: 60, sombraBlur: 8, sombraOpacidad: 70, sombraAuto: false, sombraColor: "#001a33", profundidad: 6, bisel: 0, brillo: 0, cursiva: 6, anillo: 0, colorPrincipal: "" } },
  holo: { n: "🌈 Holográfico", estilo: "cromo", ajustes: { acabado: "holografico", acabadoFuerza: 80, conContorno: true, contornoGrosor: 18, contornoColor: "#1a0f33", conSombra: true, sombraDist: 10, sombraAngulo: 60, sombraBlur: 6, sombraOpacidad: 80, sombraAuto: false, sombraColor: "#000000", profundidad: 8, bisel: 30, brillo: 20, cursiva: 6, anillo: 0, colorPrincipal: "" } },
  caramelo: { n: "🍭 Caramelo a rayas", estilo: "rojo", ajustes: { acabado: "caramelo", acabadoFuerza: 90, conContorno: true, contornoGrosor: 20, contornoColor: "#ffffff", conSombra: true, sombraDist: 10, sombraAngulo: 60, sombraBlur: 4, sombraOpacidad: 85, sombraAuto: false, sombraColor: "#400000", profundidad: 8, bisel: 50, brillo: 40, cursiva: 6, anillo: 0, colorPrincipal: "" } },
  brillantina: { n: "✨ Brillantina", estilo: "morado", ajustes: { acabado: "brillantina", acabadoFuerza: 90, conContorno: true, contornoGrosor: 20, contornoColor: "#16052e", conSombra: true, sombraDist: 10, sombraAngulo: 60, sombraBlur: 5, sombraOpacidad: 85, sombraAuto: true, sombraColor: "#000000", profundidad: 8, bisel: 50, brillo: 30, cursiva: 6, anillo: 0, colorPrincipal: "" } },
};
/** Letras gruesas (Google Fonts, licencia OFL) guardadas en la carpeta «fuentes» + las del sistema. [familia, peso] */
const TEXTO_FUENTES = [["Rubik", 900], ["Montserrat", 900], ["Poppins", 900], ["Lilita One", 400], ["Titan One", 400], ["Archivo Black", 400], ["Anton", 400], ["Impact", 400], ["Arial Black", 400]];
const pesoFuente = (fam) => (TEXTO_FUENTES.find((f) => f[0] === fam) || [0, 700])[1];
const TEXTO_BASE = { fuente: "Rubik", conContorno: true, contornoGrosor: 18, contornoColor: "", conSombra: true, sombraDist: 12, sombraAngulo: 55, sombraBlur: 0, sombraOpacidad: 95, sombraAuto: true, sombraColor: "#14224a", colorPrincipal: "", profundidad: 0, bisel: 60, brillo: 55, alinear: "izquierda", interlineado: 100, rotacion: 0, cursiva: 8, anillo: 0, anilloColor: "#ffffff", acabado: "ninguno", acabadoFuerza: 85 };
const estiloDeLinea = (l) => {
  if (TEXTO_ESTILOS[l.estilo] && l.estilo !== "propio") return TEXTO_ESTILOS[l.estilo];
  const col = l.color || "#ffffff";
  return { stops: [[0, "#ffffff"], [0.18, col], [1, cpTono(col, -0.25)]], contorno: "#000000", ext: cpTono(col, -0.6) };
};
/** «Color principal»: cambia el color del relleno y de la extrusión de un estilo, manteniendo su contorno. */
const estiloConColor = (est, col) => (col ? { ...est, stops: [[0, cpTono(col, 0.6)], [0.3, cpTono(col, 0.2)], [0.65, col], [1, cpTono(col, -0.35)]], ext: cpTono(col, -0.65) } : est);
/** Carga las fuentes del panel y vuelve a dibujar las capas de texto y badge (el lienzo necesita la letra ya cargada para medirla). */
async function cpCargarFuentes() {
  try { await Promise.all(TEXTO_FUENTES.filter((f) => f[0] !== "Impact" && f[0] !== "Arial Black").map(([f, w]) => document.fonts.load(`${w} 64px '${f}'`))); } catch { /* sin fuentes locales: se usa la de reserva */ }
  if (CP.listo) { CP.capas.forEach((c) => { if (c.tipo === "texto" || c.tipo === "badge" || c.tipo === "marca") cpRehacer(c); }); cpDibujar(); }
}
/** Campos que cada línea del texto puede tener «solo suyos» (l.o); el resto los hereda del texto general. */
const TEXTO_CAMPOS_LINEA = ["fuente", "colorPrincipal", "acabado", "acabadoFuerza", "conContorno", "contornoGrosor", "contornoColor", "anillo", "anilloColor", "conSombra", "sombraDist", "sombraAngulo", "sombraBlur", "sombraOpacidad", "sombraAuto", "sombraColor", "profundidad", "bisel", "brillo", "cursiva"];
function cpTexto3D(c) {
  const p = { ...TEXTO_BASE, ...c }, t = p.tam, lineas = c.lineas.filter((l) => l.texto.trim());
  if (!lineas.length) return cpLienzo(4, 4);
  const fuente = (px, fam) => `${pesoFuente(fam)} ${px}px '${fam}', Impact, 'Arial Black', sans-serif`, medir = cpLienzo(10, 10).getContext("2d");
  /** Todo lo que depende del estilo propio de la línea: tamaño de borde, sombra, extrusión, inclinación y acabado. */
  const derivar = (pl) => {
    const ang = ((pl.sombraAngulo || 0) * Math.PI) / 180, dist = pl.conSombra ? (t * pl.sombraDist) / 100 : 0, ac = pl.acabado || "ninguno";
    return { pl, k0: Math.tan(((pl.cursiva || 0) * Math.PI) / 180), prof: Math.round((t * pl.profundidad) / 100), cont: pl.conContorno ? (t * pl.contornoGrosor) / 100 : 0, ring: pl.conContorno ? (t * pl.anillo) / 100 : 0,
      sdx: Math.cos(ang) * dist, sdy: Math.sin(ang) * dist, sblur: pl.conSombra ? (t * pl.sombraBlur) / 100 : 0, ac, fu: (pl.acabadoFuerza ?? 85) / 100, transp: ac === "cristal" || ac === "burbuja" || ac === "hielo" };
  };
  const info = lineas.map((l) => {
    const pl = { ...p, ...(l.o || {}) }, d = derivar(pl), ft = Math.max(10, Math.round((t * (l.escala || 100)) / 100)); medir.font = fuente(ft, pl.fuente);
    return { l, ft, d, txt: l.texto.toUpperCase(), w: medir.measureText(l.texto.toUpperCase()).width, est: estiloConColor(estiloDeLinea(l), pl.colorPrincipal) };
  });
  const inter = p.interlineado / 100;
  const pad = Math.ceil(Math.max(...info.map(({ d }) => t * 0.12 + d.prof + d.cont + Math.abs(d.sdx) + Math.abs(d.sdy) + d.sblur * 2 + (d.ac === "neon" ? t * 0.5 : 0)))), sesgo = Math.ceil(Math.max(...info.map(({ d }) => t * 0.5 * d.k0))), prof = Math.max(...info.map(({ d }) => d.prof));
  const maxW = Math.max(...info.map((i) => i.w)), alto = info.reduce((a, i) => a + i.ft * 1.04 * inter, 0);
  const k = cpLienzo(Math.ceil(maxW + pad * 2 + prof + sesgo), Math.ceil(alto + pad * 2 + prof)), g = k.getContext("2d"), T = cpLienzo(k.width, k.height), q = T.getContext("2d"), S = cpLienzo(k.width, k.height), z = S.getContext("2d"), M = cpLienzo(k.width, k.height), m = M.getContext("2d");
  for (const ctx of [g, q, z, m]) { ctx.lineJoin = "round"; ctx.textBaseline = "top"; ctx.miterLimit = 2; }
  let y = pad;
  for (const i of info) {
    const { pl: p, k0, prof: profL, cont, ring, sdx, sdy, sblur, ac, fu, transp } = i.d, fuenteL = fuente(i.ft, p.fuente);
    const x = (p.alinear === "centro" ? pad + (maxW - i.w) / 2 : pad) + sesgo / 2, yc = y + i.ft * 0.5, sh = (ctx, fn) => { ctx.save(); ctx.transform(1, 0, -k0, 1, k0 * yc, 0); fn(); ctx.restore(); };
    g.font = fuenteL; q.font = fuenteL; z.font = fuenteL; m.font = fuenteL;
    const colContorno = p.contornoColor || i.est.contorno;
    // 1) sombra proyectada: una copia de la letra (con su contorno) desplazada, con desenfoque y transparencia
    if (p.conSombra && p.sombraOpacidad > 0) {
      const colSombra = p.sombraAuto ? i.est.ext : p.sombraColor;
      z.clearRect(0, 0, S.width, S.height);
      sh(z, () => { z.fillStyle = colSombra; z.strokeStyle = colSombra; if (cont > 0) { z.lineWidth = cont; z.strokeText(i.txt, x, y); } z.fillText(i.txt, x, y); });
      g.save(); g.globalAlpha = p.sombraOpacidad / 100; if (sblur > 0) g.filter = `blur(${sblur}px)`; g.drawImage(S, sdx, sdy); g.restore();
    }
    // 2) extrusión opcional (grosor hacia abajo)
    for (let d = profL; d >= 1; d--) sh(g, () => { g.lineWidth = cont; g.strokeStyle = i.est.ext; g.fillStyle = i.est.ext; if (cont > 0) g.strokeText(i.txt, x + d * 0.35, y + d); g.fillText(i.txt, x + d * 0.35, y + d); });
    // 3) contorno (opcional) + anillo claro
    sh(g, () => { if (cont > 0) { g.lineWidth = cont; g.strokeStyle = colContorno; g.strokeText(i.txt, x, y); } if (ring > 0) { g.lineWidth = ring * 2; g.strokeStyle = p.anilloColor; g.strokeText(i.txt, x, y); } });
    // 3a) vidrio / burbuja / hielo: se vacía el interior de las letras para que se vea el fondo a través
    if (transp) { g.save(); g.globalCompositeOperation = "destination-out"; sh(g, () => { g.fillStyle = "#000"; g.fillText(i.txt, x, y); }); g.restore(); }
    // 3b) neón: resplandor de color alrededor de las letras
    if (ac === "neon") { const gc = (i.est.stops[1] || i.est.stops[0])[1]; g.save(); g.shadowColor = gc; g.shadowBlur = i.ft * 0.35 * fu + 2; for (let r = 0; r < 3; r++) sh(g, () => { g.fillStyle = gc; g.fillText(i.txt, x, y); }); g.restore(); }
    // 4) cara: degradado + bisel + brillo (solo dentro de las letras)
    q.clearRect(0, 0, T.width, T.height); q.globalCompositeOperation = "source-over";
    const gr = q.createLinearGradient(0, y, 0, y + i.ft * 0.95); i.est.stops.forEach(([o, col]) => gr.addColorStop(o, col));
    q.globalAlpha = ac === "cristal" ? 0.14 + 0.1 * (1 - fu) : ac === "burbuja" ? 0.2 : ac === "hielo" ? 0.55 : 1;
    sh(q, () => { q.fillStyle = gr; q.fillText(i.txt, x, y); });
    q.globalAlpha = 1;
    q.globalCompositeOperation = "source-atop";
    if (p.bisel > 0 && !transp) {
      const d = Math.max(1, i.ft * 0.03 * p.bisel / 100 * 2), lw = i.ft * 0.09 * p.bisel / 100 * 2; q.lineWidth = lw;
      sh(q, () => { q.save(); q.translate(d, d); q.strokeStyle = `rgba(255,255,255,${0.6 * p.bisel / 100})`; q.strokeText(i.txt, x, y); q.restore(); q.save(); q.translate(-d, -d); q.strokeStyle = `rgba(0,0,0,${0.35 * p.bisel / 100})`; q.strokeText(i.txt, x, y); q.restore(); });
    }
    if (p.brillo > 0 && !transp) { const br = q.createLinearGradient(0, y, 0, y + i.ft * 0.55); br.addColorStop(0, `rgba(255,255,255,${0.6 * p.brillo / 100})`); br.addColorStop(1, "rgba(255,255,255,0)"); q.fillStyle = br; q.fillRect(0, y, T.width, i.ft * 0.55); }
    q.globalCompositeOperation = "source-over";
    // 5) acabado: se dibuja en un lienzo aparte, se recorta con la forma de las letras y se pega encima
    if (ac !== "ninguno") {
      const ft = i.ft, y0 = y, y1 = y + ft * 0.95, wl = i.w;
      let sd = 1234 + i.txt.length * 97; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const lin = (xa, ya, xb, yb, paradas) => { const gg = m.createLinearGradient(xa, ya, xb, yb); paradas.forEach(([o, c]) => gg.addColorStop(o, c)); return gg; };
      const A = (v) => Math.max(0, Math.min(1, v * fu));
      m.globalCompositeOperation = "source-over"; m.clearRect(0, 0, M.width, M.height);
      const banda = (st) => { m.fillStyle = st; m.fillRect(0, y0 - ft * 0.1, M.width, ft * 1.2); };
      const aro = (ancho, col, blur) => { m.save(); if (blur) m.filter = `blur(${blur}px)`; m.lineWidth = ancho; m.strokeStyle = col; sh(m, () => m.strokeText(i.txt, x, y)); m.restore(); };
      if (ac === "metal") {
        banda(lin(0, y0, 0, y1, [[0, `rgba(255,255,255,${A(0.95)})`], [0.3, `rgba(255,255,255,${A(0.55)})`], [0.47, `rgba(120,150,200,${A(0.25)})`], [0.5, `rgba(10,16,30,${A(0.62)})`], [0.62, `rgba(40,55,85,${A(0.45)})`], [0.82, `rgba(255,255,255,${A(0.18)})`], [1, `rgba(255,255,255,${A(0.55)})`]]));
        aro(ft * 0.05, `rgba(255,255,255,${A(0.55)})`, 0);
      } else if (ac === "cristal") {
        aro(ft * 0.16, `rgba(190,235,255,${A(0.55)})`, ft * 0.05);
        aro(ft * 0.05, `rgba(255,255,255,${A(0.95)})`, 0);
        banda(lin(x, y0, x + ft * 1.3, y1, [[0, "rgba(255,255,255,0)"], [0.22, `rgba(255,255,255,${A(0.65)})`], [0.34, "rgba(255,255,255,0)"], [0.5, `rgba(255,255,255,${A(0.3)})`], [0.58, "rgba(255,255,255,0)"], [1, "rgba(255,255,255,0)"]]));
        banda(lin(0, y0 + ft * 0.6, 0, y1, [[0, "rgba(120,220,255,0)"], [1, `rgba(120,220,255,${A(0.45)})`]]));
      } else if (ac === "burbuja") {
        banda(lin(x, 0, x + wl, 0, [[0, `rgba(255,120,200,${A(0.4)})`], [0.25, `rgba(255,240,120,${A(0.35)})`], [0.5, `rgba(110,255,230,${A(0.4)})`], [0.75, `rgba(130,160,255,${A(0.4)})`], [1, `rgba(255,120,220,${A(0.4)})`]]));
        aro(ft * 0.2, `rgba(255,255,255,${A(0.8)})`, ft * 0.06);
        aro(ft * 0.03, `rgba(255,255,255,${A(0.95)})`, 0);
        banda(lin(0, y0 + ft * 0.04, 0, y0 + ft * 0.42, [[0, `rgba(255,255,255,${A(0.9)})`], [1, "rgba(255,255,255,0)"]]));
        banda(lin(0, y0 + ft * 0.65, 0, y1, [[0, "rgba(255,255,255,0)"], [1, `rgba(160,240,255,${A(0.5)})`]]));
      } else if (ac === "neon") {
        m.fillStyle = `rgba(255,255,255,${A(0.88)})`; m.fillRect(0, y0 - ft * 0.1, M.width, ft * 1.2);
      } else if (ac === "gel") {
        banda(lin(0, y0, 0, y0 + ft * 0.5, [[0, `rgba(255,255,255,${A(0.85)})`], [0.9, `rgba(255,255,255,${A(0.12)})`], [1, "rgba(255,255,255,0)"]]));
        banda(lin(0, y0 + ft * 0.6, 0, y1, [[0, "rgba(255,255,255,0)"], [1, `rgba(255,255,255,${A(0.38)})`]]));
        aro(ft * 0.07, `rgba(255,255,255,${A(0.45)})`, ft * 0.02);
      } else if (ac === "hielo") {
        banda(lin(0, y0, 0, y1, [[0, `rgba(255,255,255,${A(0.55)})`], [1, `rgba(150,215,255,${A(0.35)})`]]));
        aro(ft * 0.12, `rgba(255,255,255,${A(0.85)})`, ft * 0.04);
        for (let r = 0; r < Math.round(wl / 7); r++) { m.fillStyle = `rgba(255,255,255,${A(0.35 + rnd() * 0.6)})`; const rr = 0.6 + rnd() * 1.8; m.beginPath(); m.arc(x + rnd() * wl, y0 + rnd() * ft, rr, 0, 7); m.fill(); }
        banda(lin(x, y0, x + ft * 1.4, y1, [[0, "rgba(255,255,255,0)"], [0.3, `rgba(255,255,255,${A(0.5)})`], [0.42, "rgba(255,255,255,0)"], [1, "rgba(255,255,255,0)"]]));
      } else if (ac === "holografico") {
        banda(lin(x, y0, x + Math.max(wl, ft * 2), y1 + ft * 0.4, [[0, `rgba(255,70,140,${A(0.7)})`], [0.2, `rgba(255,210,60,${A(0.7)})`], [0.4, `rgba(80,255,150,${A(0.7)})`], [0.6, `rgba(60,200,255,${A(0.7)})`], [0.8, `rgba(150,90,255,${A(0.7)})`], [1, `rgba(255,70,140,${A(0.7)})`]]));
        banda(lin(0, y0, 0, y0 + ft * 0.45, [[0, `rgba(255,255,255,${A(0.55)})`], [1, "rgba(255,255,255,0)"]]));
        aro(ft * 0.04, `rgba(255,255,255,${A(0.6)})`, 0);
      } else if (ac === "caramelo") {
        m.save(); m.translate(x, y0); m.rotate(-0.6); m.fillStyle = `rgba(255,255,255,${A(0.9)})`; const paso = ft * 0.26; for (let r = -ft * 3; r < wl + ft * 3; r += paso) m.fillRect(r, -ft * 2, paso * 0.5, ft * 6); m.restore();
        banda(lin(0, y0, 0, y0 + ft * 0.45, [[0, `rgba(255,255,255,${A(0.5)})`], [1, "rgba(255,255,255,0)"]]));
      } else if (ac === "brillantina") {
        banda(lin(0, y0, 0, y1, [[0, `rgba(255,255,255,${A(0.2)})`], [1, `rgba(0,0,0,${A(0.15)})`]]));
        for (let r = 0; r < Math.round(wl * ft / 55); r++) {
          const px = x + rnd() * wl, py = y0 + rnd() * ft, rr = 0.7 + rnd() * 2.2; m.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${A(0.95)})` : `rgba(255,225,130,${A(0.9)})`; m.beginPath(); m.arc(px, py, rr, 0, 7); m.fill();
          if (rnd() > 0.93) { m.strokeStyle = `rgba(255,255,255,${A(0.95)})`; m.lineWidth = 1.2; m.beginPath(); m.moveTo(px - 7, py); m.lineTo(px + 7, py); m.moveTo(px, py - 7); m.lineTo(px, py + 7); m.stroke(); }
        }
      }
      m.globalCompositeOperation = "destination-in"; sh(m, () => { m.fillStyle = "#000"; m.fillText(i.txt, x, y); }); m.globalCompositeOperation = "source-over";
      q.drawImage(M, 0, 0);
    }
    g.drawImage(T, 0, 0); y += i.ft * 1.04 * inter;
  }
  if (p.rotacion) {
    const a = (p.rotacion * Math.PI) / 180, W2 = Math.ceil(Math.abs(k.width * Math.cos(a)) + Math.abs(k.height * Math.sin(a))), H2 = Math.ceil(Math.abs(k.width * Math.sin(a)) + Math.abs(k.height * Math.cos(a)));
    const r = cpLienzo(W2, H2), zz = r.getContext("2d"); zz.translate(W2 / 2, H2 / 2); zz.rotate(a); zz.drawImage(k, -k.width / 2, -k.height / 2); return r;
  }
  return k;
}
const TEXTO_PLANTILLAS = [
  ["🔥 RESET estilo YouTube", { tam: 200, alinear: "izquierda", ajustes: { conContorno: false, conSombra: true, sombraDist: 9, sombraAngulo: 60, sombraBlur: 0, sombraOpacidad: 100, sombraAuto: true, profundidad: 0, contornoGrosor: 18 }, lineas: [{ texto: "Reset", estilo: "naranja", color: "#ff9a1a", escala: 125 }, { texto: "0014BD", estilo: "blanco", color: "#ffffff", escala: 100 }, { texto: "EPSON SC-F570", estilo: "blanco", color: "#ffffff", escala: 80 }] }],
  ["🚨 Error en rojo + modelo", { tam: 150, alinear: "izquierda", ajustes: { conContorno: true, contornoGrosor: 22, conSombra: true, sombraDist: 8, sombraAngulo: 60, sombraBlur: 10, sombraOpacidad: 80, profundidad: 0 }, lineas: [{ texto: "Reset", estilo: "amarillo", color: "#ffd21f", escala: 100 }, { texto: "Error Almohadillas", estilo: "rojo", color: "#ee2a1c", escala: 100 }, { texto: "EPSON L3210", estilo: "cromo", color: "#ffffff", escala: 90 }] }],
  ["🏆 Título dorado centrado", { tam: 150, alinear: "centro", ajustes: { conContorno: true, contornoGrosor: 20, conSombra: true, sombraDist: 7, sombraAngulo: 60, sombraBlur: 6, sombraOpacidad: 85, profundidad: 0 }, lineas: [{ texto: "Desbloqueo", estilo: "dorado", color: "#f1c232", escala: 110 }, { texto: "Inmediato", estilo: "cromo", color: "#ffffff", escala: 100 }] }],
];
function cpAgregarTexto() {
  const c = cpCrear("texto", "Texto 3D", { ...TEXTO_BASE, tam: 150, x: 60, y: 50, lineas: [{ texto: "Texto", estilo: "naranja", color: "#ff9a1a", escala: 100 }], extra: true });
  cpInsertar(c); cpLista(); cpAjustes(); cpDibujar();
}
/** Controles de UNA línea: lo que se cambia aquí solo afecta a esa línea; «Igual que el general» la devuelve al ajuste común. */
function cpHtmlLinea(c, l, i, general) {
  const o = l.o || {}, v = (k) => (k in o ? o[k] : general[k]), esp = (k) => (k in o ? "" : ' style="opacity:.75"');
  const barra = ([campo, nombre, min, max]) => `<label class="campo">${nombre}: <span data-lov="${i}:${campo}">${v(campo)}</span></label><input type="range" min="${min}" max="${max}" value="${v(campo)}" data-lo="${i}:${campo}" data-num>`;
  const color = (campo, nombre, vacio) => `<label class="campo">${nombre}</label><input type="color" data-lo="${i}:${campo}" value="${v(campo) || vacio}" style="width:100%;height:34px;border:1px solid var(--borde);border-radius:9px;padding:2px">`;
  const marca = (campo, nombre) => `<label class="check" style="margin-top:6px"><input type="checkbox" data-lo="${i}:${campo}" ${v(campo) ? "checked" : ""}> ${nombre}</label>`;
  return `<div class="botones" style="margin:6px 0"><button type="button" class="btn" data-lo-reset="${i}" ${Object.keys(o).length ? "" : "disabled"}>↺ Igual que el general</button></div>
    <div class="fila2"><div><label class="campo">Letra</label><select data-lo="${i}:fuente">${TEXTO_FUENTES.map(([f]) => `<option ${v("fuente") === f ? "selected" : ""}>${f}</option>`).join("")}</select></div>
    <div><label class="campo">Acabado</label><select data-lo="${i}:acabado">${TEXTO_ACABADOS.map(([id, n]) => `<option value="${id}" ${(v("acabado") || "ninguno") === id ? "selected" : ""}>${n}</option>`).join("")}</select></div></div>
    ${barra(["acabadoFuerza", "Intensidad del acabado", 0, 100])}
    <label class="campo">Color principal de esta línea</label><div style="display:grid;grid-template-columns:1fr auto;gap:6px"><input type="color" data-lo="${i}:colorPrincipal" value="${v("colorPrincipal") || "#ff8a00"}" style="width:100%;height:34px;border:1px solid var(--borde);border-radius:9px;padding:2px"><button type="button" class="btn" data-lo-auto="${i}:colorPrincipal">Auto</button></div>
    <h4 style="margin:10px 0 0;font-size:13px">Borde</h4>${marca("conContorno", "Contorno (habilitar / deshabilitar)")}${barra(["contornoGrosor", "Grosor del contorno", 0, 60])}${barra(["anillo", "Anillo claro", 0, 25])}
    <div class="fila2"><div><label class="campo">Color del contorno</label><div style="display:grid;grid-template-columns:1fr auto;gap:6px"><input type="color" data-lo="${i}:contornoColor" value="${v("contornoColor") || "#17224a"}" style="width:100%;height:34px;border:1px solid var(--borde);border-radius:9px;padding:2px"><button type="button" class="btn" data-lo-auto="${i}:contornoColor">Auto</button></div></div>
    <div>${color("anilloColor", "Color del anillo", "#ffffff")}</div></div>
    <h4 style="margin:10px 0 0;font-size:13px">Sombra</h4>${marca("conSombra", "Sombra (habilitar / deshabilitar)")}${[["sombraDist", "Distancia", 0, 40], ["sombraAngulo", "Dirección (°)", 0, 360], ["sombraBlur", "Desenfoque", 0, 30], ["sombraOpacidad", "Transparencia (100 = sólida)", 0, 100]].map(barra).join("")}
    ${marca("sombraAuto", "Color de sombra automático")}${color("sombraColor", "Color de la sombra", "#14224a")}
    <h4 style="margin:10px 0 0;font-size:13px">Relieve</h4>${[["profundidad", "Profundidad", 0, 30], ["bisel", "Bisel", 0, 100], ["brillo", "Brillo", 0, 100], ["cursiva", "Cursiva (°)", 0, 20]].map(barra).join("")}`;
}
function cpHtmlTexto(c) {
  const p = { ...TEXTO_BASE, ...c }, estilos = Object.entries(TEXTO_ESTILOS);
  const barra = ([campo, nombre, min, max]) => `<label class="campo">${nombre}: <span data-bv="${campo}">${p[campo]}</span></label><input type="range" min="${min}" max="${max}" value="${p[campo]}" data-b="${campo}" data-num>`;
  return `<label class="campo">Tipo de efecto</label><select data-efecto><option value="">Personalizado</option>${Object.entries(TEXTO_EFECTOS).map(([id, e]) => `<option value="${id}" ${c.efecto === id ? "selected" : ""}>${e.n}</option>`).join("")}</select>
    <label class="campo">Acabado de superficie (metalizado, cristal, burbuja…)</label><select data-b="acabado">${TEXTO_ACABADOS.map(([id, n]) => `<option value="${id}" ${(p.acabado || "ninguno") === id ? "selected" : ""}>${n}</option>`).join("")}</select>
    ${barra(["acabadoFuerza", "Intensidad del acabado", 0, 100])}
    <label class="campo">Color principal (vacío = el del estilo)</label><div style="display:grid;grid-template-columns:1fr auto;gap:6px"><input type="color" data-b="colorPrincipal" value="${p.colorPrincipal || "#ff8a00"}" style="width:100%;height:38px;border:1px solid var(--borde);border-radius:9px;padding:2px"><button type="button" class="btn" data-color-auto>Auto</button></div>
    <label class="campo">Plantillas</label><div style="display:grid;gap:6px">${TEXTO_PLANTILLAS.map(([n], i) => `<button type="button" class="btn" style="justify-content:flex-start" data-tpl="${i}">${n}</button>`).join("")}</div>
    <label class="campo">Líneas de texto (estilo y tamaño de cada una)</label>
    ${c.lineas.map((l, i) => `<div style="display:grid;grid-template-columns:1fr 40px;gap:6px;margin-top:8px"><input type="text" data-l="${i}" value="${esc(l.texto)}"><input type="color" data-lc="${i}" value="${l.color || "#ffffff"}" title="Color (solo con «Color propio»)" style="width:100%;height:38px;border:1px solid var(--borde);border-radius:9px;padding:2px"></div>
      <div style="display:grid;grid-template-columns:1fr 70px 34px;gap:6px;margin-top:4px"><select data-le="${i}">${estilos.map(([id, e]) => `<option value="${id}" ${(l.estilo || "propio") === id ? "selected" : ""}>${e.n}</option>`).join("")}</select><input type="number" min="30" max="250" data-lt="${i}" value="${l.escala || 100}" title="Tamaño de esta línea (%)"><button type="button" class="btn contorno-rojo" style="padding:4px" data-lq="${i}" title="Quitar línea">✕</button></div>
      <details class="linea-ajustes" data-lad="${i}" ${l.abierta ? "open" : ""} style="margin-top:6px;border:1px solid var(--borde);border-radius:9px;padding:6px 10px"><summary style="cursor:pointer;font-weight:600">⚙ Ajustes solo de la línea ${i + 1}${l.o && Object.keys(l.o).length ? " · personalizada" : ""}</summary>
        ${cpHtmlLinea(c, l, i, p)}</details>`).join("")}
    <div class="botones" style="margin-top:8px"><button type="button" class="btn" data-lagregar ${c.lineas.length >= 6 ? "disabled" : ""}>➕ Agregar línea</button></div>
    <div class="fila2"><div><label class="campo">Letra</label><select data-b="fuente">${TEXTO_FUENTES.map(([f]) => `<option ${p.fuente === f ? "selected" : ""}>${f}</option>`).join("")}</select></div>
    <div><label class="campo">Alineación</label><select data-b="alinear"><option value="izquierda" ${p.alinear === "izquierda" ? "selected" : ""}>Izquierda</option><option value="centro" ${p.alinear === "centro" ? "selected" : ""}>Centro</option></select></div></div>
    <label class="campo">Tamaño de letra</label><input type="range" min="60" max="420" value="${c.tam}" data-tam>
    <h3 style="margin:14px 0 0;font-size:14px">Sombra</h3>
    <label class="check" style="margin-top:6px"><input type="checkbox" data-b="conSombra" ${p.conSombra ? "checked" : ""}> Sombra (habilitar / deshabilitar)</label>
    ${[["sombraDist", "Distancia", 0, 40], ["sombraAngulo", "Dirección (°) · 0 derecha, 90 abajo", 0, 360], ["sombraBlur", "Desenfoque (0 = sombra dura)", 0, 30], ["sombraOpacidad", "Transparencia de la sombra (100 = sólida)", 0, 100]].map(barra).join("")}
    <label class="check" style="margin-top:8px"><input type="checkbox" data-b="sombraAuto" ${p.sombraAuto ? "checked" : ""}> Color de sombra automático (según el estilo)</label>
    <label class="campo">Color de la sombra (si no es automático)</label><input type="color" data-b="sombraColor" value="${p.sombraColor}" style="width:100%;height:38px;border:1px solid var(--borde);border-radius:9px;padding:2px">
    <h3 style="margin:14px 0 0;font-size:14px">Contorno</h3>
    <label class="check" style="margin-top:6px"><input type="checkbox" data-b="conContorno" ${p.conContorno ? "checked" : ""}> Contorno (habilitar / deshabilitar)</label>
    ${[["contornoGrosor", "Grosor del contorno", 0, 60], ["anillo", "Anillo claro bajo el contorno", 0, 25]].map(barra).join("")}
    <label class="campo">Color del contorno (vacío = según el estilo)</label><div style="display:grid;grid-template-columns:1fr auto;gap:6px"><input type="color" data-b="contornoColor" value="${p.contornoColor || "#17224a"}" style="width:100%;height:38px;border:1px solid var(--borde);border-radius:9px;padding:2px"><button type="button" class="btn" data-contorno-auto>Auto</button></div>
    <label class="campo">Color del anillo</label><input type="color" data-b="anilloColor" value="${p.anilloColor}" style="width:100%;height:38px;border:1px solid var(--borde);border-radius:9px;padding:2px">
    <h3 style="margin:14px 0 0;font-size:14px">Relieve</h3>
    ${[["profundidad", "Profundidad (extrusión)", 0, 30], ["bisel", "Bisel", 0, 100], ["brillo", "Brillo", 0, 100], ["cursiva", "Cursiva (°)", 0, 20], ["interlineado", "Interlineado (%)", 70, 140], ["rotacion", "Inclinación del bloque (°)", -15, 15]].map(barra).join("")}`;
}

/* Capa de badge 3D: forma, colores, bisel, brillo, profundidad (extrusión), sombra, resplandor e inclinación */
const BADGE_BASE = { forma: "pildora", fuente: "Segoe UI", color: "#d4140a", borde: "#ffffff", bordeGrosor: 12, colorTexto: "#ffffff", colorTexto2: "", sombraTexto: 45, icono: "", iconoTam: 100, contorno: "#000000", conContorno: true, contornoGrosor: 14, profundidad: 6, bisel: 60, brillo: 45, sombra: 55, resplandor: 0, rotacion: 0 };
const BADGE_FORMAS = [["pildora", "Píldora"], ["redondeado", "Redondeado"], ["rectangulo", "Rectángulo"], ["hexagono", "Hexágono"], ["etiqueta", "Etiqueta (flecha)"], ["cinta", "Cinta"], ["circulo", "Sello ovalado"]];
const BADGE_FUENTES = ["Segoe UI", "Rubik", "Montserrat", "Poppins", "Lilita One", "Titan One", "Archivo Black", "Anton", "Impact", "Arial Black", "Trebuchet MS", "Georgia"];
const BADGE_ESTILOS = [
  ["Rojo clásico", { color: "#d4140a", borde: "#ffffff", colorTexto: "#ffffff", contorno: "#000000", resplandor: 0 }],
  ["Verde éxito", { color: "#16a34a", borde: "#ffffff", colorTexto: "#ffffff", contorno: "#052e16", resplandor: 0 }],
  ["Azul pro", { color: "#1d4ed8", borde: "#ffffff", colorTexto: "#ffffff", contorno: "#0b1d4d", resplandor: 0 }],
  ["Dorado", { color: "#e0a800", borde: "#fff6c4", colorTexto: "#3b2a00", contorno: "#fff3b0", resplandor: 20 }],
  ["Negro cromo", { color: "#1f2937", borde: "#cbd5e1", colorTexto: "#ffffff", contorno: "#000000", resplandor: 0 }],
  ["Naranja fuego", { color: "#f97316", borde: "#ffffff", colorTexto: "#ffffff", contorno: "#5a1d00", resplandor: 40 }],
  ["Morado neón", { color: "#7c3aed", borde: "#e9d5ff", colorTexto: "#ffffff", contorno: "#2e1065", resplandor: 60 }],
  ["Blanco limpio", { color: "#f8fafc", borde: "#0f172a", colorTexto: "#0f172a", contorno: "#ffffff", resplandor: 0 }],
];
/** Aclara (f>0) u oscurece (f<0) un color #rrggbb. */
function cpTono(hex, f) {
  const n = parseInt(String(hex).replace("#", ""), 16) || 0, r = n >> 16, g = (n >> 8) & 255, b = n & 255, t = f < 0 ? 0 : 255, a = Math.abs(f), m = (v) => Math.round(v + (t - v) * a);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
function cpFormaBadge(g, forma, x, y, w, h) {
  g.beginPath();
  const poli = (pts) => pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b)));
  if (forma === "redondeado") g.roundRect(x, y, w, h, h * 0.25);
  else if (forma === "rectangulo") g.roundRect(x, y, w, h, h * 0.06);
  else if (forma === "hexagono") { poli([[x + h * 0.3, y], [x + w - h * 0.3, y], [x + w, y + h / 2], [x + w - h * 0.3, y + h], [x + h * 0.3, y + h], [x, y + h / 2]]); g.closePath(); }
  else if (forma === "etiqueta") { poli([[x, y], [x + w - h * 0.5, y], [x + w, y + h / 2], [x + w - h * 0.5, y + h], [x, y + h]]); g.closePath(); }
  else if (forma === "cinta") { poli([[x, y], [x + w, y], [x + w - h * 0.3, y + h / 2], [x + w, y + h], [x, y + h], [x + h * 0.3, y + h / 2]]); g.closePath(); }
  else if (forma === "circulo") g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else g.roundRect(x, y, w, h, h / 2);
}
function cpBadge3D(c) {
  const p = { ...BADGE_BASE, ...c }, t = p.tam, fuente = `bold ${t}px '${p.fuente}', 'Segoe UI Emoji', sans-serif`;
  const lineas = String(p.texto).split("\n"), nl = lineas.length;
  const medir = cpLienzo(10, 10).getContext("2d"); medir.font = fuente; const tw = Math.max(...lineas.map((l) => medir.measureText(l).width));
  const iconoT = p.icono ? Math.round((t * 1.5 * p.iconoTam) / 100) : 0, iw = p.icono ? Math.round(iconoT * 1.1 + t * 0.2) : 0;
  const h = Math.ceil(t * (p.forma === "circulo" ? 2.6 : nl === 1 ? 1.9 : nl * 1.12 + 0.8)); let w = Math.ceil(tw + iw + t * 1.6);
  if (["hexagono", "etiqueta", "cinta"].includes(p.forma)) w += Math.ceil(h * 0.5);
  if (p.forma === "circulo") w = Math.max(w, Math.ceil(h * 1.35));
  const prof = Math.round((p.profundidad * t) / 60), pad = Math.ceil(t * 0.6 + prof + (t * 0.9 * p.resplandor) / 100), dx = Math.round(prof * 0.35);
  const k = cpLienzo(w + pad * 2 + dx, h + pad * 2 + prof), g = k.getContext("2d");
  g.lineJoin = "round"; const cara = () => cpFormaBadge(g, p.forma, pad, pad, w, h), en = (ox, oy) => cpFormaBadge(g, p.forma, pad + ox, pad + oy, w, h);
  // resplandor
  if (p.resplandor > 0) { g.save(); g.shadowColor = p.color; g.shadowBlur = (t * 0.9 * p.resplandor) / 100 * 2; g.fillStyle = p.color; for (let i = 0; i < 2; i++) { cara(); g.fill(); } g.restore(); }
  // profundidad (extrusión hacia abajo y un poco a la derecha) con la sombra proyectada
  for (let i = prof; i >= 1; i--) {
    g.save();
    if (i === prof) { g.shadowColor = `rgba(0,0,0,${0.6 * p.sombra / 100})`; g.shadowBlur = (t * 0.5 * p.sombra) / 100; g.shadowOffsetY = t * 0.14 * (p.sombra / 100); }
    g.fillStyle = cpTono(p.color, -0.55); en(Math.round((dx * i) / Math.max(prof, 1)), i); g.fill(); g.restore();
  }
  if (prof === 0 && p.sombra > 0) { g.save(); g.shadowColor = `rgba(0,0,0,${0.6 * p.sombra / 100})`; g.shadowBlur = (t * 0.5 * p.sombra) / 100; g.shadowOffsetY = t * 0.14 * (p.sombra / 100); g.fillStyle = p.color; cara(); g.fill(); g.restore(); }
  // cara con degradado
  const gr = g.createLinearGradient(0, pad, 0, pad + h); gr.addColorStop(0, cpTono(p.color, 0.32)); gr.addColorStop(0.5, p.color); gr.addColorStop(1, cpTono(p.color, -0.35));
  g.fillStyle = gr; cara(); g.fill();
  // bisel: luz arriba-izquierda, sombra abajo-derecha, solo por dentro
  if (p.bisel > 0) {
    const d = Math.max(1, t * 0.05 * p.bisel / 100 * 2), lw = t * 0.2 * p.bisel / 100 * 2;
    g.save(); cara(); g.clip(); g.lineWidth = lw;
    g.save(); g.translate(d, d); g.strokeStyle = `rgba(255,255,255,${0.55 * p.bisel / 100})`; cara(); g.stroke(); g.restore();
    g.save(); g.translate(-d, -d); g.strokeStyle = `rgba(0,0,0,${0.45 * p.bisel / 100})`; cara(); g.stroke(); g.restore();
    g.restore();
  }
  // brillo (reflejo superior)
  if (p.brillo > 0) {
    g.save(); cara(); g.clip(); const br = g.createLinearGradient(0, pad, 0, pad + h * 0.55); br.addColorStop(0, `rgba(255,255,255,${0.65 * p.brillo / 100})`); br.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = br; g.fillRect(pad, pad, w, h * 0.55);
    g.fillStyle = `rgba(255,255,255,${0.5 * p.brillo / 100})`; g.beginPath(); g.ellipse(pad + w * 0.16, pad + h * 0.2, w * 0.06, h * 0.07, -0.4, 0, Math.PI * 2); g.fill(); g.restore();
  }
  // borde
  if (p.bordeGrosor > 0) { g.lineWidth = (t * p.bordeGrosor) / 100; g.strokeStyle = p.borde; cara(); g.stroke(); }
  // icono + texto (una o varias líneas) con relieve y contorno
  g.font = fuente; g.textAlign = "center"; g.textBaseline = "middle";
  const extra = ["hexagono", "etiqueta", "cinta"].includes(p.forma) ? (p.forma === "etiqueta" ? -h * 0.12 : 0) : 0, cy = pad + h / 2 + 2, rel = Math.min(5, Math.round(prof * 0.4));
  const areaX = pad + t * 0.8 + iw, areaW = w - t * 1.6 - iw, cx = areaX + areaW / 2 + extra;
  if (p.icono) { g.font = `${iconoT}px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif`; g.save(); g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = t * 0.2; g.shadowOffsetY = t * 0.08; g.fillText(p.icono, pad + t * 0.8 + iw / 2 + extra * 0.3, cy); g.restore(); g.font = fuente; }
  lineas.forEach((txt, i) => {
    const ly = cy + (i - (nl - 1) / 2) * t * 1.12, col = i === 0 ? p.colorTexto : p.colorTexto2 || p.colorTexto;
    for (let d = rel; d >= 1; d--) { g.fillStyle = cpTono(col, -0.6); g.fillText(txt, cx + Math.round(d * 0.35), ly + d); }
    g.save(); if (p.sombraTexto > 0) { g.shadowColor = `rgba(0,0,0,${0.9 * p.sombraTexto / 100})`; g.shadowBlur = t * 0.16; g.shadowOffsetX = t * 0.03; g.shadowOffsetY = t * 0.1; }
    if (p.conContorno) { g.lineWidth = (t * p.contornoGrosor) / 100; g.strokeStyle = p.contorno; g.strokeText(txt, cx, ly); }
    g.fillStyle = col; g.fillText(txt, cx, ly); g.restore();
  });
  // inclinación
  if (p.rotacion) {
    const a = (p.rotacion * Math.PI) / 180, W2 = Math.ceil(Math.abs(k.width * Math.cos(a)) + Math.abs(k.height * Math.sin(a))), H2 = Math.ceil(Math.abs(k.width * Math.sin(a)) + Math.abs(k.height * Math.cos(a)));
    const r = cpLienzo(W2, H2), q = r.getContext("2d"); q.translate(W2 / 2, H2 / 2); q.rotate(a); q.drawImage(k, -k.width / 2, -k.height / 2); return r;
  }
  return k;
}

/* ── mis badges: se guardan con nombre y se reutilizan desde un menú desplegable ── */
const CAMPOS_BADGE = ["texto", "icono", "iconoTam", "colorTexto2", "tam", "forma", "fuente", "color", "borde", "bordeGrosor", "colorTexto", "contorno", "conContorno", "contornoGrosor", "profundidad", "bisel", "brillo", "sombra", "resplandor", "rotacion", "opacidad"];
const cpParamsBadge = (c) => Object.fromEntries(CAMPOS_BADGE.map((k) => [k, c[k] ?? BADGE_BASE[k] ?? (k === "opacidad" ? 1 : undefined)]));
const cpGuardarBadges = () => cpDBset("badges", CP.badges);
function cpMenuBadges() {
  const m = $("cp-badges-menu"); if (!m) return;
  m.innerHTML = `<option value="">🏷 ${CP.badges.length ? "Insertar badge guardado…" : "(aún no guardas badges)"}</option>` + CP.badges.map((b) => `<option value="${b.id}">${esc(b.nombre)}</option>`).join("");
  m.disabled = !CP.badges.length; m.value = "";
}
function cpInsertarBadge(id) {
  const b = CP.badges.find((x) => x.id === id); if (!b) return;
  const c = cpCrear("badge", "Badge · " + b.nombre, { ...BADGE_BASE, ...b.params, extra: true });
  c.x = Math.round((CP.W - c.bmp.width) / 2); c.y = 60; cpInsertar(c); cpLista(); cpAjustes(); cpDibujar();
}
async function cpGuardarEsteBadge(c) {
  const n = prompt("Nombre para este badge:", String(c.texto).replace(/^\S+\s/u, "").slice(0, 40) || "Mi badge"); if (!n || !n.trim()) return;
  CP.badges.push({ id: "b" + Date.now(), nombre: n.trim().slice(0, 40), params: cpParamsBadge(c) });
  await cpGuardarBadges(); cpMenuBadges(); cpAjustes(); aviso("Badge «" + n.trim() + "» guardado.");
}


/* ── efectos de imagen (capas PNG): forma, borde, contorno, sombra, relieve, 3D, resplandor, color, giro e inclinación ── */
const FX_BASE = {
  forma: "original", esquinas: 12,
  conBorde: false, bordeColor: "#ffffff", bordeGrosor: 3,
  conContorno: false, contornoColor: "#000000", contornoGrosor: 1.2,
  conSombra: false, sombraColor: "#000000", sombraDist: 3, sombraAngulo: 60, sombraBlur: 3, sombraOpacidad: 70,
  conRelieve: false, relieve: 50,
  con3d: false, prof3d: 4, ang3d: 60, color3d: "#1f2937",
  conGlow: false, glowColor: "#00e5ff", glowTam: 4,
  brillo: 100, contraste: 100, saturacion: 100, tono: 0, desenfoque: 0, grises: 0,
  rotacion: 0, skewX: 0, skewY: 0, espejoH: false, espejoV: false,
  conPers: false, tlx: 0, tly: 0, trx: 0, try: 0, brx: 0, bry: 0, blx: 0, bly: 0,
};
const FX_FORMAS = [["original", "Original (sin recorte)"], ["circulo", "Círculo / óvalo"], ["redondeado", "Esquinas redondeadas"], ["pildora", "Píldora"], ["hexagono", "Hexágono"], ["octagono", "Octágono"], ["rombo", "Rombo"], ["triangulo", "Triángulo"], ["estrella", "Estrella"], ["corazon", "Corazón"]];
const FX_RAPIDOS = [
  ["🏷 Sticker blanco", { conBorde: true, bordeColor: "#ffffff", bordeGrosor: 3.5, conSombra: true, sombraDist: 1.5, sombraBlur: 2.5, sombraOpacidad: 55 }],
  ["🌫 Sombra suave", { conSombra: true, sombraDist: 3, sombraAngulo: 60, sombraBlur: 5, sombraOpacidad: 50 }],
  ["💡 Neón cian", { conGlow: true, glowColor: "#00e5ff", glowTam: 4, conContorno: true, contornoColor: "#e0ffff", contornoGrosor: 0.6 }],
  ["⚙ Relieve metálico", { conRelieve: true, relieve: 85, conContorno: true, contornoColor: "#111111", contornoGrosor: 1.2, brillo: 110, contraste: 115 }],
  ["🧱 Bloque 3D", { con3d: true, prof3d: 6, ang3d: 60, color3d: "#1f2937", conContorno: true, contornoColor: "#000000", contornoGrosor: 1, conSombra: true, sombraDist: 5, sombraBlur: 4, sombraOpacidad: 55 }],
  ["📷 Polaroid inclinada", { forma: "redondeado", esquinas: 4, conBorde: true, bordeColor: "#ffffff", bordeGrosor: 3, conSombra: true, sombraDist: 3, sombraBlur: 4, sombraOpacidad: 55, rotacion: -5 }],
];
/** Perspectivas de un clic: desplazan las 4 esquinas (en % del ancho y del alto de la imagen). */
const FX_PERSPECTIVAS = [
  ["◧ Fuga a la derecha", { tlx: 0, tly: 0, trx: -14, try: 14, brx: -14, bry: -14, blx: 0, bly: 0 }],
  ["◨ Fuga a la izquierda", { tlx: 14, tly: 14, trx: 0, try: 0, brx: 0, bry: 0, blx: 14, bly: -14 }],
  ["⬓ Suelo (arriba más angosto)", { tlx: 20, tly: 0, trx: -20, try: 0, brx: 0, bry: 0, blx: 0, bly: 0 }],
  ["⬒ Techo (abajo más angosto)", { tlx: 0, tly: 0, trx: 0, try: 0, brx: -20, bry: 0, blx: 20, bly: 0 }],
];
const CP_FXM = new WeakMap(); // matriz que lleva la imagen original (su esquina superior izquierda) a la capa ya con efectos
/** Las 4 esquinas de la imagen movidas: arriba-izq, arriba-der, abajo-der, abajo-izq (en píxeles de la imagen original). */
const cpEsquinasFx = (f, w, h) => [[(f.tlx * w) / 100, (f.tly * h) / 100], [w + (f.trx * w) / 100, (f.try * h) / 100], [w + (f.brx * w) / 100, h + (f.bry * h) / 100], [(f.blx * w) / 100, h + (f.bly * h) / 100]];
/** Perspectiva geométrica: reparte la imagen en una malla de triángulos y deforma cada uno hacia el cuadrilátero de las 4 esquinas. */
function cpPerspectiva(src, Q, minX, minY) {
  const w = src.width, h = src.height, [P0, P1, P2, P3] = Q;
  const cruz = (a, b, c) => (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]), cs = [cruz(P0, P1, P2), cruz(P1, P2, P3), cruz(P2, P3, P0), cruz(P3, P0, P1)];
  if (!(cs.every((x) => x > 0) || cs.every((x) => x < 0))) return null; // el cuadrilátero se cruza o tiene una esquina hacia adentro
  const dx1 = P1[0] - P2[0], dx2 = P3[0] - P2[0], dx3 = P0[0] - P1[0] + P2[0] - P3[0], dy1 = P1[1] - P2[1], dy2 = P3[1] - P2[1], dy3 = P0[1] - P1[1] + P2[1] - P3[1];
  const den = dx1 * dy2 - dx2 * dy1; if (Math.abs(den) < 1e-9) return null;
  const gg = (dx3 * dy2 - dx2 * dy3) / den, hh = (dx1 * dy3 - dx3 * dy1) / den;
  const a = P1[0] - P0[0] + gg * P1[0], b = P3[0] - P0[0] + hh * P3[0], c = P0[0], d = P1[1] - P0[1] + gg * P1[1], e = P3[1] - P0[1] + hh * P3[1], f = P0[1];
  const maxX = Math.max(...Q.map((q) => q[0])), maxY = Math.max(...Q.map((q) => q[1])), out = cpLienzo(Math.max(1, Math.ceil(maxX - minX)), Math.max(1, Math.ceil(maxY - minY))), g = out.getContext("2d");
  g.imageSmoothingQuality = "high"; const N = 24, V = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const u = i / N, v = j / N, k = gg * u + hh * v + 1; V.push({ sx: u * w, sy: v * h, dx: (a * u + b * v + c) / k - minX, dy: (d * u + e * v + f) / k - minY }); }
  const tri = (A, B, C) => {
    const det = (B.sx - A.sx) * (C.sy - A.sy) - (C.sx - A.sx) * (B.sy - A.sy); if (!det) return;
    const m1 = ((B.dx - A.dx) * (C.sy - A.sy) - (C.dx - A.dx) * (B.sy - A.sy)) / det, m3 = ((C.dx - A.dx) * (B.sx - A.sx) - (B.dx - A.dx) * (C.sx - A.sx)) / det;
    const m2 = ((B.dy - A.dy) * (C.sy - A.sy) - (C.dy - A.dy) * (B.sy - A.sy)) / det, m4 = ((C.dy - A.dy) * (B.sx - A.sx) - (B.dy - A.dy) * (C.sx - A.sx)) / det;
    const m5 = A.dx - m1 * A.sx - m3 * A.sy, m6 = A.dy - m2 * A.sx - m4 * A.sy, cx = (A.dx + B.dx + C.dx) / 3, cy = (A.dy + B.dy + C.dy) / 3, ex = (p) => [p.dx + (p.dx - cx) * 0.03 + Math.sign(p.dx - cx) * 0.5, p.dy + (p.dy - cy) * 0.03 + Math.sign(p.dy - cy) * 0.5];
    g.save(); g.beginPath(); [A, B, C].forEach((p, n) => { const [x, y] = ex(p); n ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.clip(); g.setTransform(m1, m2, m3, m4, m5, m6); g.drawImage(src, 0, 0); g.restore();
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const A = V[j * (N + 1) + i], B = V[j * (N + 1) + i + 1], C = V[(j + 1) * (N + 1) + i], D = V[(j + 1) * (N + 1) + i + 1]; tri(A, B, C); tri(B, D, C); }
  return out;
}
function cpFxActivo(fx) {
  const f = { ...FX_BASE, ...fx };
  return f.forma !== "original" || f.conBorde || f.conContorno || f.conSombra || f.conRelieve || f.con3d || f.conGlow || f.brillo !== 100 || f.contraste !== 100 || f.saturacion !== 100 || f.tono !== 0 || f.desenfoque > 0 || f.grises > 0 || f.rotacion !== 0 || f.skewX !== 0 || f.skewY !== 0 || f.espejoH || f.espejoV || f.conPers;
}
function cpTrazoForma(g, forma, w, h, esq) {
  const m = Math.min(w, h), cx = w / 2, cy = h / 2; g.beginPath();
  const poli = (pts) => { pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); };
  if (forma === "circulo") g.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (forma === "redondeado") g.roundRect(0, 0, w, h, (m * esq) / 100);
  else if (forma === "pildora") g.roundRect(0, 0, w, h, m / 2);
  else if (forma === "hexagono") poli([[w * 0.25, 0], [w * 0.75, 0], [w, cy], [w * 0.75, h], [w * 0.25, h], [0, cy]]);
  else if (forma === "octagono") { const a = 0.29; poli([[w * a, 0], [w * (1 - a), 0], [w, h * a], [w, h * (1 - a)], [w * (1 - a), h], [w * a, h], [0, h * (1 - a)], [0, h * a]]); }
  else if (forma === "rombo") poli([[cx, 0], [w, cy], [cx, h], [0, cy]]);
  else if (forma === "triangulo") poli([[cx, 0], [w, h], [0, h]]);
  else if (forma === "estrella") { const pts = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.4 : 1, a = -Math.PI / 2 + (i * Math.PI) / 5; pts.push([cx + Math.cos(a) * r * (w / 2), cy + Math.sin(a) * r * (h / 2)]); } poli(pts); }
  else if (forma === "corazon") { g.moveTo(cx, h * 0.92); g.bezierCurveTo(-w * 0.1, h * 0.55, w * 0.02, h * 0.05, cx, h * 0.3); g.bezierCurveTo(w * 0.98, h * 0.05, w * 1.1, h * 0.55, cx, h * 0.92); g.closePath(); }
  else g.rect(0, 0, w, h);
}
/** Copia de un lienzo pintada de un solo color (conserva la forma, es decir, su transparencia). */
function cpSilueta(src, color) { const k = cpLienzo(src.width, src.height), q = k.getContext("2d"); q.drawImage(src, 0, 0); q.globalCompositeOperation = "source-in"; q.fillStyle = color; q.fillRect(0, 0, k.width, k.height); return k; }
/** Agranda la silueta r píxeles hacia afuera (dibujándola alrededor de un círculo). */
function cpDilatar(ctx, sil, r, ox, oy) {
  if (r > 0) for (const rr of [r, r * 0.5]) { const n = Math.max(12, Math.min(48, Math.round(rr * 2))); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; ctx.drawImage(sil, ox + Math.cos(a) * rr, oy + Math.sin(a) * rr); } }
  ctx.drawImage(sil, ox, oy);
}
/** Zona de la silueta que NO queda cubierta al correrla (dx, dy): sirve para la luz y la sombra del relieve. */
function cpBanda(mask, dx, dy, color, blur) {
  const k = cpSilueta(mask, color), q = k.getContext("2d"); q.globalCompositeOperation = "destination-out"; q.drawImage(mask, dx, dy);
  if (!blur) return k; const r = cpLienzo(k.width, k.height), z = r.getContext("2d"); z.filter = `blur(${blur}px)`; z.drawImage(k, 0, 0); return r;
}
function cpFxImagen(c) {
  const f = { ...FX_BASE, ...c.fx }, src = c.imagen, W0 = src.width, H0 = src.height, u = Math.min(W0, H0) / 100;
  // 1) base: recorte con forma + ajustes de color + espejo
  let base = cpLienzo(W0, H0); const b = base.getContext("2d"), filtros = [];
  if (f.brillo !== 100) filtros.push(`brightness(${f.brillo}%)`); if (f.contraste !== 100) filtros.push(`contrast(${f.contraste}%)`); if (f.saturacion !== 100) filtros.push(`saturate(${f.saturacion}%)`);
  if (f.tono) filtros.push(`hue-rotate(${f.tono}deg)`); if (f.grises) filtros.push(`grayscale(${f.grises}%)`); if (f.desenfoque > 0) filtros.push(`blur(${f.desenfoque * u * 0.15}px)`);
  b.save(); if (f.forma !== "original") { cpTrazoForma(b, f.forma, W0, H0, f.esquinas); b.clip(); }
  b.translate(f.espejoH ? W0 : 0, f.espejoV ? H0 : 0); b.scale(f.espejoH ? -1 : 1, f.espejoV ? -1 : 1); if (filtros.length) b.filter = filtros.join(" "); b.drawImage(src, 0, 0); b.restore();
  // 2) relieve: borde claro arriba-izquierda y oscuro abajo-derecha, solo sobre la propia imagen
  if (f.conRelieve) {
    const d = Math.max(1, u * 0.9 * (f.relieve / 50)), a = Math.min(1, 0.75 * (f.relieve / 50)), m = cpSilueta(base, "#ffffff");
    b.save(); b.globalCompositeOperation = "source-atop"; b.drawImage(cpBanda(m, d, d, `rgba(255,255,255,${a})`, d * 0.5), 0, 0); b.drawImage(cpBanda(m, -d, -d, `rgba(0,0,0,${a * 0.8})`, d * 0.5), 0, 0); b.restore();
  }
  // 3) perspectiva: las 4 esquinas se mueven y la imagen se deforma (después se le ponen borde, sombra y 3D a la silueta ya deformada)
  let minX = 0, minY = 0;
  if (f.conPers) {
    const Q = cpEsquinasFx(f, W0, H0), mx = Math.min(...Q.map((q) => q[0])), my = Math.min(...Q.map((q) => q[1])), w = cpPerspectiva(base, Q, mx, my);
    if (w) { base = w; minX = mx; minY = my; }
  }
  const W = base.width, H = base.height;
  // 4) tamaños (todos en % del lado menor de la imagen original, así no cambian si se agranda o se achica la capa)
  const r1 = f.conContorno ? f.contornoGrosor * u : 0, r2 = f.conBorde ? f.bordeGrosor * u : 0, R = r1 + r2, prof = f.con3d ? f.prof3d * u : 0, sd = f.conSombra ? f.sombraDist * u : 0, sb = f.conSombra ? f.sombraBlur * u : 0, gl = f.conGlow ? f.glowTam * u : 0;
  const pad = Math.ceil(R + prof + sd + sb * 2 + gl * 2 + 4), st = cpLienzo(W + pad * 2, H + pad * 2), g = st.getContext("2d");
  const sil = (col) => cpSilueta(base, col), ang3 = (f.ang3d * Math.PI) / 180, angS = (f.sombraAngulo * Math.PI) / 180;
  const solido = cpLienzo(st.width, st.height), sg = solido.getContext("2d"), negro = sil("#000000");
  for (let i = prof; i >= 0; i -= Math.max(1, prof / 40)) cpDilatar(sg, negro, R, pad + Math.cos(ang3) * i, pad + Math.sin(ang3) * i);
  const teñir = (col) => { const k = cpLienzo(st.width, st.height), q = k.getContext("2d"); q.drawImage(solido, 0, 0); q.globalCompositeOperation = "source-in"; q.fillStyle = col; q.fillRect(0, 0, k.width, k.height); return k; };
  if (f.conGlow && gl > 0) { g.save(); g.filter = `blur(${gl}px)`; const t = teñir(f.glowColor); g.drawImage(t, 0, 0); g.drawImage(t, 0, 0); g.restore(); }
  if (f.conSombra && f.sombraOpacidad > 0) { g.save(); g.globalAlpha = f.sombraOpacidad / 100; if (sb > 0) g.filter = `blur(${sb}px)`; g.drawImage(teñir(f.sombraColor), Math.cos(angS) * sd, Math.sin(angS) * sd); g.restore(); }
  if (f.con3d && prof > 0) { const o = sil(f.color3d); for (let i = prof; i >= 1; i -= Math.max(1, prof / 40)) cpDilatar(g, o, R, pad + Math.cos(ang3) * i, pad + Math.sin(ang3) * i); }
  if (r2 > 0) cpDilatar(g, sil(f.bordeColor), R, pad, pad);
  if (r1 > 0) cpDilatar(g, sil(f.contornoColor), r1, pad, pad);
  g.drawImage(base, pad, pad);
  // matriz: imagen original → capa final (sirve para ubicar las esquinas en la miniatura)
  let M = new DOMMatrix().translate(pad - minX, pad - minY);
  if (!f.rotacion && !f.skewX && !f.skewY) { CP_FXM.set(c, M); return st; }
  // 5) giro e inclinación
  const rot = (f.rotacion * Math.PI) / 180, tx = Math.tan((f.skewX * Math.PI) / 180), ty = Math.tan((f.skewY * Math.PI) / 180), cs = Math.cos(rot), sn = Math.sin(rot);
  const pt = (x, y) => { const sx = x + tx * y, sy = ty * x + y; return [sx * cs - sy * sn, sx * sn + sy * cs]; };
  const hw = st.width / 2, hh = st.height / 2, pts = [pt(-hw, -hh), pt(hw, -hh), pt(hw, hh), pt(-hw, hh)];
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), W2 = Math.ceil(Math.max(...xs) - Math.min(...xs)), H2 = Math.ceil(Math.max(...ys) - Math.min(...ys));
  const out = cpLienzo(W2, H2), o = out.getContext("2d"); o.translate(W2 / 2, H2 / 2); o.rotate(rot); o.transform(1, ty, tx, 1, 0, 0); o.drawImage(st, -hw, -hh);
  M = new DOMMatrix().translate(W2 / 2, H2 / 2).rotate(f.rotacion).multiply(new DOMMatrix([1, ty, tx, 1, 0, 0])).translate(-hw, -hh).multiply(M);
  CP_FXM.set(c, M); return out;
}
/** Capa de imagen: con efectos o sin ellos. Al rehacerla se mantiene en su sitio el punto donde estaba la esquina de la imagen original. */
function cpRehacerImagen(c) {
  const ant = CP_FXM.get(c), [sx, sy] = cpEsc(c), o0 = ant ? ant.transformPoint({ x: 0, y: 0 }) : null;
  const ax = o0 ? c.x + o0.x * sx : 0, ay = o0 ? c.y + o0.y * sy : 0;
  if (c.fx && cpFxActivo(c.fx)) c.bmp = cpFxImagen(c); else { c.bmp = c.imagen; CP_FXM.set(c, new DOMMatrix()); }
  if (o0) { const n0 = CP_FXM.get(c).transformPoint({ x: 0, y: 0 }); c.x = Math.round(ax - n0.x * sx); c.y = Math.round(ay - n0.y * sy); }
}
let cpFxPendiente = null;
function cpFxProgramar(c) { cancelAnimationFrame(cpFxPendiente); cpFxPendiente = requestAnimationFrame(() => { cpRehacer(c); cpDibujar(); }); }
function cpHtmlFx(c) {
  const f = { ...FX_BASE, ...c.fx };
  const barra = ([campo, nombre, min, max, paso]) => `<label class="campo">${nombre}: <span data-fv="${campo}">${f[campo]}</span></label><input type="range" min="${min}" max="${max}" step="${paso || 1}" value="${f[campo]}" data-fx="${campo}" data-num>`;
  const col = (campo, nombre) => `<div><label class="campo">${nombre}</label><input type="color" data-fx="${campo}" value="${f[campo]}" style="width:100%;height:38px;border:1px solid var(--borde);border-radius:9px;padding:2px"></div>`;
  const chk = (campo, nombre) => `<label class="check" style="margin-top:8px"><input type="checkbox" data-fx="${campo}" ${f[campo] ? "checked" : ""}> ${nombre}</label>`;
  const grupo = (titulo, cuerpo) => `<details style="margin-top:8px;border:1px solid var(--borde);border-radius:10px;padding:6px 10px"><summary style="cursor:pointer;font-weight:600">${titulo}</summary>${cuerpo}</details>`;
  return `<h3 style="margin:14px 0 4px;font-size:14px">Efectos de la imagen</h3>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px">${FX_RAPIDOS.map(([n], i) => `<button type="button" class="btn" style="padding:6px 8px;justify-content:flex-start" data-fx-rapido="${i}">${n}</button>`).join("")}</div>
    <div class="botones" style="margin-top:6px"><button type="button" class="btn contorno-rojo" data-fx-quitar ${c.fx && cpFxActivo(c.fx) ? "" : "disabled"}>✕ Quitar todos los efectos</button></div>
    ${grupo("▢ Forma", `<label class="campo">Recortar con la forma</label><select data-fx="forma">${FX_FORMAS.map(([v, n]) => `<option value="${v}" ${f.forma === v ? "selected" : ""}>${n}</option>`).join("")}</select>${barra(["esquinas", "Esquinas redondeadas (solo «Esquinas redondeadas»)", 0, 50])}`)}
    ${grupo("🔲 Borde y contorno", `${chk("conBorde", "Borde exterior (como un sticker)")}<div class="fila2">${col("bordeColor", "Color del borde")}</div>${barra(["bordeGrosor", "Grosor del borde", 0, 15, 0.1])}${chk("conContorno", "Contorno ajustado a la silueta")}<div class="fila2">${col("contornoColor", "Color del contorno")}</div>${barra(["contornoGrosor", "Grosor del contorno", 0, 10, 0.1])}`)}
    ${grupo("🌑 Sombra y resplandor", `${chk("conSombra", "Sombra")}<div class="fila2">${col("sombraColor", "Color de la sombra")}</div>${barra(["sombraDist", "Distancia", 0, 15, 0.1])}${barra(["sombraAngulo", "Dirección (°) · 0 derecha, 90 abajo", 0, 360])}${barra(["sombraBlur", "Desenfoque", 0, 15, 0.1])}${barra(["sombraOpacidad", "Opacidad de la sombra", 0, 100])}${chk("conGlow", "Resplandor (brillo de color alrededor)")}<div class="fila2">${col("glowColor", "Color del resplandor")}</div>${barra(["glowTam", "Tamaño del resplandor", 0, 15, 0.1])}`)}
    ${grupo("🧱 Relieve y 3D", `${chk("conRelieve", "Relieve (luz y sombra en los bordes)")}${barra(["relieve", "Intensidad del relieve", 0, 100])}${chk("con3d", "Extrusión 3D")}<div class="fila2">${col("color3d", "Color del lado 3D")}</div>${barra(["prof3d", "Profundidad", 0, 15, 0.1])}${barra(["ang3d", "Dirección (°) · 0 derecha, 90 abajo", 0, 360])}`)}
    ${grupo("🎨 Color de la imagen", `${barra(["brillo", "Brillo (%)", 0, 200])}${barra(["contraste", "Contraste (%)", 0, 200])}${barra(["saturacion", "Saturación (%)", 0, 300])}${barra(["tono", "Cambio de tono (°)", 0, 360])}${barra(["grises", "Blanco y negro (%)", 0, 100])}${barra(["desenfoque", "Desenfoque", 0, 20, 0.5])}`)}
    ${grupo("📐 Perspectiva (mueve las 4 esquinas)", `${chk("conPers", "Activar perspectiva")}${chk("verEsquinas", "Mostrar y arrastrar las esquinas en la miniatura")}
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:6px">${FX_PERSPECTIVAS.map(([n], i) => `<button type="button" class="btn" style="padding:6px 8px;justify-content:flex-start;font-size:12px" data-fx-pers="${i}">${n}</button>`).join("")}</div>
      <div class="botones" style="margin-top:6px"><button type="button" class="btn" data-fx-pers-reset>↺ Esquinas al centro</button></div>
      ${barra(["tlx", "Arriba-izquierda: horizontal (%)", -45, 45, 0.5])}${barra(["tly", "Arriba-izquierda: vertical (%)", -45, 45, 0.5])}${barra(["trx", "Arriba-derecha: horizontal (%)", -45, 45, 0.5])}${barra(["try", "Arriba-derecha: vertical (%)", -45, 45, 0.5])}
      ${barra(["brx", "Abajo-derecha: horizontal (%)", -45, 45, 0.5])}${barra(["bry", "Abajo-derecha: vertical (%)", -45, 45, 0.5])}${barra(["blx", "Abajo-izquierda: horizontal (%)", -45, 45, 0.5])}${barra(["bly", "Abajo-izquierda: vertical (%)", -45, 45, 0.5])}
      <p class="nota">Si dos esquinas se cruzan o una queda hacia adentro, la imagen se muestra sin deformar.</p>`)}
    ${grupo("🔄 Giro e inclinación", `${barra(["rotacion", "Rotación (°)", -180, 180])}${barra(["skewX", "Inclinación horizontal (°)", -45, 45])}${barra(["skewY", "Inclinación vertical (°)", -45, 45])}${chk("espejoH", "Espejo horizontal")}${chk("espejoV", "Espejo vertical")}`)}`;
}

function cpAgregarBadge() {
  const c = cpCrear("badge", "Badge 3D", { ...BADGE_BASE, tam: 58, texto: "✅ Garantizado", extra: true });
  c.x = Math.round((CP.W - c.bmp.width) / 2); c.y = 60; cpInsertar(c); cpLista(); cpAjustes(); cpDibujar();
}
/** Controles del badge (se enlazan con data-b en cpAjustes). */
function cpHtmlBadge(c) {
  const p = { ...BADGE_BASE, ...c }, col = (campo, nombre) => `<div><label class="campo">${nombre}</label><input type="color" data-b="${campo}" value="${p[campo] || p.colorTexto}" style="width:100%;height:38px;border:1px solid var(--borde);border-radius:9px;padding:2px"></div>`;
  const barra = ([campo, nombre, min, max]) => `<label class="campo">${nombre}: <span data-bv="${campo}">${p[campo]}</span></label><input type="range" min="${min}" max="${max}" value="${p[campo]}" data-b="${campo}" data-num>`;
  return `<label class="campo">Mis badges guardados</label>
    <select data-misbadges><option value="">${CP.badges.length ? "Elige uno para aplicarlo a esta capa…" : "(aún no guardas badges)"}</option>${CP.badges.map((b) => `<option value="${b.id}">${esc(b.nombre)}</option>`).join("")}</select>
    <div class="botones" style="margin-top:6px"><button type="button" class="btn" data-bd-guardar>➕ Guardar este badge</button><button type="button" class="btn" data-bd-nuevo disabled>⧉ Insertar como capa</button><button type="button" class="btn" data-bd-ren disabled>✏ Renombrar</button><button type="button" class="btn contorno-rojo" data-bd-borrar disabled>🗑 Borrar</button></div>
    <label class="campo">Plantillas de badge</label><div class="botones" style="margin-top:0"><button type="button" class="btn" data-bd-plantilla="cronometro">⏱ Badge rojo: Reset en 1 Minuto</button><button type="button" class="btn" data-bd-plantilla="garantia">🛡 Garantía total</button></div>
    <label class="campo">Texto del badge (Enter para una segunda línea)</label><textarea data-t rows="2" style="font-family:inherit">${esc(c.texto)}</textarea>
    <div class="fila2"><div><label class="campo">Icono (emoji, opcional)</label><input type="text" data-b="icono" value="${esc(p.icono)}" maxlength="4"></div>
    ${col("colorTexto2", "Color de la 2.ª línea")}</div>
    <label class="campo">Tamaño del icono: <span data-bv="iconoTam">${p.iconoTam}</span></label><input type="range" min="50" max="180" value="${p.iconoTam}" data-b="iconoTam" data-num>
    <div class="botones" style="margin-top:6px;gap:6px">${["🔒", "✅", "⚡", "🔥", "⭐", "💥", "🚀", "✔"].map((e) => `<button type="button" class="btn" style="padding:3px 9px" data-emoji="${e}">${e}</button>`).join("")}</div>
    <label class="campo">Estilos 3D listos</label><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px">${BADGE_ESTILOS.map(([n, e], i) => `<button type="button" class="btn" style="padding:6px 8px;justify-content:flex-start" data-estilo="${i}"><span style="width:16px;height:16px;border-radius:50%;background:${e.color};border:2px solid ${e.borde};display:inline-block"></span>${n}</button>`).join("")}</div>
    <div class="fila2"><div><label class="campo">Forma</label><select data-b="forma">${BADGE_FORMAS.map(([v, n]) => `<option value="${v}" ${p.forma === v ? "selected" : ""}>${n}</option>`).join("")}</select></div>
    <div><label class="campo">Letra</label><select data-b="fuente">${BADGE_FUENTES.map((f) => `<option ${p.fuente === f ? "selected" : ""}>${f}</option>`).join("")}</select></div></div>
    <div class="fila2">${col("color", "Color del badge")}${col("borde", "Color del borde")}</div>
    <div class="fila2">${col("colorTexto", "Color del texto")}${col("contorno", "Color del contorno")}</div>
    <label class="check" style="margin-top:8px"><input type="checkbox" data-b="conContorno" ${p.conContorno ? "checked" : ""}> Contorno de las letras</label>
    <label class="campo">Tamaño</label><input type="range" min="30" max="110" value="${c.tam}" data-tam>
    <h3 style="margin:14px 0 0;font-size:14px">Efecto 3D</h3>
    ${[["profundidad", "Profundidad", 0, 40], ["sombraTexto", "Sombra de las letras", 0, 100], ["bisel", "Bisel", 0, 100], ["brillo", "Brillo", 0, 100], ["sombra", "Sombra", 0, 100], ["resplandor", "Resplandor", 0, 100], ["contornoGrosor", "Grosor del contorno de las letras", 1, 30], ["bordeGrosor", "Grosor del borde", 0, 30], ["rotacion", "Inclinación (°)", -20, 20]].map(barra).join("")}`;
}

/* Marca de agua en texto (si no se sube un logo PNG) */
function cpMarca(c) {
  const t = c.tam, m = cpLienzo(10, 10).getContext("2d"); m.font = `bold ${t}px 'Segoe UI', Arial, sans-serif`;
  const k = cpLienzo(Math.ceil(m.measureText(c.texto).width + 20), Math.ceil(t * 1.5)), g = k.getContext("2d");
  g.font = `bold ${t}px 'Segoe UI', Arial, sans-serif`; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 6; g.fillText(c.texto, 10, k.height / 2);
  return k;
}

/* ── marcos: capas PNG transparentes con distintos estilos ── */
const ESTILOS_MARCO = [["neon", "Neón"], ["neon2", "Doble neón"], ["solido", "Sólido"], ["doble", "Doble línea"], ["bisel", "Biselado 3D"], ["esquinas", "Esquinas"], ["punteado", "Punteado"], ["degradado", "Degradado"], ["redondeado", "Redondeado"], ["dorado", "Dorado"], ["rayas", "Rayas de aviso"]];
function cpDibujarMarco(g, W, H, p) {
  const m = p.margen, gr = p.grosor, x = m, y = m, w = W - 2 * m, h = H - 2 * m, r = (i) => [x + i, y + i, w - 2 * i, h - 2 * i];
  g.save(); g.lineJoin = "round"; g.lineWidth = gr; g.strokeStyle = p.color;
  const poli = (pts, col) => { g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); g.fillStyle = col; g.fill(); };
  switch (p.estilo) {
    case "neon": g.shadowColor = p.color; g.shadowBlur = gr * 2.5; for (let i = 0; i < 2; i++) g.strokeRect(...r(gr / 2)); break;
    case "neon2":
      g.shadowColor = p.color; g.shadowBlur = gr * 2; g.lineWidth = gr * 0.55; g.strokeRect(...r(gr * 0.3)); g.strokeRect(...r(gr * 0.3));
      g.strokeStyle = p.color2; g.shadowColor = p.color2; g.strokeRect(...r(gr * 1.5)); g.strokeRect(...r(gr * 1.5)); break;
    case "solido": g.strokeRect(...r(gr / 2)); break;
    case "doble": g.lineWidth = gr / 3; g.strokeRect(...r(gr / 6)); g.strokeRect(...r(gr * 0.85)); break;
    case "bisel": {
      g.beginPath(); g.rect(x, y, w, h); g.rect(x + gr, y + gr, w - 2 * gr, h - 2 * gr); g.fillStyle = p.color; g.fill("evenodd");
      poli([[x, y], [x + w, y], [x + w - gr, y + gr], [x + gr, y + gr]], "rgba(255,255,255,.45)");
      poli([[x, y], [x + gr, y + gr], [x + gr, y + h - gr], [x, y + h]], "rgba(255,255,255,.25)");
      poli([[x, y + h], [x + gr, y + h - gr], [x + w - gr, y + h - gr], [x + w, y + h]], "rgba(0,0,0,.45)");
      poli([[x + w, y], [x + w, y + h], [x + w - gr, y + h - gr], [x + w - gr, y + gr]], "rgba(0,0,0,.28)"); break;
    }
    case "esquinas": {
      const L = Math.min(w, h) * 0.18, a = gr / 2; g.lineCap = "square"; g.shadowColor = p.color; g.shadowBlur = gr * 0.8; g.beginPath();
      g.moveTo(x + a, y + a + L); g.lineTo(x + a, y + a); g.lineTo(x + a + L, y + a);
      g.moveTo(x + w - a - L, y + a); g.lineTo(x + w - a, y + a); g.lineTo(x + w - a, y + a + L);
      g.moveTo(x + a, y + h - a - L); g.lineTo(x + a, y + h - a); g.lineTo(x + a + L, y + h - a);
      g.moveTo(x + w - a - L, y + h - a); g.lineTo(x + w - a, y + h - a); g.lineTo(x + w - a, y + h - a - L); g.stroke(); break;
    }
    case "punteado": g.lineCap = "round"; g.setLineDash([gr * 1.6, gr * 1.3]); g.strokeRect(...r(gr / 2)); break;
    case "degradado": { const d = g.createLinearGradient(x, y, x + w, y + h); d.addColorStop(0, p.color); d.addColorStop(1, p.color2); g.strokeStyle = d; g.strokeRect(...r(gr / 2)); break; }
    case "redondeado": g.shadowColor = p.color; g.shadowBlur = gr * 0.9; g.beginPath(); g.roundRect(...r(gr / 2), Math.max(0, p.radio)); g.stroke(); break;
    case "dorado": {
      const d = g.createLinearGradient(x, y, x + w, y + h);
      [[0, "#fff4b0"], [0.25, "#e0b020"], [0.5, "#8a6200"], [0.75, "#f6d860"], [1, "#a47a00"]].forEach(([o, c]) => d.addColorStop(o, c));
      g.strokeStyle = d; g.strokeRect(...r(gr / 2)); g.lineWidth = Math.max(2, gr / 5); g.strokeStyle = "rgba(60,40,0,.85)"; g.strokeRect(...r(gr + gr / 6)); break;
    }
    case "rayas": {
      const t = cpLienzo(40, 40), q = t.getContext("2d"); q.fillStyle = p.color2; q.fillRect(0, 0, 40, 40); q.strokeStyle = p.color; q.lineWidth = 14;
      q.beginPath(); q.moveTo(-10, 30); q.lineTo(30, -10); q.moveTo(10, 50); q.lineTo(50, 10); q.moveTo(-10, 10); q.lineTo(10, -10); q.stroke();
      g.strokeStyle = g.createPattern(t, "repeat"); g.strokeRect(...r(gr / 2)); break;
    }
  }
  g.restore();
}
function cpMarco(c) { const k = cpLienzo(CP.W, CP.H); cpDibujarMarco(k.getContext("2d"), CP.W, CP.H, c); return k; }
function cpAgregarMarco(estilo) {
  const c = cpCrear("marco", "Marco · " + ESTILOS_MARCO.find((e) => e[0] === estilo)[1], { estilo, color: "#ff2a2a", color2: "#ffd21f", grosor: 24, margen: 20, radio: 60, sinPos: true, extra: true });
  cpInsertar(c); cpLista(); cpAjustes(); cpDibujar();
}

function cpRehacer(c) {
  c._ab = null; // hueco del marco: se recalcula
  if (c.tipo === "marco") { c.bmp = String(c.estilo).startsWith("propio:") && c.imagen ? c.imagen : cpMarco(c); return; }
  if (c.tipo === "texto") c.bmp = cpTexto3D(c);
  else if (c.tipo === "badge") c.bmp = cpBadge3D(c);
  else if (c.tipo === "marca" && !c.imagen) c.bmp = cpMarca(c);
  else if (c.imagen) cpRehacerImagen(c);
}


/* ── configuración de las capas: nombres, orden, posiciones, textos e imágenes (se guarda en este navegador) ── */
function cpDB() { return new Promise((ok, mal) => { const r = indexedDB.open("gestor-tube", 1); r.onupgradeneeded = () => r.result.createObjectStore("cfg"); r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); }); }
async function cpDBset(k, v) { const db = await cpDB(); return new Promise((ok, mal) => { const t = db.transaction("cfg", "readwrite"); t.objectStore("cfg").put(v, k); t.oncomplete = () => ok(); t.onerror = () => mal(t.error); }); }
async function cpDBget(k) { const db = await cpDB(); return new Promise((ok, mal) => { const q = db.transaction("cfg").objectStore("cfg").get(k); q.onsuccess = () => ok(q.result); q.onerror = () => mal(q.error); }); }
async function cpDBdel(k) { const db = await cpDB(); return new Promise((ok, mal) => { const t = db.transaction("cfg", "readwrite"); t.objectStore("cfg").delete(k); t.oncomplete = () => ok(); t.onerror = () => mal(t.error); }); }
const cpABlob = (k) => new Promise((ok) => k.toBlob(ok, "image/png"));

async function cpDBlistar(prefijo) {
  const db = await cpDB();
  return new Promise((ok, mal) => {
    const salida = [], q = db.transaction("cfg").objectStore("cfg").openCursor();
    q.onsuccess = () => { const c = q.result; if (!c) return ok(salida); if (String(c.key).startsWith(prefijo)) salida.push({ k: String(c.key), v: c.value }); c.continue(); };
    q.onerror = () => mal(q.error);
  });
}
async function cpSerializar() {
  const capas = [];
  for (const c of CP.capas) {
    const { bmp, imagen, _ab, ...resto } = c;
    capas.push({ ...resto, lineas: c.lineas ? c.lineas.map((l) => ({ ...l })) : undefined, imagenPng: imagen ? await cpABlob(imagen) : null });
  }
  return { capas, sel: CP.sel, siguiente: CP.siguiente, version: 2, proyecto: $("cp-proyecto").value, fecha: new Date().toLocaleString() };
}
async function cpAplicar(g) {
  const capas = [];
  for (const s of g.capas) {
    const { imagenPng, ...c } = s; c.bmp = null; c.imagen = null;
    if (imagenPng) { const bm = await createImageBitmap(imagenPng), k = cpLienzo(bm.width, bm.height); k.getContext("2d").drawImage(bm, 0, 0); c.imagen = k; }
    cpRehacer(c); capas.push(c);
  }
  if (!g.version && !g.invertido) capas.reverse(); // configuración antigua: la primera era el fondo
  $("cp-proyecto").value = g.proyecto || "";
  CP.capas = capas; CP.siguiente = Math.max(g.siguiente || 1, CP.siguiente); CP.sel = capas.some((c) => c.id === g.sel) ? g.sel : capas[0].id;
  cpLista(); cpAjustes(); cpDibujar();
}
async function cpGuardarConfig() {
  try {
    const g = await cpSerializar(); await cpDBset("capas", g); // la última guardada se carga sola al abrir el editor
    $("cp-config-estado").textContent = "Configuración guardada · " + g.fecha; aviso("Configuración de las capas guardada.");
  } catch (e) { aviso("No se pudo guardar la configuración: " + e.message, true); }
}
async function cpCargarConfig() {
  try {
    const g = await cpDBget("capas"); if (!g || !g.capas || !g.capas.length) return;
    await cpAplicar(g); $("cp-config-estado").textContent = "Configuración cargada · guardada el " + g.fecha;
  } catch (e) { aviso("No se pudo cargar la configuración guardada: " + e.message, true); }
}


/* ── carpeta base y proyectos en disco ── */
const cpBlobADatos = (b) => new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => mal(r.error); r.readAsDataURL(b); });
async function cpBaseCargar() {
  try {
    const d = await api("/api/base"); $("cp-base").value = d.es_por_defecto ? "" : d.base; $("cp-base").placeholder = "Por defecto: " + d.por_defecto;
    $("cp-base-info").innerHTML = `Carpeta base: <b>${esc(d.base)}</b><br><span class="suave">Cada proyecto se guarda en <b>${esc(d.base)}\\&lt;nombre del proyecto&gt;</b></span>`; $("cp-base-defecto").disabled = d.es_por_defecto;
  } catch (e) { $("cp-base-info").textContent = "No se pudo leer la carpeta base: " + e.message; }
  cpProyectosLista();
}
/* ── imágenes de PromptTUBE organizadas por enfoque ── */
async function cpImagenesCargar() {
  const caja = $("cp-img-lista"); if (!caja) return;
  try {
    const d = await api("/api/imagenes"); $("cp-img-ruta").value = d.es_por_defecto ? "" : d.ruta; $("cp-img-ruta").placeholder = "Por defecto: " + d.por_defecto; $("cp-img-defecto").disabled = d.es_por_defecto;
    $("cp-img-info").innerHTML = `Carpeta de entrada: <b>${esc(d.ruta)}</b>`;
    const total = d.grupos.reduce((a, g) => a + g.imagenes.length, 0);
    caja.innerHTML = (total ? "" : '<p class="suave" style="margin:0 0 8px">Todavía no hay imágenes de entrada: pon las de PromptTUBE en la subcarpeta de su enfoque y pulsa «Actualizar».</p>') + d.grupos.map((g) => `<details ${g.imagenes.length ? "open" : ""} style="margin-top:8px"><summary style="cursor:pointer;font-weight:600">${esc(g.carpeta || "Sin enfoque (sueltas)")} <span class="suave">· ${g.imagenes.length}</span></summary>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-top:8px">${g.imagenes.map((x) => `<button type="button" class="btn" style="padding:4px;flex-direction:column;align-items:stretch;gap:3px;height:auto" data-img="${esc(g.carpeta)}|${esc(x.archivo)}" title="${esc(x.archivo)} · ${esc(x.fecha)}"><img data-miniatura="${esc(g.carpeta)}|${esc(x.archivo)}" alt="" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:6px;background:#0002"><span style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.archivo)}</span></button>`).join("") || '<span class="suave" style="font-size:12px;grid-column:1/-1">Sin imágenes.</span>'}</div></details>`).join("");
    caja.querySelectorAll("img[data-miniatura]").forEach(async (im) => { try { const [c, a] = im.dataset.miniatura.split("|"); im.src = URL.createObjectURL(await GT.imagenBlob(c, a)); } catch { /* sin vista previa */ } });
    caja.querySelectorAll("[data-img]").forEach((b) => (b.onclick = () => { const [c, a] = b.dataset.img.split("|"); cpImagenComoFondo(c, a); }));
  } catch (e) { $("cp-img-info").textContent = "No se pudo leer la carpeta de entrada: " + e.message; }
}
/** Capas visibles, encima del fondo, que por sí solas tapan casi todo el lienzo (por ejemplo una copia de la imagen anterior). */
function cpCapasQueTapan() {
  const lista = [], k = cpLienzo(192, 108), g = k.getContext("2d", { willReadFrequently: true });
  for (const c of CP.capas) {
    if (c.fijo || !c.visible || !c.bmp || c.tipo === "texto" || c.tipo === "badge") continue;
    g.clearRect(0, 0, 192, 108); g.save(); g.scale(0.1, 0.1); cpPintar(g, c); g.restore();
    const d = g.getImageData(0, 0, 192, 108).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 235) n++;
    if (n / (192 * 108) > 0.7) lista.push(c);
  }
  return lista;
}
async function cpImagenComoFondo(carpeta, archivo) {
  try {
    const blob = await GT.imagenBlob(carpeta, archivo); let f = cpFondo();
    if (!f) { f = cpCrear("imagen", "Capa #1 · PromptTUBE (imagen generada)", { fijo: true }); CP.capas.push(f); }
    await cpPonerImagen(new File([blob], archivo, { type: blob.type }), f.id);
    const tapan = cpCapasQueTapan();
    if (tapan.length && confirm("El fondo ya cambió, pero " + (tapan.length > 1 ? "estas capas lo tapan" : "esta capa lo tapa") + " (son imágenes completas que están encima):\n\n" + tapan.map((c) => "• " + c.nombre).join("\n") + "\n\n¿Ocultar" + (tapan.length > 1 ? "las" : "la") + " para que se vea la imagen elegida?")) { tapan.forEach((c) => { c.visible = false; }); cpLista(); cpDibujar(); }
    aviso("«" + archivo + "» puesta como fondo (Capa #1)." + (tapan.length ? " Ojo: hay capas encima que la tapan." : ""));
  } catch (e) { aviso(e.message, true); }
}
async function cpImagenesAplicar(ruta) { try { await api("/api/imagenes/base", { ruta }); await cpImagenesCargar(); aviso("Carpeta de entrada cambiada."); } catch (e) { aviso(e.message, true); } }
async function cpBaseAplicar(ruta) {
  try { await api("/api/base", { ruta }); await cpBaseCargar(); aviso("Carpeta base cambiada."); } catch (e) { aviso(e.message, true); }
}
/** Cada guardado es una versión nueva: los botones muestran el nombre que van a usar (L3210-1, L3210-2…). */
/** Candado: cerrado = sin variaciones (se guarda siempre con el nombre del proyecto y se reemplaza); abierto = cada guardado crea una versión nueva. */
try { CP.bloqueo = localStorage.getItem("gt_variaciones_bloqueadas") === "1"; } catch { /* sin almacenamiento: queda abierto */ }
const cpEtiqueta = (nombre, v) => `${nombre}-${String(v).padStart(2, "0")}`;
const cpSiguienteVersion = (nombre) => Math.max(0, ...(CP.vers[nombre] || [])) + 1;
function cpActualizarVersionUI() {
  const n = cpNombreArchivo(), sig = cpSiguienteVersion(n), conocidas = CP.vers[n] || [], etiqueta = n ? cpEtiqueta(n, sig) : "";
  const todo = $("cp-guardar-todo"); if (!todo) return;
  const dq = $("cp-disquete"); dq.textContent = CP.actual && n && CP.actual.nombre === n ? `💾 Guardar (reemplaza ${CP.actual.version ? cpEtiqueta(n, CP.actual.version) : n})` : "💾 Guardar";
  const c = $("cp-candado"); c.textContent = CP.bloqueo ? "🔒 Variaciones bloqueadas" : "🔓 Variaciones permitidas"; c.style.cssText = CP.bloqueo ? "background:#fef3c7;border-color:#d97706;color:#92400e;font-weight:700" : "";
  if (CP.bloqueo) {
    todo.textContent = n ? `📦 Guardar todo como ${n} (reemplaza)` : "📦 Guardar todo (carpeta del proyecto)";
    $("cp-guardar").textContent = n ? `💾 Guardar miniatura FINAL como ${n}.png` : "💾 Guardar miniatura FINAL (PNG)";
    $("cp-proy-guardar").textContent = n ? `💾 Solo el archivo (${n})` : "💾 Solo el archivo del proyecto";
    $("cp-version-info").textContent = !n ? "" : `🔒 Sin variaciones: se guarda siempre como ${n} y se reemplaza el archivo anterior.${conocidas.length ? " Las variaciones que ya existen no se tocan." : ""} Abre el candado para crear ${etiqueta}.`;
    return;
  }
  todo.textContent = n ? `📦 Guardar todo como ${etiqueta}` : "📦 Guardar todo (carpeta del proyecto)";
  $("cp-guardar").textContent = n ? `💾 Guardar miniatura FINAL como ${etiqueta}` : "💾 Guardar miniatura FINAL (PNG)";
  $("cp-proy-guardar").textContent = n ? `💾 Solo el archivo como ${etiqueta}` : "💾 Solo el archivo del proyecto";
  $("cp-version-info").textContent = !n ? "" : conocidas.length ? `Ya existen: ${conocidas.map((x) => cpEtiqueta(n, x)).join(", ")}. Al guardar se crea ${etiqueta}; ninguna versión anterior se reemplaza.` : `Todavía no hay versiones de ${n}: el primer guardado crea ${etiqueta}.`;
}
function cpAlternarCandado() {
  CP.bloqueo = !CP.bloqueo; try { localStorage.setItem("gt_variaciones_bloqueadas", CP.bloqueo ? "1" : "0"); } catch { /* sin almacenamiento */ }
  cpActualizarVersionUI(); aviso(CP.bloqueo ? "🔒 Variaciones bloqueadas: al guardar se reemplaza el archivo del proyecto." : "🔓 Variaciones permitidas: cada guardado crea una versión nueva.");
}
async function cpProyectosLista() {
  const caja = $("cp-proy-lista"); let filas = [];
  try { filas = await api("/api/proyectos"); } catch (e) { caja.textContent = "No se pudo leer: " + e.message; return; }
  CP.vers = {}; for (const f of filas) if (f.version) (CP.vers[f.proyecto] ||= []).push(f.version); for (const k in CP.vers) CP.vers[k].sort((a, b) => a - b);
  caja.innerHTML = filas.length ? filas.map((f) => `<div class="check" style="margin:0 0 6px;justify-content:space-between;flex-wrap:wrap" data-proy="${esc(f.nombre)}" data-stem="${esc(f.proyecto)}" data-ver="${f.version || ""}"><span style="flex:1;min-width:120px"><b>${esc(f.nombre)}</b>${f.version ? ` <span class="suave" style="font-size:12px">versión ${f.version} de ${esc(f.proyecto)}</span>` : ""}<br><span class="suave" style="font-size:12px">${esc(f.fecha.slice(0, 16))} · ${(f.bytes / 1e6).toFixed(1)} MB</span></span>
    <button class="btn" style="padding:4px 9px" data-abrir>Abrir</button><button class="btn contorno-rojo" style="padding:4px 9px" data-borrar-proy title="Borrar el archivo del proyecto">🗑</button></div>`).join("") : '<p class="suave" style="margin:0">Aún no hay proyectos en esta carpeta.</p>';
  caja.querySelectorAll("[data-proy]").forEach((fila) => {
    const n = fila.dataset.proy;
    fila.querySelector("[data-abrir]").onclick = () => cpProyectoAbrir(n, fila.dataset.stem, +fila.dataset.ver || null);
    fila.querySelector("[data-borrar-proy]").onclick = async () => { if (!confirm("¿Borrar el archivo del proyecto «" + n + "» (proyecto.json)? La miniatura, las capas y los datos de su carpeta se conservan.")) return; try { await api("/api/proyectos/borrar", { nombre: n }); await cpProyectosLista(); } catch (e) { aviso(e.message, true); } };
  });
  cpActualizarVersionUI();
}
/** Todo el estado del proyecto como un objeto (las imágenes subidas van incrustadas). */
async function cpProyectoObjeto() {
  const g = await cpSerializar(); for (const c of g.capas) if (c.imagenPng) c.imagenPng = await cpBlobADatos(c.imagenPng);
  return { formato: "gestor-tube-proyecto", version: 1, ...g };
}
/** Todas las variables del proyecto en un resumen legible (datos.json). */
function cpDatos(etiqueta) {
  return {
    proyecto: $("cp-proyecto").value, version: etiqueta || undefined, guardado: new Date().toLocaleString(), lienzo: { ancho: CP.W, alto: CP.H }, orden: "la primera capa es la de arriba y la última es el fondo",
    capas: CP.capas.map((c, i) => {
      const { bmp, imagen, _ab, lineas, ...ajustes } = c;
      return { orden: i + 1, nombre: c.nombre, tipo: c.tipo, visible: c.visible, posicion: { x: c.x, y: c.y }, escala: cpEsc(c), opacidad: c.opacidad, lineas: lineas ? lineas.map((l) => ({ ...l })) : undefined, tieneImagen: !!imagen, ajustes };
    }),
  };
}
const cpAPng = (k) => new Promise((ok) => k.toBlob(ok, "image/png"));
/** Pide al servidor el número de la siguiente versión libre del proyecto (así nunca se reemplaza una existente). */
async function cpNuevaVersion(nombre) { return (await api("/api/proyecto_version?nombre=" + encodeURIComponent(nombre))).siguiente; }
/** Guarda todo el proyecto en una versión NUEVA (L3210-2…): miniatura final, proyecto.json, capas y datos.json. */
async function cpGuardarTodo(sobre) {
  const nombre = cpNombreArchivo(); if (!nombre) return aviso("Escribe el nombre del proyecto (debajo de la miniatura): será el nombre de la subcarpeta.", true);
  const btn = $("cp-guardar-todo"); btn.disabled = true;
  try {
    if (!CP.capas.some((k) => k.visible && k.bmp)) throw new Error("No hay nada que guardar: agrega o muestra al menos una capa.");
    const version = sobre ? sobre.version : CP.bloqueo ? null : await cpNuevaVersion(nombre), etiqueta = version ? cpEtiqueta(nombre, version) : nombre;
    if (!sobre && CP.bloqueo && (await api("/api/proyectos")).some((f) => f.nombre === nombre && !f.version) && !confirm("Con el candado cerrado se reemplazan los archivos de «" + nombre + "» (" + nombre + ".png, proyecto.json, datos.json y capas). ¿Continuar? (Abre el candado para conservar los anteriores como variaciones.)")) return;
    const final = await cpBlobADatos(await cpExportar()), proyecto = await cpProyectoObjeto(), capas = [];
    for (const c of CP.capas) capas.push({ nombre: c.nombre, png: c.bmp ? await cpBlobADatos(await cpAPng(c.bmp)) : null });
    const d = await api("/api/proyecto_completo?nombre=" + encodeURIComponent(nombre) + (version ? "&version=" + version : "&sinversion=1"), JSON.stringify({ final, proyecto, capas, datos: cpDatos(etiqueta) }), true);
    CP.actual = { nombre, version: d.version || null }; cpActualizarVersionUI();
    $("cp-resultado").textContent = "Guardado " + d.etiqueta + " en: " + d.carpeta + " (" + d.capas.length + " capas)"; await cpProyectosLista(); aviso(sobre || CP.bloqueo ? "💾 Guardado en " + d.etiqueta + " (se reemplazó el anterior)." : "Guardado como " + d.etiqueta + ".");
  } catch (e) { aviso("No se pudo guardar todo: " + e.message, true); }
  finally { btn.disabled = false; }
}
/** 💾 Disquete: guarda sobre el proyecto abierto (o sobre el último guardado). Si todavía no hay ninguno, hace el primer guardado según el candado. */
async function cpDisquete() {
  const nombre = cpNombreArchivo();
  if (CP.actual && nombre && CP.actual.nombre === nombre) return cpGuardarTodo({ version: CP.actual.version });
  return cpGuardarTodo();
}
async function cpAbrirCarpeta(nombre) { try { await api("/api/abrir_carpeta", { nombre }); } catch (e) { aviso(e.message, true); } }
async function cpProyectoGuardar() {
  const nombre = cpNombreArchivo(); if (!nombre) return aviso("Escribe el nombre del proyecto (debajo de la miniatura).", true);
  try {
    const version = CP.bloqueo ? null : await cpNuevaVersion(nombre);
    const d = await api("/api/proyectos?nombre=" + encodeURIComponent(nombre) + (version ? "&version=" + version : ""), JSON.stringify(await cpProyectoObjeto()), true);
    await cpProyectosLista(); aviso("Proyecto guardado como " + d.nombre + ": " + d.archivo);
  } catch (e) { aviso("No se pudo guardar el proyecto: " + e.message, true); }
}
async function cpProyectoAbrir(nombre, stem, ver) {
  try {
    const g = await api("/api/proyecto/" + encodeURIComponent(nombre));
    for (const c of g.capas) if (typeof c.imagenPng === "string") c.imagenPng = await (await fetch(c.imagenPng)).blob();
    await cpAplicar(g); $("cp-proyecto").value = stem || g.proyecto || nombre; CP.actual = { nombre: $("cp-proyecto").value ? cpNombreArchivo() : stem, version: ver || null }; cpMarcarCambio(); cpActualizarVersionUI(); aviso("«" + nombre + "» abierto. Con 💾 Guardar (Ctrl+S) se reemplaza este mismo archivo; con «Guardar todo» se crea una versión nueva.");
  } catch (e) { aviso("No se pudo abrir el proyecto: " + e.message, true); }
}

/* configuraciones con nombre */
const cpNombreCfg = (t) => String(t || "").trim().replace(/\s+/g, " ").slice(0, 60);
async function cpListaConfigs() {
  const caja = $("cp-cfg-lista"); let filas = [];
  try { filas = (await cpDBlistar("cfg:")).sort((x, y) => x.k.localeCompare(y.k)); } catch (e) { caja.textContent = "No se pudo leer: " + e.message; return; }
  caja.innerHTML = filas.length ? filas.map((f) => `<div class="check" style="margin:0 0 6px;justify-content:space-between;flex-wrap:wrap" data-cfg="${esc(f.k)}"><span style="flex:1;min-width:120px"><b>${esc(f.k.slice(4))}</b><br><span class="suave" style="font-size:12px">${esc(f.v.fecha || "")}</span></span>
    <button class="btn" style="padding:4px 9px" data-cargar>Cargar</button><button class="btn" style="padding:4px 9px" data-dupcfg title="Duplicar esta configuración">⧉</button><button class="btn contorno-rojo" style="padding:4px 9px" data-borrarcfg title="Borrar">🗑</button></div>`).join("")
    : '<p class="suave" style="margin:0">Aún no hay configuraciones con nombre.</p>';
  caja.querySelectorAll("[data-cfg]").forEach((fila) => {
    const k = fila.dataset.cfg;
    fila.querySelector("[data-cargar]").onclick = async () => { try { await cpAplicar(await cpDBget(k)); $("cp-config-estado").textContent = "Cargada: " + k.slice(4); aviso("Configuración «" + k.slice(4) + "» cargada."); } catch (e) { aviso(e.message, true); } };
    fila.querySelector("[data-dupcfg]").onclick = async () => {
      try {
        const g = await cpDBget(k), existentes = new Set((await cpDBlistar("cfg:")).map((x) => x.k)); let n = k + " (copia)", i = 2; while (existentes.has(n)) n = k + " (copia " + i++ + ")";
        await cpDBset(n, { ...g, fecha: new Date().toLocaleString() }); await cpListaConfigs(); aviso("Duplicada como «" + n.slice(4) + "».");
      } catch (e) { aviso(e.message, true); }
    };
    fila.querySelector("[data-borrarcfg]").onclick = async () => { if (!confirm("¿Borrar la configuración «" + k.slice(4) + "»?")) return; await cpDBdel(k); await cpListaConfigs(); };
  });
}
async function cpGuardarComo() {
  const nombre = cpNombreCfg($("cp-cfg-nombre").value); if (!nombre) return aviso("Escribe un nombre para la configuración.", true);
  try {
    const k = "cfg:" + nombre;
    if ((await cpDBget(k)) && !confirm("Ya existe «" + nombre + "». ¿Reemplazarla?")) return;
    await cpDBset(k, await cpSerializar()); $("cp-cfg-nombre").value = ""; await cpListaConfigs(); aviso("Configuración «" + nombre + "» guardada.");
  } catch (e) { aviso("No se pudo guardar: " + e.message, true); }
}

/* duplicar una capa (la copia queda justo encima y se puede mover y editar aparte) */
function cpDuplicar(c) {
  const { bmp, _ab, ...r } = c;
  const d = { ...r, id: "c" + CP.siguiente++, nombre: c.nombre + " copia", fijo: false, extra: true, lineas: c.lineas ? c.lineas.map((l) => ({ ...l })) : undefined, fx: c.fx ? { ...c.fx } : undefined };
  if (!d.sinPos) { d.x += 40; d.y += 40; }
  cpRehacer(d); cpInsertar(d); cpLista(); cpAjustes(); cpDibujar(); aviso("Capa duplicada.");
}

/* marcos propios (diseñados en Canva): se suben una vez, quedan en «Mis marcos» y se reutilizan */

/* ── galería de diseños de marco: agregar, quitar y renombrar ── */
const cpDisVacio = () => ({ ocultos: [], nombres: {}, presets: [] });
const cpGuardarDis = () => cpDBset("disenos", CP.dis);
function cpTile(o) {
  const b = document.createElement("div"); b.title = o.nombre;
  b.style.cssText = "position:relative;border:2px solid " + (o.seleccionado ? "var(--azul)" : "var(--borde)") + ";border-radius:9px;padding:3px;background:#1b2236;cursor:pointer";
  const k = cpLienzo(160, 90); o.dibujar(k); k.style.cssText = "width:100%;height:auto;display:block;border-radius:6px"; b.appendChild(k);
  const t = document.createElement("div"); t.textContent = o.nombre; t.style.cssText = "font-size:11px;color:#cbd5e1;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"; b.appendChild(t);
  const mini = (txt, tit, lado, fn) => { const x = document.createElement("button"); x.type = "button"; x.textContent = txt; x.title = tit; x.style.cssText = `position:absolute;top:2px;${lado}:2px;border:0;border-radius:50%;width:20px;height:20px;cursor:pointer;background:rgba(0,0,0,.65);color:#fff;line-height:20px;padding:0;font-size:11px`; x.onclick = (e) => { e.stopPropagation(); fn(); }; b.appendChild(x); };
  mini("✏", "Renombrar", "left", o.alRenombrar); mini("✕", "Quitar", "right", o.alQuitar);
  b.onclick = o.alElegir; return b;
}
function cpGaleriaMarcos(caja, c) {
  const nombrar = (actual) => { const n = prompt("Nombre del diseño:", actual); return n === null ? null : n.trim().slice(0, 40); };
  const aplicarNombre = (nuevo) => { if (/^Marco · /.test(c.nombre)) { c.nombre = "Marco · " + nuevo; } };
  // 1) diseños integrados (se pueden renombrar y quitar de la galería)
  const gal = caja.querySelector("[data-galeria]"), visibles = ESTILOS_MARCO.filter(([id]) => !CP.dis.ocultos.includes(id));
  if (!visibles.length) gal.innerHTML = '<span class="suave" style="grid-column:1/-1;font-size:13px">Quitaste todos los diseños. Usa «Restaurar diseños quitados».</span>';
  visibles.forEach(([id, base]) => {
    const nombre = CP.dis.nombres[id] || base;
    gal.appendChild(cpTile({
      nombre, seleccionado: c.estilo === id,
      dibujar: (k) => { const q = k.getContext("2d"); q.scale(160 / CP.W, 90 / CP.H); cpDibujarMarco(q, CP.W, CP.H, { ...c, estilo: id, grosor: Math.max(c.grosor, 30), margen: Math.max(c.margen, 24) }); },
      alElegir: () => { c.estilo = id; c.imagen = null; aplicarNombre(nombre); cpRehacer(c); cpLista(); cpAjustes(); cpDibujar(); },
      alRenombrar: async () => { const n = nombrar(nombre); if (n === null) return; if (n) CP.dis.nombres[id] = n; else delete CP.dis.nombres[id]; await cpGuardarDis(); cpAjustes(); },
      alQuitar: async () => { if (!confirm("¿Quitar el diseño «" + nombre + "» de la galería? Podrás restaurarlo.")) return; CP.dis.ocultos.push(id); await cpGuardarDis(); cpAjustes(); },
    }));
  });
  const rest = caja.querySelector("[data-restaurar-dis]");
  if (CP.dis.ocultos.length) { rest.style.display = ""; rest.textContent = "↺ Restaurar diseños quitados (" + CP.dis.ocultos.length + ")"; }
  rest.onclick = async () => { CP.dis.ocultos = []; await cpGuardarDis(); cpAjustes(); };
  // 2) mis diseños: estilo + colores + grosor guardados con nombre
  const galD = caja.querySelector("[data-galeria-presets]");
  if (!CP.dis.presets.length) galD.innerHTML = '<span class="suave" style="grid-column:1/-1;font-size:13px">Aún no guardaste diseños. Ajusta colores y grosor y pulsa «Guardar este diseño».</span>';
  CP.dis.presets.forEach((d) => {
    galD.appendChild(cpTile({
      nombre: d.nombre, seleccionado: false,
      dibujar: (k) => { const q = k.getContext("2d"); q.scale(160 / CP.W, 90 / CP.H); cpDibujarMarco(q, CP.W, CP.H, { ...d.params, grosor: Math.max(d.params.grosor, 30), margen: Math.max(d.params.margen, 24) }); },
      alElegir: () => { Object.assign(c, d.params); c.imagen = null; aplicarNombre(d.nombre); cpRehacer(c); cpLista(); cpAjustes(); cpDibujar(); },
      alRenombrar: async () => { const n = nombrar(d.nombre); if (!n) return; d.nombre = n; await cpGuardarDis(); cpAjustes(); },
      alQuitar: async () => { if (!confirm("¿Borrar tu diseño «" + d.nombre + "»?")) return; CP.dis.presets = CP.dis.presets.filter((z) => z.id !== d.id); await cpGuardarDis(); cpAjustes(); },
    }));
  });
  const gd = caja.querySelector("[data-guardar-dis]");
  if (String(c.estilo).startsWith("propio:")) { gd.disabled = true; gd.title = "Los marcos subidos ya se guardan en «Mis marcos»"; }
  gd.onclick = async () => {
    const base = ESTILOS_MARCO.find((e) => e[0] === c.estilo), n = nombrar((CP.dis.nombres[c.estilo] || (base ? base[1] : "Mi diseño")) + " personalizado"); if (!n) return;
    CP.dis.presets.push({ id: "d" + Date.now(), nombre: n, params: { estilo: c.estilo, color: c.color, color2: c.color2, grosor: c.grosor, margen: c.margen, radio: c.radio } });
    await cpGuardarDis(); cpAjustes(); aviso("Diseño «" + n + "» guardado en Mis diseños.");
  };
  // 3) marcos subidos (Canva): renombrar y quitar
  const galP = caja.querySelector("[data-galeria-propios]");
  if (!CP.bib.length) galP.innerHTML = '<span class="suave" style="grid-column:1/-1;font-size:13px">Aún no subiste marcos.</span>';
  CP.bib.forEach(async (m) => {
    const bm = await createImageBitmap(m.png);
    const tile = cpTile({
      nombre: m.nombre, seleccionado: c.estilo === "propio:" + m.id,
      dibujar: (k) => k.getContext("2d").drawImage(bm, 0, 0, 160, 90),
      alElegir: async () => { c.estilo = "propio:" + m.id; c.imagen = await cpMarcoCanvas(m.png); aplicarNombre(m.nombre); cpRehacer(c); cpLista(); cpAjustes(); cpDibujar(); },
      alRenombrar: async () => { const n = nombrar(m.nombre); if (!n) return; m.nombre = n; await cpDBset("marcos", CP.bib); cpAjustes(); },
      alQuitar: async () => { if (!confirm("¿Quitar «" + m.nombre + "» de Mis marcos? Las capas que ya lo usan no cambian.")) return; CP.bib = CP.bib.filter((z) => z.id !== m.id); await cpDBset("marcos", CP.bib); cpAjustes(); },
    });
    if (galP.isConnected) galP.appendChild(tile);
  });
}

async function cpCargarBiblioteca() {
  try { CP.bib = (await cpDBget("marcos")) || []; } catch { CP.bib = []; }
  try { CP.dis = { ...cpDisVacio(), ...((await cpDBget("disenos")) || {}) }; } catch { CP.dis = cpDisVacio(); }
  try { CP.badges = (await cpDBget("badges")) || []; } catch { CP.badges = []; }
}
async function cpMarcoCanvas(archivo) { const bm = await createImageBitmap(archivo), k = cpLienzo(CP.W, CP.H); k.getContext("2d").drawImage(bm, 0, 0, CP.W, CP.H); return k; }
async function cpSubirMarco(f) {
  if (!f || !/^image\/(png|webp)$/.test(f.type)) throw new Error("Sube un PNG (o WebP) con fondo transparente, de 1920×1080.");
  if (f.size > 12_000_000) throw new Error("El marco pesa demasiado (máximo 12 MB).");
  const k = await cpMarcoCanvas(f), nombre = (f.name || "Marco").replace(/\.[^.]+$/, "").slice(0, 40) || "Marco", id = "m" + Date.now();
  CP.bib.push({ id, nombre, png: await cpABlob(k) }); await cpDBset("marcos", CP.bib);
  const c = cpCrear("marco", "Marco · " + nombre, { estilo: "propio:" + id, imagen: k, color: "#ff2a2a", color2: "#ffd21f", grosor: 24, margen: 20, radio: 60, sinPos: true, extra: true });
  cpInsertar(c); cpLista(); cpAjustes(); cpDibujar(); aviso("Marco guardado en «Mis marcos».");
}
async function cpRestablecer() {
  if (!confirm("¿Restablecer las capas? Se quitan tus cambios y la configuración guardada.")) return;
  await cpDBdel("capas").catch(() => {});
  CP.listo = false; CP.capas = []; CP.siguiente = 1; CP.version = null; CP.versionDe = ""; $("cp-proyecto").value = ""; cpIniciar(false); $("cp-config-estado").textContent = "Capas restablecidas."; $("cp-resultado").textContent = "";
}

function cpIniciar(cargar = true) {
  if (CP.listo) return; CP.listo = true;
  cpCargarFuentes();
  const medio = (b) => ({ x: Math.round((CP.W - b.width) / 2), y: Math.round((CP.H - b.height) / 2) });
  const fondo = cpCrear("imagen", "Capa #1 · PromptTUBE (imagen generada)", { fijo: true });
  const texto = cpCrear("texto", "Capa #2 · Texto", { ...TEXTO_BASE, tam: 150, x: 60, y: 50, lineas: [{ texto: "Reset", estilo: "amarillo", color: "#ffd21f", escala: 100 }, { texto: "Error Almohadillas", estilo: "rojo", color: "#ff2a2a", escala: 100 }, { texto: "EPSON L3210", estilo: "blanco", color: "#ffffff", escala: 100 }] });
  const libre = cpCrear("imagen", "Capa #3 · PNG libre (opcional)", { visible: false, vacia: true });
  const badge = cpCrear("badge", "Capa #4 · Badge 3D", { ...BADGE_BASE, tam: 58, texto: "🔒 Desbloqueo Inmediato" });
  const marca = cpCrear("marca", "Capa Logo · Marca de agua", { tam: 44, texto: "ResetEnLinea.com", opacidad: 0.4 });
  Object.assign(badge, { x: CP.W - badge.bmp.width - 50, y: 60 });
  Object.assign(marca, { x: 40, y: CP.H - marca.bmp.height - 20 });
  CP.capas = [marca, badge, libre, texto, fondo]; // arriba → abajo
  CP.sel = texto.id;
  const L = $("cp-lienzo");
  if (CP.eventos) { cpLista(); cpAjustes(); cpDibujar(); return; }
  CP.eventos = true;
  L.addEventListener("pointerdown", (e) => {
    const c0 = CP.capas.find((k) => k.id === CP.sel), pts = cpPuntosEsquinas(c0);
    if (pts) { const p = cpPunto(e), i = pts.findIndex(([x, y]) => Math.hypot(x - p.x, y - p.y) < 28); if (i >= 0) { CP.esquina = i; L.setPointerCapture(e.pointerId); return; } }
    const c = CP.capas.find((k) => k.id === CP.sel); if (!c || c.fijo || (c.sinPos && c.tipo !== "marco") || !c.bmp || !c.visible) return;
    const p = cpPunto(e); CP.arrastre = { dx: p.x - c.x, dy: p.y - c.y }; L.setPointerCapture(e.pointerId);
  });
  L.addEventListener("pointermove", (e) => {
    if (CP.esquina != null) {
      const c = CP.capas.find((k) => k.id === CP.sel), M = c && CP_FXM.get(c); if (!M) return; const p = cpPunto(e), [sx, sy] = cpEsc(c);
      const q = M.inverse().transformPoint({ x: (p.x - c.x) / sx, y: (p.y - c.y) / sy }), w = c.imagen.width, h = c.imagen.height, lim = (v) => Math.max(-45, Math.min(45, Math.round(v * 2) / 2));
      const campos = [["tlx", "tly", 0, 0], ["trx", "try", w, 0], ["brx", "bry", w, h], ["blx", "bly", 0, h]][CP.esquina];
      c.fx = { ...c.fx, [campos[0]]: lim(((q.x - campos[2]) / w) * 100), [campos[1]]: lim(((q.y - campos[3]) / h) * 100) }; cpFxProgramar(c); return;
    }
    if (!CP.arrastre) return; const c = CP.capas.find((k) => k.id === CP.sel), p = cpPunto(e);
    const q = cpImantar(c, Math.round(p.x - CP.arrastre.dx), Math.round(p.y - CP.arrastre.dy)); c.x = q.x; c.y = q.y; cpDibujar();
  });
  L.addEventListener("pointerup", () => { CP.arrastre = null; if (CP.esquina != null) { CP.esquina = null; cpAjustes(); } });
  $("cp-agregar").onclick = () => { CP.subiendoA = "nueva"; $("cp-archivo").click(); };
  $("cp-archivo").onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try { await cpPonerImagen(f, CP.subiendoA); } catch (er) { aviso(er.message, true); }
  };
  $("cp-undo").onclick = cpDeshacer; $("cp-redo").onclick = cpRehacerPaso;
  $("cp-proyecto").addEventListener("input", cpMarcarCambio);
  document.addEventListener("keydown", (e) => {
    if (!$("p-capas").classList.contains("visible")) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) return;
    const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
    if (e.key === "Delete" && CP.sel) { e.preventDefault(); cpQuitar(CP.sel); }
    else if (ctrl && k === "z" && !e.shiftKey) { e.preventDefault(); cpDeshacer(); }
    else if (ctrl && (k === "y" || (k === "z" && e.shiftKey))) { e.preventDefault(); cpRehacerPaso(); }
  });
  $("cp-guias").onchange = (e) => { CP.guias = e.target.checked; cpDibujar(); };
  $("cp-agregar-badge").onclick = () => cpAgregarBadge();
  $("cp-agregar-texto").onclick = () => cpAgregarTexto();
  $("cp-badges-menu").onchange = (e) => { if (e.target.value) cpInsertarBadge(e.target.value); e.target.value = ""; };
  $("cp-agregar-marco").onclick = () => cpAgregarMarco("neon2");
  $("cp-subir-marco").onclick = () => { CP.subiendoMarco = true; $("cp-marco-archivo").click(); };
  $("cp-marco-archivo").onchange = async (e) => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; try { await cpSubirMarco(f); } catch (er) { aviso(er.message, true); } };
  $("cp-cfg-guardar").onclick = cpGuardarComo;
  $("cp-img-aplicar").onclick = () => cpImagenesAplicar($("cp-img-ruta").value);
  $("cp-img-defecto").onclick = () => cpImagenesAplicar("");
  $("cp-img-actualizar").onclick = cpImagenesCargar;
  $("cp-img-enfoque").innerHTML = GT.ENFOQUES_CARPETAS.map((n) => `<option>${esc(n)}</option>`).join("");
  $("cp-img-agregar").onclick = () => $("cp-img-archivos").click();
  $("cp-img-archivos").onchange = async (e) => {
    const fs = [...e.target.files]; e.target.value = ""; let n = 0;
    try { for (const f of fs) { await GT.guardarImagenEntrada($("cp-img-enfoque").value, f.name, f); n++; } } catch (er) { aviso(er.message, true); }
    if (n) aviso(n + (n === 1 ? " imagen agregada a «" : " imágenes agregadas a «") + $("cp-img-enfoque").value + "»."); await cpImagenesCargar();
  };
  $("cp-img-abrir").onclick = async () => { try { await api("/api/imagenes/abrir", {}); } catch (e) { aviso(e.message, true); } };
  $("cp-img-examinar").onclick = async () => { const b = $("cp-img-examinar"); b.disabled = true; try { const d = await api("/api/imagenes/examinar", {}); if (d.ruta) { $("cp-img-ruta").value = d.ruta; await cpImagenesAplicar(d.ruta); } } catch (e) { aviso(e.message, true); } b.disabled = false; };
  cpImagenesCargar();
  $("cp-base-aplicar").onclick = () => cpBaseAplicar($("cp-base").value);
  $("cp-base-defecto").onclick = () => cpBaseAplicar("");
  $("cp-base-examinar").onclick = async () => { const b = $("cp-base-examinar"); b.disabled = true; try { const d = await api("/api/base/examinar", {}); if (d.ruta) { $("cp-base").value = d.ruta; await cpBaseAplicar(d.ruta); } } catch (e) { aviso(e.message, true); } b.disabled = false; };
  $("cp-proy-guardar").onclick = cpProyectoGuardar;
  $("cp-guardar-todo").onclick = () => cpGuardarTodo();
  $("cp-disquete").onclick = cpDisquete;
  document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && $("cp-disquete").offsetParent) { e.preventDefault(); cpDisquete(); } });
  $("cp-candado").onclick = cpAlternarCandado;
  $("cp-proyecto").addEventListener("input", cpActualizarVersionUI);
  $("cp-abrir-carpeta").onclick = () => cpAbrirCarpeta(cpNombreArchivo());
  $("cp-base-abrir").onclick = () => cpAbrirCarpeta("");
  $("cp-guardar").onclick = cpGuardar;
  $("cp-config").onclick = cpGuardarConfig;
  $("cp-reset").onclick = cpRestablecer;
  $("cp-descargar").onclick = () => cpExportar().then((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = (cpNombreArchivo() || "miniatura_FINAL") + ".png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
  document.addEventListener("paste", (e) => {
    if (!$("p-capas").classList.contains("visible")) return;
    const it = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/")); if (!it) return;
    e.preventDefault(); cpPonerImagen(it.getAsFile(), cpFondo() ? cpFondo().id : "nueva").catch((er) => aviso(er.message, true));
  });
  cpLista(); cpAjustes(); cpDibujar(); cpHistorialReiniciar();
  if (cargar) cpCargarConfig().then(() => cpHistorialReiniciar());
  cpCargarBiblioteca().then(() => { cpAjustes(); cpMenuBadges(); });
  cpListaConfigs(); cpBaseCargar();
}
function cpPunto(e) { const r = $("cp-lienzo").getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * CP.W, y: ((e.clientY - r.top) / r.height) * CP.H }; }


/* ── centrar y ajustar al marco ── */
/** Hueco del marco: el rectángulo libre en su interior (mide desde el centro hacia los 4 lados hasta tocar el dibujo del marco). */
/** Hueco del marco ya con su posición y su tamaño actuales (el cálculo pesado se guarda hasta que el marco cambie de dibujo). */
function cpAbertura(m) {
  if (!m || !m.bmp) return { x: 0, y: 0, w: CP.W, h: CP.H, exacta: false };
  const raw = (m._ab ||= cpAberturaRaw(m)), [sx, sy] = cpEsc(m);
  return { x: m.x + raw.x * sx, y: m.y + raw.y * sy, w: raw.w * sx, h: raw.h * sy, exacta: raw.exacta };
}
function cpAberturaRaw(marco) {
  const W = CP.W, H = CP.H;
  if (!marco || !marco.bmp) return { x: 0, y: 0, w: W, h: H, exacta: false };
  const d = marco.bmp.getContext("2d").getImageData(0, 0, W, H).data, A = (x, y) => d[(y * W + x) * 4 + 3] > 140;
  let ix0 = W, iy0 = H, ix1 = -1, iy1 = -1;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (A(x, y)) { if (x < ix0) ix0 = x; if (x > ix1) ix1 = x; if (y < iy0) iy0 = y; if (y > iy1) iy1 = y; }
  if (ix1 < 0) return { x: 0, y: 0, w: W, h: H, exacta: false };
  const cx = W >> 1, cy = H >> 1, bh = Math.round(H * 0.15), bw = Math.round(W * 0.15);
  let L = ix0, R = ix1 + 1, T = iy0, B = iy1 + 1; // sin dibujo en esa dirección (p. ej. «Esquinas»): se usa el borde del marco
  for (let x = cx - 1; x >= 0; x--) { let hay = false; for (let y = cy - bh; y <= cy + bh; y += 2) if (A(x, y)) { hay = true; break; } if (hay) { L = x + 1; break; } }
  for (let x = cx + 1; x < W; x++) { let hay = false; for (let y = cy - bh; y <= cy + bh; y += 2) if (A(x, y)) { hay = true; break; } if (hay) { R = x; break; } }
  for (let y = cy - 1; y >= 0; y--) { let hay = false; for (let x = cx - bw; x <= cx + bw; x += 2) if (A(x, y)) { hay = true; break; } if (hay) { T = y + 1; break; } }
  for (let y = cy + 1; y < H; y++) { let hay = false; for (let x = cx - bw; x <= cx + bw; x += 2) if (A(x, y)) { hay = true; break; } if (hay) { B = y; break; } }
  return { x: L, y: T, w: Math.max(10, R - L), h: Math.max(10, B - T), exacta: true };
}
/** Marco de referencia: el elegido en los ajustes o, si no hay, el marco visible que está más arriba. */
function cpMarcoRef() {
  const id = CP.refMarco, elegido = id && CP.capas.find((c) => c.id === id && c.tipo === "marco");
  return elegido || CP.capas.find((c) => c.tipo === "marco" && c.visible) || null;
}
function cpCentrar(c, modo) {
  if (!c.bmp) return;
  const [w, h] = cpTam(c);
  if (modo !== "v") c.x = Math.round((CP.W - w) / 2);
  if (modo !== "h") c.y = Math.round((CP.H - h) / 2);
}
/** modo: «rellenar» (cubre el hueco), «encajar» (se ve entera dentro del hueco) o «lienzo» (cubre todo el lienzo). Siempre queda centrada. */
function cpAjustar(c, modo) {
  if (!c.bmp) return aviso("Esta capa aún no tiene imagen.", true);
  const marco = modo === "lienzo" ? null : cpMarcoRef(), ab = marco ? cpAbertura(marco) : { x: 0, y: 0, w: CP.W, h: CP.H };
  const ex = ab.w / c.bmp.width, ey = ab.h / c.bmp.height;
  c.escala = modo === "encajar" ? Math.min(ex, ey) : Math.max(ex, ey); c.recorte = modo === "rellenar" && !!marco;
  c.x = Math.round(ab.x + (ab.w - c.bmp.width * c.escala) / 2); c.y = Math.round(ab.y + (ab.h - c.bmp.height * c.escala) / 2);
  cpAjustes(); cpDibujar();
  if (modo !== "lienzo" && !marco) aviso("No hay un marco visible: se ajustó al lienzo.");
}
/** Imán: acerca la capa al centro del lienzo y a los bordes y el centro del hueco del marco (14 px). */
function cpImantar(c, x, y) {
  if (!CP.guias) return { x, y };
  const [w, h] = cpTam(c), m = cpMarcoRef(), ab = m && m.id !== c.id ? cpAbertura(m) : null;
  const objX = [CP.W / 2], objY = [CP.H / 2]; if (ab) { objX.push(ab.x + ab.w / 2, ab.x, ab.x + ab.w); objY.push(ab.y + ab.h / 2, ab.y, ab.y + ab.h); }
  const cerca = (cand, objetivos) => { let mejor = null; for (const [pos, o] of cand) for (const t of objetivos) { const dd = t - o; if (Math.abs(dd) <= 14 && (mejor === null || Math.abs(dd) < Math.abs(mejor))) mejor = dd; } return mejor; };
  const dx = cerca([[x, x], [x + w / 2, x + w / 2], [x + w, x + w]], objX), dy = cerca([[y, y], [y + h / 2, y + h / 2], [y + h, y + h]], objY);
  return { x: Math.round(x + (dx ?? 0)), y: Math.round(y + (dy ?? 0)) };
}
/** Posición de las 4 esquinas de la capa seleccionada en la miniatura (solo si tiene perspectiva y se pidió verlas). */
function cpPuntosEsquinas(c) {
  const M = c && c.fx && c.fx.conPers && c.imagen && CP_FXM.get(c); if (!M || !CP.editarEsquinas || !c.visible) return null;
  const f = { ...FX_BASE, ...c.fx }, [sx, sy] = cpEsc(c);
  return cpEsquinasFx(f, c.imagen.width, c.imagen.height).map(([x, y]) => { const p = M.transformPoint({ x, y }); return [c.x + p.x * sx, c.y + p.y * sy]; });
}
function cpDibujarEsquinas(g) {
  const pts = cpPuntosEsquinas(CP.capas.find((k) => k.id === CP.sel)); if (!pts) return;
  g.save(); g.lineWidth = 3; g.setLineDash([]); g.strokeStyle = "rgba(255,0,200,.95)"; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
  pts.forEach(([x, y], i) => { g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.fillStyle = "#ff00c8"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#fff"; g.stroke(); g.fillStyle = "#fff"; g.font = "bold 18px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(i + 1), x, y + 1); });
  g.restore();
}
function cpGuias(g) {
  cpDibujarEsquinas(g);
  if (!CP.guias) return;
  g.save(); g.lineWidth = 3; g.setLineDash([14, 10]);
  g.strokeStyle = "rgba(0,200,255,.9)"; g.beginPath(); g.moveTo(CP.W / 2, 0); g.lineTo(CP.W / 2, CP.H); g.moveTo(0, CP.H / 2); g.lineTo(CP.W, CP.H / 2); g.stroke();
  const m = cpMarcoRef(); if (m) { const ab = cpAbertura(m); g.strokeStyle = "rgba(255,0,200,.95)"; g.strokeRect(ab.x, ab.y, ab.w, ab.h); }
  const c = CP.capas.find((k) => k.id === CP.sel); if (c && c.bmp && c.visible) { const [bw, bh] = cpTam(c); g.strokeStyle = "rgba(255,200,0,.95)"; g.strokeRect(c.x, c.y, bw, bh); }
  g.restore();
}

/** Quita cualquier capa (se puede deshacer con el historial). */
function cpQuitar(id) {
  const i = CP.capas.findIndex((k) => k.id === id); if (i < 0) return;
  const [c] = CP.capas.splice(i, 1);
  if (CP.sel === id) CP.sel = CP.capas.length ? CP.capas[Math.min(i, CP.capas.length - 1)].id : null;
  cpLista(); cpAjustes(); cpDibujar(); aviso("Capa «" + c.nombre + "» quitada. Puedes deshacerlo (Ctrl+Z).");
}

/* ── historial: deshacer y rehacer (guarda el estado de las capas tras cada cambio) ── */
const CP_IMG_ID = new WeakMap(); let cpImgN = 0;
const cpImgId = (k) => (k ? (CP_IMG_ID.get(k) ?? (CP_IMG_ID.set(k, ++cpImgN), cpImgN)) : 0);
/** JSON con las claves ordenadas, para comparar estados sin que influya el orden de las propiedades. */
const cpEstable = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((q) => [q, x[q]])) : x));
function cpInstantanea() {
  const capas = CP.capas.map((c) => { const { bmp, _ab, imagen, lineas, fx, ...r } = c; return { meta: { ...r, lineas: lineas ? lineas.map((l) => ({ ...l })) : undefined, fx: fx ? { ...fx } : undefined, img: cpImgId(imagen) }, imagen: imagen || null }; });
  const proyecto = $("cp-proyecto").value;
  return { capas, sel: CP.sel, proyecto, clave: cpEstable({ capas: capas.map((x) => x.meta), proyecto }) };
}
function cpRestaurarInstantanea(sn) {
  CP.restaurando = true;
  try {
    CP.capas = sn.capas.map(({ meta, imagen }) => { const { img, ...r } = meta; const c = { ...r, lineas: r.lineas ? r.lineas.map((l) => ({ ...l })) : undefined, fx: r.fx ? { ...r.fx } : undefined, bmp: null, imagen }; if (!imagen) delete c.imagen; cpRehacer(c); return c; });
    CP.sel = CP.capas.some((c) => c.id === sn.sel) ? sn.sel : CP.capas[0] ? CP.capas[0].id : null; $("cp-proyecto").value = sn.proyecto;
    cpLista(); cpAjustes(); cpDibujar();
  } finally { CP.restaurando = false; }
}
let cpHistT = null;
function cpMarcarCambio() { if (CP.restaurando || !CP.hist) return; clearTimeout(cpHistT); cpHistT = setTimeout(cpHistorialCommit, 450); }
function cpHistorialCommit() {
  clearTimeout(cpHistT); if (!CP.hist || CP.restaurando) return;
  const sn = cpInstantanea(), top = CP.hist[CP.histI];
  if (top && top.clave === sn.clave) { top.sel = sn.sel; return; }
  CP.hist.splice(CP.histI + 1); CP.hist.push(sn); if (CP.hist.length > 80) CP.hist.shift(); CP.histI = CP.hist.length - 1; cpBotonesHistorial();
}
function cpHistorialReiniciar() { clearTimeout(cpHistT); CP.hist = [cpInstantanea()]; CP.histI = 0; cpBotonesHistorial(); }
function cpBotonesHistorial() {
  const u = $("cp-undo"), r = $("cp-redo"); if (!u || !CP.hist) return;
  u.disabled = CP.histI <= 0; r.disabled = CP.histI >= CP.hist.length - 1;
  $("cp-hist-info").textContent = CP.hist.length > 1 ? `Paso ${CP.histI + 1} de ${CP.hist.length}` : "";
}
function cpDeshacer() { cpHistorialCommit(); if (!CP.hist || CP.histI <= 0) return; CP.histI--; cpRestaurarInstantanea(CP.hist[CP.histI]); cpBotonesHistorial(); }
function cpRehacerPaso() { cpHistorialCommit(); if (!CP.hist || CP.histI >= CP.hist.length - 1) return; CP.histI++; cpRestaurarInstantanea(CP.hist[CP.histI]); cpBotonesHistorial(); }

/** La capa de PromptTUBE (fondo), si todavía está. */
const cpFondo = () => CP.capas.find((k) => k.fijo) || null;
/** La capa de PromptTUBE siempre es la última de la lista (el fondo): ninguna otra capa puede quedar debajo de ella. */
function cpFondoAbajo() {
  const i = CP.capas.findIndex((k) => k.fijo);
  if (i >= 0 && i < CP.capas.length - 1) CP.capas.push(CP.capas.splice(i, 1)[0]);
}
/** Inserta la capa justo encima de la seleccionada (o arriba de todo) y la selecciona. */
function cpInsertar(c) {
  const i = CP.capas.findIndex((k) => k.id === CP.sel);
  CP.capas.splice(i >= 0 ? i : 0, 0, c); CP.sel = c.id;
}
async function cpPonerImagen(archivo, destino) {
  if (!archivo || !archivo.type.startsWith("image/")) throw new Error("Elige una imagen PNG, JPG o WebP.");
  const img = await createImageBitmap(archivo), k = cpLienzo(img.width, img.height); k.getContext("2d").drawImage(img, 0, 0);
  if (destino === "nueva") {
    const c = cpCrear("imagen", "Capa #" + (CP.capas.length + 1) + " · " + (archivo.name || "PNG"), { imagen: k, extra: true });
    const e = Math.min(1, (CP.W * 0.5) / k.width, (CP.H * 0.5) / k.height); c.escala = e;
    c.x = Math.round((CP.W - k.width * e) / 2); c.y = Math.round((CP.H - k.height * e) / 2); cpInsertar(c);
  } else {
    const c = CP.capas.find((x) => x.id === destino); c.imagen = k; c.bmp = k; c.vacia = false; c.visible = true; CP_FXM.delete(c); if (c.fx && cpFxActivo(c.fx)) cpRehacer(c);
    if (c.fijo) { const e = Math.max(CP.W / k.width, CP.H / k.height); c.escala = e; c.x = Math.round((CP.W - k.width * e) / 2); c.y = Math.round((CP.H - k.height * e) / 2); }
    else if (c.escala === 1 && k.width > CP.W * 0.5) { c.escala = (CP.W * 0.5) / k.width; }
    CP.sel = c.id;
  }
  cpLista(); cpAjustes(); cpDibujar();
}

function cpDibujar() {
  cpMarcarCambio();
  const L = $("cp-lienzo"), g = L.getContext("2d"); g.clearRect(0, 0, CP.W, CP.H);
  for (const c of cpOrdenDibujo()) cpPintar(g, c);
  cpGuias(g);
}
function cpLista() {
  cpFondoAbajo(); cpMarcarCambio(); cpActualizarVersionUI();
  $("cp-lista").innerHTML = CP.capas.map((c, i) => `<div class="check" style="margin:0 0 6px;justify-content:space-between;${c.id === CP.sel ? "border-color:var(--azul);background:var(--azul-fondo)" : ""}" data-sel="${c.id}">
    <span style="flex:1;cursor:pointer">${c.fijo ? "🔒 " : ""}${esc(c.nombre)}${c.vacia && !c.imagen ? ' <span class="suave">(vacía)</span>' : ""}</span>
    <button class="btn" style="padding:3px 8px" data-vis="${c.id}" title="Mostrar u ocultar">${c.visible ? "👁" : "🚫"}</button>
    <button class="btn" style="padding:3px 8px" data-sube="${c.id}" ${i === 0 || c.fijo ? "disabled" : ""} title="${c.fijo ? "La capa de PromptTUBE siempre es el fondo" : "Subir en la lista"}">▲</button>
    <button class="btn" style="padding:3px 8px" data-baja="${c.id}" ${i === CP.capas.length - 1 || CP.capas[i + 1]?.fijo || c.fijo ? "disabled" : ""} title="${c.fijo ? "La capa de PromptTUBE siempre es el fondo" : "Bajar en la lista"}">▼</button>
    <button class="btn contorno-rojo" style="padding:3px 8px" data-quitar="${c.id}" title="Quitar esta capa">🗑</button></div>`).join("") || '<p class="suave" style="margin:0 0 8px">No hay capas. Agrega una o pulsa «Restablecer capas».</p>';
  $("cp-lista").querySelectorAll("[data-quitar]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); cpQuitar(b.dataset.quitar); }));
  $("cp-lista").querySelectorAll("[data-sel]").forEach((d) => (d.onclick = () => { CP.sel = d.dataset.sel; cpLista(); cpAjustes(); }));
  $("cp-lista").querySelectorAll("[data-vis]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const c = CP.capas.find((k) => k.id === b.dataset.vis); c.visible = !c.visible; cpLista(); cpDibujar(); }));
  const mover = (id, d) => { const i = CP.capas.findIndex((k) => k.id === id), j = i + d; if (j < 0 || j >= CP.capas.length || CP.capas[i].fijo || CP.capas[j].fijo) return; [CP.capas[i], CP.capas[j]] = [CP.capas[j], CP.capas[i]]; cpLista(); cpDibujar(); };
  $("cp-lista").querySelectorAll("[data-sube]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); mover(b.dataset.sube, -1); }));
  $("cp-lista").querySelectorAll("[data-baja]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); mover(b.dataset.baja, 1); }));
}
function cpAjustes() {
  const c = CP.capas.find((k) => k.id === CP.sel), caja = $("cp-ajustes");
  if (!c) { caja.innerHTML = '<p class="suave">' + (CP.capas.length ? "Elige una capa." : "No hay capas.") + "</p>"; return; }
  let h = `<h2 data-titulo>${esc(c.nombre)}</h2><label class="campo">Nombre de la capa</label><input type="text" data-nombre value="${esc(c.nombre)}" maxlength="60">`;
  if (c.tipo === "texto") h += cpHtmlTexto(c);
  if (c.tipo === "badge") h += cpHtmlBadge(c);
  if (c.tipo === "marca") h += `<label class="campo">Texto de la marca de agua (o sube tu logo PNG)</label><input type="text" data-t value="${esc(c.texto)}"><label class="campo">Tamaño</label><input type="range" min="24" max="100" value="${c.tam}" data-tam>`;
  if (c.tipo === "marco") {
    h += `<label class="campo">Diseños de marco (elige uno · ✏ renombrar · ✕ quitar)</label><div data-galeria style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px"></div>
      <div class="botones" style="margin-top:8px"><button class="btn" data-restaurar-dis style="display:none">↺ Restaurar diseños quitados</button></div>
      <label class="campo">Mis diseños (guardados por ti)</label><div data-galeria-presets style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px"></div>
      <div class="botones" style="margin-top:8px"><button class="btn" data-guardar-dis title="Guarda el estilo, los colores y el grosor de este marco como un diseño nuevo">➕ Guardar este diseño</button></div>
      <label class="campo">Mis marcos (diseñados en Canva)</label><div data-galeria-propios style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px"></div>
      <div class="botones" style="margin-top:8px"><button class="btn" data-subir-marco>📤 Subir marco PNG</button></div>
      <p class="nota">En Canva diseña un marco de 1920×1080 px, con el centro vacío, y descárgalo como PNG con fondo transparente.</p>
      <label class="campo">Tamaño y posición del marco</label>
      <label class="campo" style="margin-top:6px">Ancho: <span data-ev="ex">${Math.round(cpEsc(c)[0] * 100)}%</span></label><input type="range" min="10" max="300" value="${Math.round(cpEsc(c)[0] * 100)}" data-ex>
      <label class="campo">Alto: <span data-ev="ey">${Math.round(cpEsc(c)[1] * 100)}%</span></label><input type="range" min="10" max="300" value="${Math.round(cpEsc(c)[1] * 100)}" data-ey>
      <label class="check" style="margin-top:8px"><input type="checkbox" data-prop checked> Mantener proporción</label>
      <div class="fila2"><div><label class="campo">X</label><input type="number" data-mx value="${c.x}"></div><div><label class="campo">Y</label><input type="number" data-my value="${c.y}"></div></div>
      <div class="botones" style="margin-top:8px"><button class="btn" data-mcentrar>✛ Centrar</button><button class="btn" data-mreset>⛶ Ocupar todo el lienzo</button></div>
      <p class="nota">También puedes arrastrar el marco sobre la miniatura. La transparencia se cambia más abajo, en «Opacidad».</p>
      <div data-ctrl-marco><div class="fila2"><div><label class="campo">Color</label><input type="color" data-mc value="${c.color}" style="width:100%;height:38px;border:1px solid var(--borde);border-radius:9px;padding:2px"></div>
      <div><label class="campo">Color 2</label><input type="color" data-mc2 value="${c.color2}" style="width:100%;height:38px;border:1px solid var(--borde);border-radius:9px;padding:2px"></div></div>
      <label class="campo">Grosor</label><input type="range" min="4" max="90" value="${c.grosor}" data-mg>
      <label class="campo">Margen del borde</label><input type="range" min="0" max="140" value="${c.margen}" data-mm>
      <label class="campo">Esquinas redondeadas (estilo Redondeado)</label><input type="range" min="0" max="240" value="${c.radio}" data-mr></div>`;
  }
  if ((c.tipo === "imagen" || c.tipo === "marca") && c.imagen) h += cpHtmlFx(c);
  if (c.tipo === "imagen" || c.tipo === "marca") h += `<div class="botones"><button class="btn" data-subir>📁 ${c.tipo === "marca" ? "Subir logo PNG" : "Elegir imagen / PNG"}</button>${c.tipo === "marca" && c.imagen ? '<button class="btn" data-quitar-logo>Usar texto</button>' : ""}</div>`;
  if (!c.fijo && !c.sinPos) h += `<label class="campo">Tamaño de la capa: <span data-ev="esc">${Math.round(c.escala * 100)}%</span></label><input type="range" min="5" max="300" value="${Math.round(c.escala * 100)}" data-esc>`;
  h += `<label class="campo">Opacidad (transparencia): <span data-ev="op">${Math.round(c.opacidad * 100)}%</span></label><input type="range" min="5" max="100" value="${Math.round(c.opacidad * 100)}" data-op>`;
  if (!c.sinPos) {
    const marcos = CP.capas.filter((k) => k.tipo === "marco"), ref = cpMarcoRef();
    h += `<label class="campo">Centrar y ajustar al marco</label><div class="botones" style="margin-top:4px">
      <button class="btn" data-al="h" title="Centra en horizontal">↔ Centrar</button><button class="btn" data-al="v" title="Centra en vertical">↕ Centrar</button><button class="btn" data-al="hv" title="Centra en el lienzo">✛ Al centro</button></div>
      <div class="botones" style="margin-top:6px"><button class="btn primario" data-aj="rellenar" title="Cubre todo el hueco del marco y queda centrada">▣ Rellenar el marco</button><button class="btn" data-aj="encajar" title="Se ve entera dentro del hueco del marco">▢ Encajar en el marco</button><button class="btn" data-aj="lienzo" title="Cubre todo el lienzo 1920×1080">⛶ Al lienzo</button></div>`;
    if (marcos.length) h += `<label class="campo">Marco de referencia</label><select data-refmarco>${marcos.map((m) => `<option value="${m.id}" ${ref && ref.id === m.id ? "selected" : ""}>${esc(m.nombre)}${m.visible ? "" : " (oculto)"}</option>`).join("")}</select>`;
    else h += `<p class="nota">Agrega un marco para ajustar la imagen a su hueco.</p>`;
    if (marcos.length) h += `<label class="check" style="margin-top:8px"><input type="checkbox" data-recorte ${c.recorte ? "checked" : ""}> Recortar al hueco del marco</label>`;
  }
  if (!c.fijo && !c.sinPos) h += `<div class="fila2"><div><label class="campo">X</label><input type="number" data-x value="${c.x}"></div><div><label class="campo">Y</label><input type="number" data-y value="${c.y}"></div></div>`;
  h += `<div class="botones"><button class="btn" data-dup>⧉ Duplicar capa</button><button class="btn" data-png>⬇ PNG de esta capa</button><button class="btn contorno-rojo" data-borrar>🗑 Quitar capa</button></div>`;
  caja.innerHTML = h;
  const redib = () => { cpRehacer(c); cpDibujar(); };
  caja.querySelector("[data-dup]").onclick = () => cpDuplicar(c);
  caja.querySelectorAll("[data-al]").forEach((b) => (b.onclick = () => { cpCentrar(c, b.dataset.al); cpAjustes(); cpDibujar(); }));
  caja.querySelectorAll("[data-aj]").forEach((b) => (b.onclick = () => cpAjustar(c, b.dataset.aj)));
  const rc = caja.querySelector("[data-recorte]"); if (rc) rc.onchange = () => { c.recorte = rc.checked; cpDibujar(); };
  const rm = caja.querySelector("[data-refmarco]"); if (rm) rm.onchange = () => { CP.refMarco = rm.value; cpDibujar(); };
  if (c.tipo === "marco") {
    const propio = String(c.estilo).startsWith("propio:");
    if (propio) caja.querySelector("[data-ctrl-marco]").style.display = "none";
    caja.querySelector("[data-subir-marco]").onclick = () => { CP.subiendoMarco = true; $("cp-marco-archivo").click(); };
    cpGaleriaMarcos(caja, c);
    const ex = caja.querySelector("[data-ex]"), ey = caja.querySelector("[data-ey]"), prop = caja.querySelector("[data-prop]");
    const mostrar = () => { caja.querySelector('[data-ev="ex"]').textContent = Math.round(cpEsc(c)[0] * 100) + "%"; caja.querySelector('[data-ev="ey"]').textContent = Math.round(cpEsc(c)[1] * 100) + "%"; ex.value = Math.round(cpEsc(c)[0] * 100); ey.value = Math.round(cpEsc(c)[1] * 100); };
    ex.oninput = () => { c.escalaX = ex.value / 100; if (prop.checked) c.escalaY = c.escalaX; mostrar(); cpDibujar(); };
    ey.oninput = () => { c.escalaY = ey.value / 100; if (prop.checked) c.escalaX = c.escalaY; mostrar(); cpDibujar(); };
    const mx = caja.querySelector("[data-mx]"), my = caja.querySelector("[data-my]");
    mx.oninput = () => { c.x = +mx.value || 0; cpDibujar(); }; my.oninput = () => { c.y = +my.value || 0; cpDibujar(); };
    caja.querySelector("[data-mcentrar]").onclick = () => { cpCentrar(c, "hv"); mx.value = c.x; my.value = c.y; cpDibujar(); };
    caja.querySelector("[data-mreset]").onclick = () => { c.escala = 1; c.escalaX = 1; c.escalaY = 1; c.x = 0; c.y = 0; cpAjustes(); cpDibujar(); };
    const en = (sel, campo, num) => { const i = caja.querySelector(sel); i.oninput = () => { c[campo] = num ? +i.value : i.value; redib(); }; };
    en("[data-mc]", "color"); en("[data-mc2]", "color2"); en("[data-mg]", "grosor", true); en("[data-mm]", "margen", true); en("[data-mr]", "radio", true);
  }
  caja.querySelector("[data-nombre]").oninput = (e) => { c.nombre = e.target.value.trim() || "Capa sin nombre"; caja.querySelector("[data-titulo]").textContent = c.nombre; cpLista(); };
  caja.querySelectorAll("[data-l]").forEach((i) => (i.oninput = () => { c.lineas[+i.dataset.l].texto = i.value; redib(); }));
  caja.querySelectorAll("[data-lc]").forEach((i) => (i.oninput = () => { const l = c.lineas[+i.dataset.lc]; l.color = i.value; l.estilo = "propio"; redib(); cpAjustes(); }));
  caja.querySelectorAll("[data-le]").forEach((i) => (i.onchange = () => { c.lineas[+i.dataset.le].estilo = i.value; redib(); }));
  caja.querySelectorAll("[data-lt]").forEach((i) => (i.oninput = () => { c.lineas[+i.dataset.lt].escala = Math.min(250, Math.max(30, +i.value || 100)); redib(); }));
  caja.querySelectorAll("[data-lad]").forEach((d) => (d.ontoggle = () => { c.lineas[+d.dataset.lad].abierta = d.open; }));
  caja.querySelectorAll("[data-lo]").forEach((i) => (i[i.type === "checkbox" || i.tagName === "SELECT" ? "onchange" : "oninput"] = () => {
    const [n, campo] = i.dataset.lo.split(":"), l = c.lineas[+n]; l.o = l.o || {};
    l.o[campo] = i.type === "checkbox" ? i.checked : "num" in i.dataset ? +i.value : i.value; const v = caja.querySelector(`[data-lov="${n}:${campo}"]`); if (v) v.textContent = i.value; l.abierta = true; redib();
    const r = caja.querySelector(`[data-lo-reset="${n}"]`); if (r) r.disabled = false;
  }));
  caja.querySelectorAll("[data-lo-auto]").forEach((b) => (b.onclick = () => { const [n, campo] = b.dataset.loAuto.split(":"), l = c.lineas[+n]; if (l.o) { delete l.o[campo]; if (!Object.keys(l.o).length) delete l.o; } l.abierta = true; redib(); cpAjustes(); }));
  caja.querySelectorAll("[data-lo-reset]").forEach((b) => (b.onclick = () => { const l = c.lineas[+b.dataset.loReset]; delete l.o; l.abierta = true; redib(); cpAjustes(); }));
  caja.querySelectorAll("[data-lq]").forEach((i) => (i.onclick = () => { c.lineas.splice(+i.dataset.lq, 1); if (!c.lineas.length) c.lineas.push({ texto: "Texto", estilo: "naranja", color: "#ff9a1a", escala: 100 }); redib(); cpAjustes(); }));
  const la = caja.querySelector("[data-lagregar]"); if (la) la.onclick = () => { c.lineas.push({ texto: "Nueva línea", estilo: "cromo", color: "#ffffff", escala: 90 }); redib(); cpAjustes(); };
  caja.querySelectorAll("[data-tpl]").forEach((i) => (i.onclick = () => { const [, v] = TEXTO_PLANTILLAS[+i.dataset.tpl]; c.tam = v.tam; c.alinear = v.alinear; Object.assign(c, v.ajustes || {}); c.lineas = v.lineas.map((l) => ({ ...l })); redib(); cpAjustes(); }));
  caja.querySelectorAll("[data-t]").forEach((i) => (i.oninput = () => { c.texto = i.value; redib(); }));
  caja.querySelectorAll("[data-b]").forEach((i) => (i[i.type === "checkbox" ? "onchange" : "oninput"] = () => {
    c[i.dataset.b] = i.type === "checkbox" ? i.checked : "num" in i.dataset ? +i.value : i.value; const v = caja.querySelector(`[data-bv="${i.dataset.b}"]`); if (v) v.textContent = i.value; redib();
  }));
  caja.querySelectorAll("[data-emoji]").forEach((b) => (b.onclick = () => { c.texto = b.dataset.emoji + " " + String(c.texto).replace(/^\S+\s/u, (m) => (/\p{Extended_Pictographic}|✔/u.test(m) ? "" : m)); redib(); cpAjustes(); }));
  const mb = caja.querySelector("[data-misbadges]");
  if (mb) {
    const botones = ["[data-bd-nuevo]", "[data-bd-ren]", "[data-bd-borrar]"].map((q) => caja.querySelector(q));
    mb.onchange = () => { botones.forEach((b) => (b.disabled = !mb.value)); const g = CP.badges.find((x) => x.id === mb.value); if (!g) return; Object.assign(c, BADGE_BASE, g.params); redib(); const sel = mb.value; cpAjustes(); const n = document.querySelector("#cp-ajustes [data-misbadges]"); n.value = sel; ["[data-bd-nuevo]", "[data-bd-ren]", "[data-bd-borrar]"].forEach((q) => (document.querySelector("#cp-ajustes " + q).disabled = false)); };
    caja.querySelector("[data-bd-guardar]").onclick = () => cpGuardarEsteBadge(c);
    caja.querySelector("[data-bd-nuevo]").onclick = () => cpInsertarBadge(mb.value);
    caja.querySelector("[data-bd-ren]").onclick = async () => { const g = CP.badges.find((x) => x.id === mb.value); if (!g) return; const n = prompt("Nuevo nombre:", g.nombre); if (!n || !n.trim()) return; g.nombre = n.trim().slice(0, 40); await cpGuardarBadges(); cpMenuBadges(); cpAjustes(); };
    caja.querySelector("[data-bd-borrar]").onclick = async () => { const g = CP.badges.find((x) => x.id === mb.value); if (!g || !confirm("¿Borrar el badge guardado «" + g.nombre + "»? Las capas que ya lo usan no cambian.")) return; CP.badges = CP.badges.filter((x) => x.id !== g.id); await cpGuardarBadges(); cpMenuBadges(); cpAjustes(); };
  }
  caja.querySelectorAll("[data-bd-plantilla]").forEach((b) => (b.onclick = () => {
    const pl = { cronometro: { forma: "redondeado", fuente: "Rubik", color: "#e3160a", borde: "#2a0300", bordeGrosor: 14, icono: "⏱", iconoTam: 135, texto: "Reset en\n1 Minuto", colorTexto: "#ffffff", colorTexto2: "#ffe600", contorno: "#000000", contornoGrosor: 18, sombraTexto: 60, tam: 54, profundidad: 11, bisel: 85, brillo: 65, sombra: 75, rotacion: -3 },
      garantia: { forma: "redondeado", fuente: "Rubik", color: "#16a34a", borde: "#ffffff", icono: "🛡", iconoTam: 120, texto: "Garantía\ntotal", colorTexto: "#ffffff", colorTexto2: "#fff3a6", contorno: "#032a10", tam: 46, profundidad: 10, bisel: 70, brillo: 55, sombra: 60 } }[b.dataset.bdPlantilla];
    Object.assign(c, BADGE_BASE, pl, { conContorno: true }); redib(); cpAjustes();
  }));
  const ef = caja.querySelector("[data-efecto]");
  if (ef) ef.onchange = () => { const e = TEXTO_EFECTOS[ef.value]; c.efecto = ef.value; if (e) { Object.assign(c, { acabado: "ninguno", acabadoFuerza: 85 }, e.ajustes); c.lineas.forEach((l) => { l.estilo = e.estilo; delete l.o; }); } redib(); cpAjustes(); };
  const cc = caja.querySelector("[data-color-auto]"); if (cc) cc.onclick = () => { c.colorPrincipal = ""; redib(); cpAjustes(); };
  caja.querySelectorAll('[data-fx="verEsquinas"]').forEach((i) => { i.checked = !!CP.editarEsquinas; i.onchange = () => { CP.editarEsquinas = i.checked; cpDibujar(); }; });
  caja.querySelectorAll("[data-fx]:not([data-fx=verEsquinas])").forEach((i) => (i[i.type === "checkbox" || i.tagName === "SELECT" ? "onchange" : "oninput"] = () => {
    c.fx = { ...(c.fx || {}), [i.dataset.fx]: i.type === "checkbox" ? i.checked : "num" in i.dataset ? +i.value : i.value };
    const v = caja.querySelector(`[data-fv="${i.dataset.fx}"]`); if (v) v.textContent = i.value; cpFxProgramar(c);
    if (i.type === "checkbox" || i.tagName === "SELECT") { const q = caja.querySelector("[data-fx-quitar]"); if (q) q.disabled = !cpFxActivo(c.fx); }
  }));
  caja.querySelectorAll("[data-fx-pers]").forEach((b) => (b.onclick = () => { c.fx = { ...(c.fx || {}), conPers: true, ...FX_PERSPECTIVAS[+b.dataset.fxPers][1] }; CP.editarEsquinas = true; cpRehacer(c); cpAjustes(); cpDibujar(); }));
  const pr = caja.querySelector("[data-fx-pers-reset]"); if (pr) pr.onclick = () => { c.fx = { ...(c.fx || {}), tlx: 0, tly: 0, trx: 0, try: 0, brx: 0, bry: 0, blx: 0, bly: 0 }; cpRehacer(c); cpAjustes(); cpDibujar(); };
  caja.querySelectorAll("[data-fx-rapido]").forEach((b) => (b.onclick = () => { c.fx = { ...FX_RAPIDOS[+b.dataset.fxRapido][1] }; cpRehacer(c); cpAjustes(); cpDibujar(); }));
  const fq = caja.querySelector("[data-fx-quitar]"); if (fq) fq.onclick = () => { c.fx = undefined; cpRehacer(c); cpAjustes(); cpDibujar(); };
  const ca = caja.querySelector("[data-contorno-auto]"); if (ca) ca.onclick = () => { c.contornoColor = ""; redib(); cpAjustes(); };
  caja.querySelectorAll("[data-estilo]").forEach((b) => (b.onclick = () => { Object.assign(c, BADGE_ESTILOS[+b.dataset.estilo][1]); redib(); cpAjustes(); }));
  caja.querySelectorAll("[data-tam]").forEach((i) => (i.oninput = () => { c.tam = +i.value; redib(); }));
  const esc_ = caja.querySelector("[data-esc]"); if (esc_) esc_.oninput = () => { c.escala = esc_.value / 100; caja.querySelector('[data-ev="esc"]').textContent = esc_.value + "%"; cpDibujar(); };
  caja.querySelector("[data-op]").oninput = (e) => { c.opacidad = e.target.value / 100; caja.querySelector('[data-ev="op"]').textContent = e.target.value + "%"; cpDibujar(); };
  const px = caja.querySelector("[data-x]"), py = caja.querySelector("[data-y]");
  if (px) { px.oninput = () => { c.x = +px.value || 0; cpDibujar(); }; py.oninput = () => { c.y = +py.value || 0; cpDibujar(); }; }
  const sb = caja.querySelector("[data-subir]"); if (sb) sb.onclick = () => { CP.subiendoA = c.id; $("cp-archivo").click(); };
  const ql = caja.querySelector("[data-quitar-logo]"); if (ql) ql.onclick = () => { c.imagen = null; cpRehacer(c); cpAjustes(); cpDibujar(); };
  const bp = caja.querySelector("[data-png]"); bp.onclick = () => {
    if (!c.bmp) return aviso("Esta capa aún no tiene imagen.", true);
    c.bmp.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = (cpNombreArchivo() ? cpNombreArchivo() + "_" : "") + c.nombre.replace(/[^\w#-]+/g, "_") + ".png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, "image/png");
  };
  caja.querySelector("[data-borrar]").onclick = () => cpQuitar(c.id);
}

/* PNG FINAL a tamaño completo (1920×1080), sin cuadrícula de fondo */
function cpExportar() {
  return new Promise((ok, mal) => {
    const k = cpLienzo(CP.W, CP.H), g = k.getContext("2d");
    for (const c of cpOrdenDibujo()) cpPintar(g, c);
    k.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo crear el PNG."))), "image/png");
  });
}
async function cpGuardar() {
  try {
    if (!CP.capas.length || !CP.capas.some((k) => k.visible && k.bmp)) throw new Error("No hay nada que guardar: agrega o muestra al menos una capa.");
    if (cpFondo() && !cpFondo().imagen && !confirm("La Capa #1 (imagen de PromptTUBE) está vacía. ¿Guardar igualmente?")) return;
    const nombre = cpNombreArchivo(), version = nombre && !CP.bloqueo ? await cpNuevaVersion(nombre) : null;
    const b = await cpExportar(), d = await api("/api/capas/final?nombre=" + encodeURIComponent(nombre) + (version ? "&version=" + version : ""), b, true);
    $("cp-resultado").textContent = "Guardada: " + d.archivo + (d.reemplazo ? " (reemplazó la anterior con ese nombre)" : ""); aviso(version ? "Miniatura FINAL guardada como " + cpEtiqueta(nombre, version) + "." : "Miniatura FINAL guardada.");
    if (nombre) await cpProyectosLista();
  } catch (e) { aviso(e.message, true); }
}

