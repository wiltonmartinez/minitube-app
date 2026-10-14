/* Almacén de CapaTUBE dentro de la app unificada: reemplaza al servidor de Python.
   Misma «conversación» que el panel (api("/api/...")), pero todo ocurre en el navegador:
   - Con una carpeta elegida (Examinar) se guardan archivos reales con la API de carpetas del navegador (Chrome, Edge).
   - Sin carpeta elegida se guarda dentro del navegador (IndexedDB) y la miniatura FINAL también se descarga.
   Estructura de archivos idéntica a la de Gestor TUBE: <base>/<proyecto>/<proyecto>-NN.png, -NN.json, -NN_datos.json y capas/. */
(function () {
  "use strict";
  const ENFOQUES_CARPETAS = ["Enfoque 1 - El Negocio Detenido", "Enfoque 2 - El Pánico Profesional", "Enfoque 3 - La Solución del Experto", "Enfoque 4 - El Cliente Salvado"];
  const EXT_IMAGEN = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
  const RESERVADOS = new Set(["con", "prn", "aux", "nul", ...Array.from({ length: 9 }, (_, i) => "com" + (i + 1)), ...Array.from({ length: 9 }, (_, i) => "lpt" + (i + 1))]);
  const CARPETAS_RESERVADAS = new Set(["miniaturas_finales", "proyectos"]);
  const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const falla = (m) => { throw new Error(m); };

  /* ───────── base de datos del navegador ───────── */
  const abrirDB = () => new Promise((ok, mal) => {
    const r = indexedDB.open("gestor-tube-almacen", 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("vfs"); r.result.createObjectStore("ajustes"); };
    r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error);
  });
  let _db = null;
  const db = async () => (_db ||= await abrirDB());
  const tx = async (tienda, modo, fn) => {
    const d = await db();
    return new Promise((ok, mal) => { const t = d.transaction(tienda, modo), r = fn(t.objectStore(tienda)); t.oncomplete = () => ok(r && "result" in r ? r.result : undefined); t.onerror = () => mal(t.error); t.onabort = () => mal(t.error); });
  };
  const ajusteLeer = (k) => tx("ajustes", "readonly", (s) => s.get(k));
  const ajusteGuardar = (k, v) => tx("ajustes", "readwrite", (s) => s.put(v, k));
  const ajusteBorrar = (k) => tx("ajustes", "readwrite", (s) => s.delete(k));

  /* ───────── carpetas: la misma interfaz para archivos reales y para el almacén del navegador ───────── */
  class CarpetaReal {
    constructor(h, ruta) { this.h = h; this.ruta = ruta; this.real = true; }
    async sub(n, crear = true) { try { return new CarpetaReal(await this.h.getDirectoryHandle(n, { create: crear }), this.ruta + "/" + n); } catch (e) { if (!crear && e.name === "NotFoundError") return null; throw e; } }
    async leer(n) { try { return await (await this.h.getFileHandle(n)).getFile(); } catch (e) { if (e.name === "NotFoundError") return null; throw e; } }
    async escribir(n, datos) { const w = await (await this.h.getFileHandle(n, { create: true })).createWritable(); await w.write(datos); await w.close(); }
    async borrar(n) { try { await this.h.removeEntry(n); return true; } catch (e) { if (e.name === "NotFoundError") return false; throw e; } }
    async lista() { const s = []; for await (const [nombre, h] of this.h.entries()) { const f = h.kind === "file" ? await h.getFile() : null; s.push({ nombre, dir: h.kind === "directory", bytes: f ? f.size : 0, fecha: f ? f.lastModified : 0 }); } return s; }
  }
  class CarpetaVirtual {
    constructor(prefijo) { this.p = prefijo; this.real = false; this.ruta = "(navegador)/" + prefijo.replace(/\/$/, ""); }
    clave(n) { return this.p + n; }
    async sub(n, crear = true) {
      const c = new CarpetaVirtual(this.p + n + "/");
      if (!crear && !(await c.lista()).length) return null;
      return c;
    }
    async leer(n) { const v = await tx("vfs", "readonly", (s) => s.get(this.clave(n))); return v ? new File([v.datos], n, { lastModified: v.fecha }) : null; }
    async escribir(n, datos) { const blob = datos instanceof Blob ? datos : new Blob([datos]); await tx("vfs", "readwrite", (s) => s.put({ datos: blob, fecha: Date.now() }, this.clave(n))); }
    async borrar(n) { const antes = await this.leer(n); if (!antes) return false; await tx("vfs", "readwrite", (s) => s.delete(this.clave(n))); return true; }
    async lista() {
      const d = await db(), salida = new Map();
      await new Promise((ok, mal) => {
        const r = d.transaction("vfs", "readonly").objectStore("vfs").openCursor(IDBKeyRange.bound(this.p, this.p + "￿"));
        r.onsuccess = () => { const c = r.result; if (!c) return ok(); const resto = String(c.key).slice(this.p.length), i = resto.indexOf("/"); if (i < 0) salida.set(resto, { nombre: resto, dir: false, bytes: c.value.datos.size, fecha: c.value.fecha }); else if (!salida.has(resto.slice(0, i))) salida.set(resto.slice(0, i), { nombre: resto.slice(0, i), dir: true, bytes: 0, fecha: 0 }); c.continue(); };
        r.onerror = () => mal(r.error);
      });
      return [...salida.values()];
    }
  }

  /* ───────── carpetas elegidas por el usuario (base = salida, entrada = imágenes de fondo) ───────── */
  const soportaCarpetas = () => typeof window.showDirectoryPicker === "function";
  const cache = { base: undefined, entrada: undefined };
  async function permiso(h, pedir) {
    const o = { mode: "readwrite" };
    if ((await h.queryPermission(o)) === "granted") return true;
    return pedir ? (await h.requestPermission(o)) === "granted" : false;
  }
  /** Carpeta elegida (con permiso) o null si no hay o falta el permiso (hay que pulsar «Aplicar» para reconectarla). */
  async function carpetaElegida(que) {
    const h = await ajusteLeer("carpeta_" + que);
    if (!h) return { h: null, ok: false };
    try { return { h, ok: await permiso(h, false) }; } catch { return { h, ok: false }; }
  }
  async function raiz(que) {
    const e = await carpetaElegida(que);
    if (e.h && e.ok) return new CarpetaReal(e.h, e.h.name);
    if (e.h && !e.ok) falla("Hay que volver a dar permiso a la carpeta «" + e.h.name + "»: pulsa «✔ Aplicar» en su tarjeta.");
    return que === "base" ? new CarpetaVirtual("base/") : new CarpetaVirtual("entrada/");
  }
  async function elegirCarpeta(que, titulo) {
    if (!soportaCarpetas()) falla("Este navegador no puede elegir carpetas. Usa Chrome o Edge: mientras tanto se guarda dentro del navegador.");
    let h;
    try { h = await window.showDirectoryPicker({ id: "gt-" + que, mode: "readwrite", startIn: "documents" }); } catch (e) { if (e.name === "AbortError") return ""; throw e; }
    await ajusteGuardar("carpeta_" + que, h);
    return h.name;
  }

  /* ───────── utilidades (mismas reglas que el servidor de Python) ───────── */
  function nombreArchivo(nombre) {
    let n = String(nombre ?? "").normalize("NFC").trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, "_").replace(/^[._]+|[._]+$/g, "").slice(0, 80);
    return RESERVADOS.has(n.toLowerCase()) ? n + "_" : n;
  }
  const etiqueta = (nombre, v) => nombreArchivo(nombre) + "-" + String(v).padStart(2, "0");
  const validaVersion = (v) => { if (!Number.isInteger(v) || v < 1 || v > 9999) falla("La versión no es válida."); return v; };
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fechaTexto = (ms) => { const d = new Date(ms), p = (x) => String(x).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()); };
  const sello = () => { const d = new Date(), p = (x) => String(x).padStart(2, "0"); return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "_" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()); };

  async function dirProyecto(nombre, crear = true) {
    const n = nombreArchivo(nombre);
    if (!n) falla("Escribe un nombre para el proyecto.");
    if (CARPETAS_RESERVADAS.has(n.toLowerCase())) falla("«" + n + "» es un nombre reservado: usa otro nombre de proyecto.");
    return (await raiz("base")).sub(n, crear);
  }
  async function versiones(nombre) {
    const n = nombreArchivo(nombre);
    if (!n || CARPETAS_RESERVADAS.has(n.toLowerCase())) return [];
    const d = await (await raiz("base")).sub(n, false);
    if (!d) return [];
    const re = new RegExp("^" + esc(n) + "-(\\d+)(?:_datos)?\\.(?:png|json)$"), s = new Set();
    for (const f of await d.lista()) { const m = !f.dir && re.exec(f.nombre); if (m) s.add(+m[1]); }
    return [...s].sort((a, b) => a - b);
  }
  const siguienteVersion = async (n) => { const v = await versiones(n); return v.length ? v[v.length - 1] + 1 : 1; };
  async function carpetaGuardado(nombre, version) {
    const d = await dirProyecto(nombre);
    return [d, version != null ? etiqueta(nombre, validaVersion(version)) : nombreArchivo(nombre)];
  }
  async function leerBytes(blob) { return new Uint8Array(await blob.arrayBuffer()); }
  async function datosPng(blob) {
    const b = await leerBytes(blob);
    if (b.length < 33 || FIRMA_PNG.some((x, i) => b[i] !== x) || String.fromCharCode(...b.slice(12, 16)) !== "IHDR") falla("El archivo no es un PNG válido.");
    const v = new DataView(b.buffer);
    return { ancho: v.getUint32(16), alto: v.getUint32(20) };
  }
  async function pngDeDatos(url) {
    if (typeof url !== "string" || !url.startsWith("data:image/png;base64,")) falla("Una imagen del proyecto no es válida.");
    const bin = atob(url.slice(22)), b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    if (FIRMA_PNG.some((x, i) => b[i] !== x)) falla("Una imagen del proyecto no es un PNG válido.");
    return new Blob([b], { type: "image/png" });
  }
  const descargar = (blob, nombre) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };

  /* ───────── operaciones (las mismas del servidor de Python) ───────── */
  async function guardarFinal(blob, nombre, version) {
    const { ancho, alto } = await datosPng(blob);
    if (!(ancho >= 320 && ancho <= 4000 && alto >= 180 && alto <= 4000)) falla("El tamaño de la miniatura no es válido.");
    const r = await raiz("base"), propio = nombreArchivo(nombre);
    let carpeta, archivo;
    if (propio) { const [d, b] = await carpetaGuardado(propio, version); carpeta = d; archivo = b + ".png"; }
    else { carpeta = await r.sub("miniaturas_finales"); archivo = "miniatura_FINAL_" + sello() + ".png"; }
    const reemplazo = !!(await carpeta.leer(archivo));
    await carpeta.escribir(archivo, blob);
    if (!r.real) descargar(blob, archivo); // sin carpeta elegida: además se descarga para no perderla
    return { ok: true, archivo: carpeta.ruta + "/" + archivo, ancho, alto, reemplazo };
  }
  async function guardarProyecto(nombre, texto, version) {
    let c; try { c = JSON.parse(texto); } catch { falla("El proyecto no es válido."); }
    if (!c || typeof c !== "object" || !Array.isArray(c.capas)) falla("El proyecto no es válido.");
    const [carpeta, et] = await carpetaGuardado(nombre, version), archivo = version != null ? et + ".json" : "proyecto.json";
    const reemplazo = !!(await carpeta.leer(archivo));
    await carpeta.escribir(archivo, texto);
    return { ok: true, nombre: et, archivo: carpeta.ruta + "/" + archivo, carpeta: carpeta.ruta, reemplazo, bytes: new Blob([texto]).size };
  }
  async function guardarTodo(nombre, texto, version, sinVersion) {
    let datos; try { datos = JSON.parse(texto); } catch { falla("Los datos del proyecto no son válidos."); }
    if (!datos || typeof datos.proyecto !== "object" || !datos.proyecto || (datos.capas && !Array.isArray(datos.capas))) falla("Los datos del proyecto no son válidos.");
    await dirProyecto(nombre);
    const nueva = version == null && !sinVersion;
    if (nueva) version = await siguienteVersion(nombre);
    const [carpeta, et] = await carpetaGuardado(nombre, version);
    const final = await guardarFinal(await pngDeDatos(datos.final), nombre, version);
    await guardarProyecto(nombre, JSON.stringify(datos.proyecto), version);
    const dcapas = await carpeta.sub("capas");
    const viejas = (await dcapas.lista()).filter((f) => !f.dir && (version == null ? /^\d\d_.*\.png$/.test(f.nombre) : f.nombre.startsWith(et + "_") && f.nombre.endsWith(".png")));
    for (const f of viejas) await dcapas.borrar(f.nombre);
    const escritas = [];
    for (const [i, c] of (datos.capas || []).entries()) {
      if (!c || typeof c !== "object") continue;
      let png; try { png = await pngDeDatos(c.png); } catch { continue; }
      const archivo = (version == null ? "" : et + "_") + String(i + 1).padStart(2, "0") + "_" + (nombreArchivo(String(c.nombre || "")) || "capa") + ".png";
      await dcapas.escribir(archivo, png); escritas.push(archivo);
    }
    const resumen = datos.datos && typeof datos.datos === "object" ? datos.datos : null;
    if (resumen) await carpeta.escribir(version == null ? "datos.json" : et + "_datos.json", JSON.stringify(resumen, null, 1));
    return { ok: true, carpeta: carpeta.ruta, version: version ?? null, etiqueta: et, nueva, final: final.archivo, capas: escritas, datos: !!resumen };
  }
  async function listarProyectos() {
    const base = await raiz("base"), filas = [];
    const fila = (nombre, f, proyecto, version) => ({ nombre, proyecto, version, bytes: f.bytes, fecha: fechaTexto(f.fecha) });
    for (const c of await base.lista()) {
      if (!c.dir || CARPETAS_RESERVADAS.has(c.nombre.toLowerCase())) continue;
      const d = await base.sub(c.nombre, false); if (!d) continue;
      const re = new RegExp("^" + esc(c.nombre) + "-(\\d+)\\.json$");
      for (const f of await d.lista()) {
        if (f.dir) continue;
        if (f.nombre === "proyecto.json") filas.push(fila(c.nombre, f, c.nombre, null));
        const m = re.exec(f.nombre); if (m) filas.push(fila(etiqueta(c.nombre, +m[1]), f, c.nombre, +m[1]));
      }
    }
    return filas.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  }
  async function archivoProyecto(nombre) {
    const archivo = nombreArchivo(nombre), m = /^(.+)-(\d+)$/.exec(archivo), base = await raiz("base");
    const intentos = [];
    if (m && !CARPETAS_RESERVADAS.has(m[1].toLowerCase())) intentos.push([m[1], `${m[1]}-${String(+m[2]).padStart(2, "0")}.json`]);
    if (archivo && !CARPETAS_RESERVADAS.has(archivo.toLowerCase())) intentos.push([archivo, "proyecto.json"]);
    for (const [c, f] of intentos) { const d = await base.sub(c, false); const a = d && (await d.leer(f)); if (a) return { d, f, archivo: a }; }
    falla("No encuentro ese proyecto.");
  }

  /* ───────── imágenes de entrada (fondos de PrompTUBE) por enfoque ───────── */
  async function infoBase() {
    const e = await carpetaElegida("base");
    const nombre = e.h ? e.h.name : "Dentro del navegador";
    return { base: e.h && !e.ok ? e.h.name + " (falta permiso: pulsa Aplicar)" : nombre, finales: nombre + "/miniaturas_finales", proyectos: nombre, por_defecto: "Dentro del navegador", es_por_defecto: !e.h, real: !!e.h, soporta: soportaCarpetas() };
  }
  async function infoEntrada() {
    const e = await carpetaElegida("entrada");
    return { ruta: e.h ? e.h.name + (e.ok ? "" : " (falta permiso: pulsa Aplicar)") : "Dentro del navegador", es_por_defecto: !e.h, por_defecto: "Dentro del navegador", enfoques: ENFOQUES_CARPETAS, real: !!e.h, soporta: soportaCarpetas() };
  }
  async function listarImagenes() {
    const base = await raiz("entrada");
    for (const n of ENFOQUES_CARPETAS) await base.sub(n);
    const de = async (carpeta) => (await carpeta.lista()).filter((f) => !f.dir && EXT_IMAGEN[(f.nombre.split(".").pop() || "").toLowerCase()]).sort((a, b) => b.fecha - a.fecha).slice(0, 400).map((f) => ({ archivo: f.nombre, bytes: f.bytes, fecha: fechaTexto(f.fecha).slice(0, 16) }));
    const subs = (await base.lista()).filter((f) => f.dir && !f.nombre.startsWith(".")).sort((a, b) => (ENFOQUES_CARPETAS.includes(a.nombre) ? 0 : 1) - (ENFOQUES_CARPETAS.includes(b.nombre) ? 0 : 1) || a.nombre.localeCompare(b.nombre));
    const grupos = [];
    for (const s of subs) grupos.push({ carpeta: s.nombre, imagenes: await de(await base.sub(s.nombre)) });
    const sueltas = await de(base);
    if (sueltas.length) grupos.push({ carpeta: "", imagenes: sueltas });
    return grupos;
  }
  async function imagenBlob(carpeta, archivo) {
    if (/[\\/]/.test(carpeta + archivo) || carpeta === ".." || archivo.startsWith(".")) falla("No encuentro esa imagen.");
    const base = await raiz("entrada"), d = carpeta ? await base.sub(carpeta, false) : base, f = d && (await d.leer(archivo));
    if (!f) falla("No encuentro esa imagen.");
    return f.slice(0, f.size, EXT_IMAGEN[(archivo.split(".").pop() || "").toLowerCase()] || "application/octet-stream");
  }
  /** Sube una imagen a la carpeta de un enfoque (para tener las imágenes de PrompTUBE ordenadas desde la app). */
  async function guardarImagenEntrada(carpeta, archivo, blob) {
    const base = await raiz("entrada"), d = carpeta ? await base.sub(carpeta) : base;
    const limpio = nombreArchivo(archivo.replace(/\.[^.]+$/, "")) || "imagen", ext = (archivo.split(".").pop() || "png").toLowerCase();
    if (!EXT_IMAGEN[ext]) falla("Elige una imagen PNG, JPG o WebP.");
    let nombre = limpio + "." + ext, i = 2; while (await d.leer(nombre)) nombre = limpio + "-" + i++ + "." + ext;
    await d.escribir(nombre, blob); return nombre;
  }

  /* ───────── el «servidor» en el navegador: misma interfaz que el de Python ───────── */
  const lee = async (c) => (c instanceof Blob ? c : typeof c === "string" ? new Blob([c]) : new Blob([JSON.stringify(c ?? {})]));
  async function api(ruta, cuerpo, crudo) {
    const u = new URL(ruta, "http://x"), p = u.pathname, q = u.searchParams, nombre = q.get("nombre") || "", ver = /^\d+$/.test(q.get("version") || "") ? +q.get("version") : null;
    const post = cuerpo !== undefined, objeto = post && !crudo ? cuerpo : {};
    if (p === "/api/base") {
      if (!post) return infoBase();
      const ruta2 = String(objeto.ruta || "").trim();
      if (!ruta2) { await ajusteBorrar("carpeta_base"); return { ok: true, ...(await infoBase()) }; }
      const e = await carpetaElegida("base");
      if (e.h && e.h.name === ruta2.replace(/ \(falta permiso.*$/, "")) { if (!(await permiso(e.h, true))) falla("No se dio permiso a la carpeta."); return { ok: true, ...(await infoBase()) }; }
      falla("Usa «Examinar…» para elegir la carpeta: el navegador no permite escribir la ruta a mano.");
    }
    if (p === "/api/base/examinar") return { ruta: await elegirCarpeta("base") };
    if (p === "/api/imagenes") return { ...(await infoEntrada()), grupos: await listarImagenes() };
    if (p === "/api/imagenes/base") {
      const ruta2 = String(objeto.ruta || "").trim();
      if (!ruta2) { await ajusteBorrar("carpeta_entrada"); return { ok: true, ...(await infoEntrada()) }; }
      const e = await carpetaElegida("entrada");
      if (e.h && e.h.name === ruta2.replace(/ \(falta permiso.*$/, "")) { if (!(await permiso(e.h, true))) falla("No se dio permiso a la carpeta."); for (const n of ENFOQUES_CARPETAS) await (await raiz("entrada")).sub(n); return { ok: true, ...(await infoEntrada()) }; }
      falla("Usa «Examinar…» para elegir la carpeta.");
    }
    if (p === "/api/imagenes/examinar") { const n = await elegirCarpeta("entrada"); if (n) for (const f of ENFOQUES_CARPETAS) await (await raiz("entrada")).sub(f); return { ruta: n }; }
    if (p === "/api/imagenes/abrir" || p === "/api/abrir_carpeta") {
      const b = p === "/api/abrir_carpeta" ? await infoBase() : await infoEntrada();
      falla("El navegador no puede abrir el Explorador. La carpeta es «" + (b.base || b.ruta) + "»" + (b.real ? ": ábrela desde el Explorador de archivos." : ": todavía es la del navegador, elige una carpeta con «Examinar…»."));
    }
    if (p === "/api/proyecto_version") return { versiones: await versiones(nombre), siguiente: await siguienteVersion(nombre) };
    if (p === "/api/proyectos" && !post) return listarProyectos();
    if (p === "/api/proyectos" && post) return guardarProyecto(nombre, await (await lee(cuerpo)).text(), ver);
    if (p === "/api/proyectos/borrar") { const a = await archivoProyecto(String(objeto.nombre || "")); await a.d.borrar(a.f); return { ok: true }; }
    if (p.startsWith("/api/proyecto/") && !post) return JSON.parse(await (await archivoProyecto(decodeURIComponent(p.slice(14)))).archivo.text());
    if (p === "/api/proyecto_completo" && post) return guardarTodo(nombre, await (await lee(cuerpo)).text(), ver, q.has("sinversion"));
    if (p === "/api/capas/final" && post) return guardarFinal(await lee(cuerpo), nombre, ver);
    falla("Esta función todavía no está en la app unificada (" + p + ").");
  }

  /** Imagen que mandó PrompTUBE (la deja en «ajustes/envio»): se recoge una sola vez. */
  async function tomarEnvio() {
    const e = await ajusteLeer("envio");
    if (!e || !(e.blob instanceof Blob)) return null;
    await ajusteBorrar("envio");
    return e;
  }

  window.GT = { api, imagenBlob, guardarImagenEntrada, tomarEnvio, soportaCarpetas, nombreArchivo, ENFOQUES_CARPETAS };
})();
