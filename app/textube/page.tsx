"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extraerDatos, extraerVideoId, type DatosVideo } from "@/lib/textube/datos-video";
import { PLANTILLAS_DEFECTO } from "@/lib/textube/plantillas-defecto";
import {
  COSTO_CUOTA, ErrorTextos, LIMITE_DESCRIPCION, LIMITE_ETIQUETAS, MODELO_EJEMPLO, PLANTILLA_ERROR_DEFECTO, PLANTILLA_ERRORES, PLANTILLA_FIJA,
  datosManual, generarTextos, largo, listaPlantillas, plantillaElegida, validarPlantilla, vistaPlantilla, type Textos, type TextosPlantillas,
} from "@/lib/textube/plantillas";

const CLAVE_PLANTILLAS = "textube:plantillas";
const CLAVE_ANTERIORES = "textube:anteriores";
const claveRespaldo = (id: string) => `textube:respaldo:${id}`;
const PLANTILLAS = listaPlantillas();
const MARCAS = [["Epson", "Epson"], ["Canon", "Canon"], ["Epson-SC", "Epson SureColor"]];
const ERRORES_COMUNES = ["Almohadillas", "E-11", "5B00", "1700", "P07", "E08", "0014BD", "00000008"];

type Snip = { title?: string; description?: string; tags?: string[]; [k: string]: unknown };
type Previa = { textos: Textos | null; datos: DatosVideo | null; tituloActual?: string; motivo?: string };

const leerLS = <T,>(k: string, defecto: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : defecto;
  } catch {
    return defecto;
  }
};
const guardarLS = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    toast.error("El navegador no pudo guardar los datos (¿almacenamiento lleno o bloqueado?).");
  }
};

async function llamar<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const r = await fetch(ruta, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const d = await r.json().catch(() => ({}));
  // 401 con este mensaje = la sesión venció (un 401 de YouTube trae otro mensaje y se muestra tal cual)
  if (r.status === 401 && d.error === "Necesitas iniciar sesión.") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- recarga completa para que el servidor revise la sesión
    window.location.href = "/acceso?volver=/textube";
    throw new Error("Necesitas iniciar sesión.");
  }
  if (!r.ok) throw new Error(d.error || "Error.");
  return d as T;
}

const campo = "w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function TexTubePage() {
  const [pestana, setPestana] = useState<"video" | "plantillas">("video");
  const [editadas, setEditadas] = useState<TextosPlantillas>({});
  useEffect(() => {
    const t = setTimeout(() => setEditadas(leerLS<TextosPlantillas>(CLAVE_PLANTILLAS, {})), 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">✍️ TexTUBE</h1>
          <p className="mt-1 text-muted-foreground">Títulos, descripción y etiquetas con tus plantillas. Antes de cambiar nada se guarda un respaldo para poder deshacer.</p>
        </div>
      </header>
      <div className="flex gap-2">
        {([["video", "✨ Generar y aplicar"], ["plantillas", "📄 Plantillas"]] as const).map(([id, nombre]) => (
          <Button key={id} variant={pestana === id ? "default" : "outline"} onClick={() => setPestana(id)}>
            {nombre}
          </Button>
        ))}
      </div>
      {pestana === "video" ? <Generar editadas={editadas} /> : <Plantillas editadas={editadas} onCambio={setEditadas} />}
    </main>
  );
}

/* ───────────────────────── 1 · generar y aplicar ───────────────────────── */
function Generar({ editadas }: { editadas: TextosPlantillas }) {
  const [plantilla, setPlantilla] = useState("auto");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [error, setError] = useState("");
  const [video, setVideo] = useState("");
  const [msg, setMsg] = useState("");
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [tituloN, setTituloN] = useState(1);
  const [que, setQue] = useState({ titulo: true, descripcion: true, etiquetas: true });
  const [ocupado, setOcupado] = useState(false);
  const [respaldo, setRespaldo] = useState<Snip | null>(null);
  const [sinPermiso, setSinPermiso] = useState(false);

  const n = plantillaElegida(plantilla);
  const fijos = n ? PLANTILLA_FIJA[n] : undefined;
  const opcionesError = n ? Object.keys(PLANTILLA_ERRORES[n] ?? {}) : [];
  const idVideo = useMemo(() => { try { return video.trim() ? extraerVideoId(video) : ""; } catch { return ""; } }, [video]);

  // al cambiar la plantilla: error marcado de entrada y marca fija
  useEffect(() => {
    const t = setTimeout(() => {
      if (fijos?.marca) setMarca(fijos.marca);
      if (n && opcionesError.length) setError((e) => (opcionesError.includes(e) ? e : PLANTILLA_ERROR_DEFECTO[n] ?? opcionesError[0]));
      if (fijos?.error) setError(fijos.error);
      setPrevia(null);
    }, 0);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantilla]);

  // al volver de renovar el permiso en Google
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = setTimeout(() => {
      if (q.get("autorizado")) toast.success("🔑 Permiso de YouTube renovado. Ya puedes leer y aplicar textos.");
      if (q.get("autorizacion")) { setMsg(q.get("autorizacion")!); setSinPermiso(true); }
      if (q.has("autorizado") || q.has("autorizacion")) window.history.replaceState(null, "", "/textube");
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // el respaldo guardado de este video (para el botón «Deshacer»)
  useEffect(() => {
    const t = setTimeout(() => setRespaldo(idVideo ? leerLS<Snip | null>(claveRespaldo(idVideo), null) : null), 0);
    return () => clearTimeout(t);
  }, [idVideo, previa]);

  function generar(datos: DatosVideo | null, tituloActual?: string, tn?: number | null) {
    if (!datos) {
      setPrevia({ textos: null, datos: null, tituloActual, motivo: "En el título no se reconoce ningún modelo de impresora." });
      return;
    }
    const t = generarTextos(datos, { tituloN: tn ?? null, semilla: idVideo || datos.modelo, plantilla: n, videoId: idVideo || null, editadas });
    if (!t) {
      setPrevia({ textos: null, datos, tituloActual, motivo: `${datos.marca} ${datos.modelo} · ${datos.error || "sin error"} no encaja en ninguna plantilla: elige una a mano si quieres usarla igual.` });
      return;
    }
    setTituloN(t.titulo_n);
    setPrevia({ textos: t, datos, tituloActual });
  }

  async function accion(fn: () => Promise<void>) {
    setMsg("");
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      setPrevia(null);
      const m = e instanceof Error ? e.message : "Error.";
      setMsg(m);
      setSinPermiso(/autorizaci[oó]n de YouTube/i.test(m));
    }
    setOcupado(false);
  }

  const alGenerar = () => accion(async () => {
    const datos = datosManual({ plantilla, marca, modelo, error });
    if (!datos) throw new ErrorTextos(fijos ? "Escribe el modelo." : "Escribe la marca, el modelo y el error.");
    generar(datos, previa?.tituloActual);
  });

  const alLeer = () => accion(async () => {
    const id = extraerVideoId(video);
    const r = await llamar<{ snippet: Snip }>("/api/youtube/video", { video: id });
    const titulo = r.snippet.title ?? "";
    const datos = extraerDatos(titulo);
    if (datos) { setMarca(datos.marca); setModelo(datos.modelo_texto || datos.modelo); setError(datos.error); }
    setPlantilla("auto");
    await new Promise((ok) => setTimeout(ok, 0));
    if (!datos) return setPrevia({ textos: null, datos: null, tituloActual: titulo, motivo: "En el título no se reconoce ningún modelo de impresora." });
    const t = generarTextos(datos, { semilla: id, videoId: id, editadas });
    if (!t) return setPrevia({ textos: null, datos, tituloActual: titulo, motivo: `${datos.marca} ${datos.modelo} · ${datos.error} no encaja en ninguna plantilla: elige una a mano si quieres usarla igual.` });
    setTituloN(t.titulo_n);
    setPrevia({ textos: t, datos, tituloActual: titulo });
  });

  const alAplicar = () => accion(async () => {
    if (!idVideo) throw new Error("Para aplicar escribe la URL o el ID del video (arriba).");
    if (!previa?.textos || !previa.datos) throw new Error("Primero genera los textos.");
    const t = generarTextos(previa.datos, { tituloN, semilla: idVideo, plantilla: n ?? previa.textos.plantilla, videoId: idVideo, editadas })!;
    if (!confirm(`¿Cambiar este video con la plantilla ${t.plantilla}? Se guarda un respaldo del título, la descripción y las etiquetas actuales para poder deshacer.`)) return;
    const r = await llamar<{ original: Snip; cuota: number }>("/api/youtube/aplicar", {
      video: idVideo,
      ...(que.titulo ? { titulo: t.titulo } : {}), ...(que.descripcion ? { descripcion: t.descripcion } : {}), ...(que.etiquetas ? { etiquetas: t.etiquetas } : {}),
    });
    // el PRIMER respaldo es el original de verdad: no se pisa con cambios posteriores nuestros
    if (!localStorage.getItem(claveRespaldo(idVideo))) guardarLS(claveRespaldo(idVideo), r.original);
    setRespaldo(leerLS<Snip | null>(claveRespaldo(idVideo), null));
    setPrevia((p) => (p ? { ...p, tituloActual: t.titulo } : p));
    toast.success(`✅ Textos aplicados al video (cuota de YouTube usada: ${r.cuota ?? COSTO_CUOTA} unidades).`);
  });

  const alDeshacer = () => accion(async () => {
    if (!idVideo) throw new Error("Escribe la URL o el ID del video.");
    const original = leerLS<Snip | null>(claveRespaldo(idVideo), null);
    if (!original) throw new Error("No hay respaldo de este video en este navegador: TexTUBE nunca cambió sus textos aquí.");
    if (!confirm("¿Volver a los textos originales de este video?")) return;
    const r = await llamar<{ titulo: string }>("/api/youtube/deshacer", { video: idVideo, snippet: original });
    toast.success(`↩️ Textos originales restaurados: ${r.titulo}`);
    setPrevia((p) => (p ? { ...p, tituloActual: r.titulo } : p));
  });

  const copiar = async (texto: string, que2: string) => {
    try { await navigator.clipboard.writeText(texto); toast.success(`${que2} copiado.`); } catch { toast.error("No pude copiar: selecciona el texto a mano."); }
  };
  const t = previa?.textos;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1 · Datos del equipo</CardTitle>
          <CardDescription>Elige la plantilla y escribe la marca, el modelo y el error. O pega un video y pulsa «Leer del video» para llenarlos solos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="plantilla">Plantilla</Label>
              <select id="plantilla" className={campo} value={plantilla} onChange={(e) => setPlantilla(e.target.value)}>
                <option value="auto">Automática (según los datos)</option>
                {PLANTILLAS.map((p) => <option key={p.n} value={p.n}>Plantilla {p.n} · {p.nombre}</option>)}
              </select>
            </div>
            {!fijos?.marca && (
              <div className="space-y-1.5">
                <Label htmlFor="marca">Marca</Label>
                <select id="marca" className={campo} value={marca} onChange={(e) => { setMarca(e.target.value); setPrevia(null); }}>
                  <option value="">Elige…</option>
                  {MARCAS.map(([v, nombre]) => <option key={v} value={v}>{nombre}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="modelo">Modelo</Label>
              <Input id="modelo" value={modelo} maxLength={12} placeholder="L4150, G6010, F570…" autoComplete="off" onChange={(e) => { setModelo(e.target.value); setPrevia(null); }} />
            </div>
            {!fijos?.error && (
              <div className="space-y-1.5">
                <Label htmlFor="error">Error</Label>
                {opcionesError.length ? (
                  <select id="error" className={campo} value={error} onChange={(e) => { setError(e.target.value); setPrevia(null); }}>
                    {opcionesError.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <>
                    <Input id="error" list="errores" value={error} maxLength={30} placeholder="Almohadillas, E-11, 5B00, 0014BD…" autoComplete="off" onChange={(e) => { setError(e.target.value); setPrevia(null); }} />
                    <datalist id="errores">{ERRORES_COMUNES.map((o) => <option key={o} value={o} />)}</datalist>
                  </>
                )}
              </div>
            )}
          </div>
          {fijos && <p className="text-sm text-muted-foreground">Por defecto: {fijos.marca}{fijos.error ? ` · ${fijos.error}` : ""}. {fijos.error ? "Solo escribe el modelo." : "Escribe el modelo y elige el error."}</p>}
          <div className="space-y-1.5">
            <Label htmlFor="video">Video (opcional para generar; obligatorio para aplicar)</Label>
            <Input id="video" value={video} placeholder="https://youtu.be/…" onChange={(e) => { setVideo(e.target.value); setPrevia(null); }} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={alGenerar} disabled={ocupado}>✨ Generar textos</Button>
            <Button variant="outline" onClick={alLeer} disabled={ocupado || !video.trim()}>👁️ Leer del video</Button>
            <Button variant="outline" className="text-destructive" onClick={alDeshacer} disabled={ocupado || !respaldo} title={respaldo ? "" : "No hay respaldo de este video en este navegador"}>↩️ Deshacer textos del video</Button>
          </div>
          {msg && <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">{msg}</p>}
          {sinPermiso && (
            <p className="text-sm">
              {/* recarga completa: lleva a Google y vuelve */}
              <a href="/api/youtube/autorizar" className="font-medium underline">🔑 Renovar el permiso de YouTube</a> (se abre Google, eliges tu cuenta del canal y aceptas; solo funciona desde tu PC).
            </p>
          )}
        </CardContent>
      </Card>

      {previa && (
        <Card>
          <CardHeader>
            <CardTitle>2 · Textos generados</CardTitle>
            <div className="flex flex-wrap gap-2 text-xs">
              {previa.datos && <span className="rounded-full bg-primary/15 px-2.5 py-1">{MARCAS.find((m) => m[0] === previa.datos!.marca)?.[1]} {previa.datos.modelo_texto || previa.datos.modelo}{previa.datos.error ? ` · ${previa.datos.error}` : ""}</span>}
              {t ? <span className="rounded-full bg-emerald-500/15 px-2.5 py-1">Plantilla {t.plantilla} · {t.nombre_plantilla}</span> : <span className="rounded-full bg-amber-500/15 px-2.5 py-1">Sin plantilla</span>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {t?.avisos.map((a) => <p key={a} className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">⚠️ {a}</p>)}
            {t?.falta_video && <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">🔗 Sin video: el enlace de WhatsApp sale sin <b>?v=</b>. Pega la URL del video (arriba) y vuelve a generar para que lleve su ID.</p>}
            {t && t.sugerida !== t.plantilla && <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">⚠️ Elegiste la plantilla {t.plantilla}, pero según estos datos {t.sugerida ? `correspondería la ${t.sugerida}` : "no correspondería ninguna"}. Revisa que sea lo que quieres.</p>}
            {!t && <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">{previa.motivo}</p>}
            {previa.tituloActual && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-3 text-sm"><small className="block font-semibold text-muted-foreground">TÍTULO ACTUAL DEL VIDEO</small>{previa.tituloActual}</div>
                {t && <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm"><small className="block font-semibold text-muted-foreground">TÍTULO NUEVO</small>{t.titulos[tituloN - 1]}</div>}
              </div>
            )}
            {t && (
              <>
                <div>
                  <h3 className="mb-2 font-semibold">Elige el título ({t.titulos.length} opciones de la plantilla)</h3>
                  <div className="space-y-1.5">
                    {t.titulos.map((x, i) => (
                      <label key={i} className="flex cursor-pointer items-center gap-3 rounded-md border p-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input type="radio" name="titulo" checked={tituloN === i + 1} onChange={() => setTituloN(i + 1)} />
                        <span className="flex-1">{x}</span>
                        <span className="text-xs text-muted-foreground">{largo(x)} car.</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => copiar(t.titulos[tituloN - 1], "Título")}>📋 Copiar título</Button>
                  <Button variant="outline" size="sm" onClick={() => copiar(t.descripcion, "Descripción")}>📋 Copiar descripción</Button>
                  <Button variant="outline" size="sm" onClick={() => copiar(t.etiquetas.join(", "), "Etiquetas")}>📋 Copiar etiquetas</Button>
                </div>
                <details className="rounded-md border p-3"><summary className="cursor-pointer font-medium">Ver la descripción <span className="text-xs text-muted-foreground">({largo(t.descripcion)}/{LIMITE_DESCRIPCION})</span></summary><pre className="mt-2 whitespace-pre-wrap text-sm">{t.descripcion}</pre></details>
                <details className="rounded-md border p-3"><summary className="cursor-pointer font-medium">Ver las etiquetas <span className="text-xs text-muted-foreground">({t.etiquetas.length})</span></summary>
                  <div className="mt-2 flex flex-wrap gap-1.5">{t.etiquetas.map((e) => <span key={e} className="rounded-full bg-muted px-2 py-0.5 text-xs">{e}</span>)}{t.etiquetas_recortadas > 0 && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs">⚠ se quitaron {t.etiquetas_recortadas} por el límite de {LIMITE_ETIQUETAS} caracteres</span>}</div></details>
                <div className="space-y-3 border-t pt-4">
                  <h3 className="font-semibold">3 · Aplicar al video</h3>
                  <div className="flex flex-wrap gap-2">
                    {([["titulo", "🏷️ Título"], ["descripcion", "📝 Descripción"], ["etiquetas", "🔖 Etiquetas"]] as const).map(([k, nombre]) => (
                      <label key={k} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input type="checkbox" checked={que[k]} onChange={(e) => setQue({ ...que, [k]: e.target.checked })} /> {nombre}
                      </label>
                    ))}
                  </div>
                  <Button onClick={alAplicar} disabled={ocupado || !idVideo || !(que.titulo || que.descripcion || que.etiquetas)}>✅ Aplicar al video</Button>
                  <p className="text-xs text-muted-foreground">Se aplica al video de arriba (cuesta {COSTO_CUOTA} unidades de la cuota de YouTube). El respaldo queda en este navegador{respaldo ? <> · <button type="button" className="underline" onClick={() => { const b = new Blob([JSON.stringify({ video: idVideo, snippet: respaldo }, null, 1)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `respaldo-${idVideo}.json`; a.click(); }}>descargar respaldo</button></> : null}.</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ───────────────────────── 2 · plantillas ───────────────────────── */
function Plantillas({ editadas, onCambio }: { editadas: TextosPlantillas; onCambio: (e: TextosPlantillas) => void }) {
  const [n, setN] = useState<number>(1);
  const [texto, setTexto] = useState(PLANTILLAS_DEFECTO[1]);
  const [modelo, setModelo] = useState(MODELO_EJEMPLO[1]);
  const p = PLANTILLAS.find((x) => x.n === n)!;
  const modificada = editadas[n] !== undefined;

  // cambiar de plantilla carga su texto (el editado, si existe)
  useEffect(() => {
    const t = setTimeout(() => { setTexto(editadas[n] ?? PLANTILLAS_DEFECTO[n]); setModelo(MODELO_EJEMPLO[n]); }, 0);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const vista = useMemo(() => {
    try { return { v: vistaPlantilla(texto, modelo, n), error: "" }; } catch (e) { return { v: null, error: e instanceof Error ? e.message : "Plantilla no válida." }; }
  }, [texto, modelo, n]);

  function guardar() {
    try { validarPlantilla(n, texto); } catch (e) { return toast.error(e instanceof Error ? e.message : "La plantilla no es válida."); }
    if (!confirm("¿Guardar los cambios en esta plantilla? Se conserva una copia de la anterior.")) return;
    const anteriores = leerLS<{ n: number; fecha: string; texto: string }[]>(CLAVE_ANTERIORES, []);
    anteriores.unshift({ n, fecha: new Date().toLocaleString(), texto: editadas[n] ?? PLANTILLAS_DEFECTO[n] });
    guardarLS(CLAVE_ANTERIORES, anteriores.slice(0, 30));
    const nuevas = { ...editadas, [n]: texto.replace(/\r\n/g, "\n").replace(/\n+$/, "") + "\n" };
    guardarLS(CLAVE_PLANTILLAS, nuevas);
    onCambio(nuevas);
    toast.success("Plantilla guardada en este navegador (copia anterior conservada).");
  }
  function restaurar() {
    if (!confirm("¿Volver al texto original de esta plantilla? Se pierden tus cambios (queda una copia).")) return;
    const anteriores = leerLS<{ n: number; fecha: string; texto: string }[]>(CLAVE_ANTERIORES, []);
    if (editadas[n] !== undefined) anteriores.unshift({ n, fecha: new Date().toLocaleString(), texto: editadas[n]! });
    guardarLS(CLAVE_ANTERIORES, anteriores.slice(0, 30));
    const nuevas = { ...editadas };
    delete nuevas[n];
    guardarLS(CLAVE_PLANTILLAS, nuevas);
    onCambio(nuevas);
    setTexto(PLANTILLAS_DEFECTO[n]);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        {PLANTILLAS.map((x) => (
          <button key={x.n} type="button" onClick={() => setN(x.n)} className={`w-full rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent ${n === x.n ? "border-primary bg-primary/5" : ""}`}>
            <b className="block">{x.n} · {x.nombre}{editadas[x.n] !== undefined ? " ✎" : ""}</b>
            <span className="text-xs text-muted-foreground">{x.cuando}</span>
          </button>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Plantilla {n} · {p.nombre}</CardTitle>
          <CardDescription>Se usa con: {p.cuando}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Secciones: <code>---TITULOS---</code> (uno por línea), <code>---ETIQUETAS---</code> (separadas por comas) y <code>---DESCRIPCION---</code>. Marcadores: <code>{"{modelo}"}</code> (XP-2200) · <code>{"{modelo_l}"}</code> (xp-2200) · <code>{"{modelo_h}"}</code> (XP2200) · <code>{"{error}"}</code> · <code>{"{error_texto}"}</code> · <code>{"{idvideo}"}</code>.</p>
          <Textarea rows={18} spellCheck={false} className="font-mono text-xs" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5"><Label htmlFor="pl-modelo">Probar con el modelo</Label><Input id="pl-modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} className="w-40" /></div>
            <Button onClick={guardar}>💾 Guardar plantilla</Button>
            <Button variant="outline" onClick={restaurar} disabled={!modificada}>↺ Volver al original</Button>
          </div>
          <p className="text-xs text-muted-foreground">Las plantillas se guardan en este navegador (el original queda de respaldo en la app).</p>
          {vista.error && <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">{vista.error}</p>}
          {vista.v && (
            <div className="space-y-3">
              {vista.v.avisos.map((a) => <p key={a} className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">⚠️ {a}</p>)}
              <h3 className="font-semibold">Títulos</h3>
              {vista.v.titulos.map((t, i) => <div key={i} className="rounded-md border p-3 text-sm"><small className="block text-muted-foreground">TÍTULO {i + 1} · {largo(t)} caracteres</small>{t}</div>)}
              <h3 className="font-semibold">Etiquetas <span className="text-xs font-normal text-muted-foreground">({vista.v.etiquetas.length} · {vista.v.etiquetas_largo}/{LIMITE_ETIQUETAS} car.)</span></h3>
              <div className="flex flex-wrap gap-1.5">{vista.v.etiquetas.map((e) => <span key={e} className="rounded-full bg-muted px-2 py-0.5 text-xs">{e}</span>)}</div>
              <details open><summary className="cursor-pointer font-semibold">Descripción <span className="text-xs font-normal text-muted-foreground">({vista.v.descripcion_largo}/{LIMITE_DESCRIPCION} caracteres)</span></summary><pre className="mt-2 whitespace-pre-wrap text-sm">{vista.v.descripcion}</pre></details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

