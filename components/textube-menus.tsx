"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HistorialVersiones } from "@/components/historial-versiones";
import { CLAVES_TEXTUBE } from "@/lib/textube/versiones";
import { ERRORES_BASE, MARCAS_BASE, MAX_VALORES, MAX_VARIABLES, VARIABLES_BASE, claveDeNombre, claveValida, configVacia, normalizarConfig, type Config, type OpcionError } from "@/lib/textube/config";
import { errorDefectoDe, esPropia, listaPlantillas, nombreDe, opcionesDe } from "@/lib/textube/plantillas";

const campo = "h-8 w-full min-w-0 rounded-lg border border-input bg-input/30 px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [color-scheme:dark] [&>option]:bg-background [&>option]:text-foreground";

type Props = { cfg: Config; onEditar: (fn: (c: Config) => Config) => void; onReemplazar: (c: Config, plantillas: Record<string, string>) => void; plantillas: Record<number, string> };

/** Editar los menús de TexTUBE: marcas, errores sugeridos y opciones de error de cada plantilla (crear, cambiar, ocultar o eliminar). */
export function MenusTextube({ cfg, onEditar, onReemplazar, plantillas }: Props) {
  return (
    <div className="space-y-6">
      <Variables cfg={cfg} onEditar={onEditar} />
      <Marcas cfg={cfg} onEditar={onEditar} />
      <ErroresSugeridos cfg={cfg} onEditar={onEditar} />
      <OpcionesPorPlantilla cfg={cfg} onEditar={onEditar} />
      <HistorialVersiones modulo="textube" claves={CLAVES_TEXTUBE} descripcion="Versiones de tus menús, variables y plantillas (se guardan solas antes de empezar a editar, o cuando tú lo pides). Puedes volver a cualquiera; hasta 20." />
      <Copia cfg={cfg} plantillas={plantillas} onReemplazar={onReemplazar} />
    </div>
  );
}

/* ───────── variables propias ───────── */
function Variables({ cfg, onEditar }: Pick<Props, "cfg" | "onEditar">) {
  const [nombre, setNombre] = useState("");
  const [valores, setValores] = useState("");
  const clave = claveDeNombre(nombre);
  const cambiar = (k: string, fn: (v: Config["variables"][number]) => Config["variables"][number]) => onEditar((c) => ({ ...c, variables: c.variables.map((v) => (v.clave === k ? fn(v) : v)) }));
  function crear() {
    const lista = [...new Set(valores.split(",").map((x) => x.trim()).filter(Boolean))];
    if (!nombre.trim()) return toast.error("Escribe el nombre de la variable.");
    if (!claveValida(clave)) return toast.error(`El nombre «${nombre.trim()}» da el marcador «{${clave}}», que no es válido o ya lo usa TexTUBE. Prueba con otro nombre (letras y números, empezando por una letra).`);
    if (cfg.variables.some((v) => v.clave === clave)) return toast.error(`Ya existe una variable con el marcador {${clave}}.`);
    if (cfg.variables.length >= MAX_VARIABLES) return toast.error(`Máximo ${MAX_VARIABLES} variables.`);
    if (!lista.length) return toast.error("Escribe al menos un valor (separados por coma).");
    onEditar((c) => ({ ...c, variables: [...c.variables, { clave, nombre: nombre.trim(), valores: lista.slice(0, MAX_VALORES), defecto: lista[0] }] }));
    setNombre("");
    setValores("");
    toast.success(`Variable «${nombre.trim()}» creada: úsala en las plantillas con {${clave}}.`);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Variables de las plantillas</CardTitle>
        <CardDescription>Crea tus propias variables (por ejemplo «Acción» con Reset, Diagnóstico, Activación). En el generador eliges su valor con un menú, y se escribe en la plantilla donde pongas su marcador: <code>{"{accion}"}</code> tal cual, <code>{"{accion_l}"}</code> en minúsculas y <code>{"{accion_h}"}</code> sin espacios ni tildes (para hashtags).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cfg.variables.map((v) => (
          <div key={v.clave} className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input className="w-56" defaultValue={v.nombre} maxLength={40} aria-label={`Nombre de la variable ${v.clave}`} onBlur={(e) => { const n = e.target.value.trim(); if (n && n !== v.nombre) cambiar(v.clave, (x) => ({ ...x, nombre: n })); else e.target.value = v.nombre; }} />
              <button type="button" title="Copiar el marcador" className="rounded-full border px-2.5 py-0.5 font-mono text-xs hover:bg-accent" onClick={() => navigator.clipboard?.writeText(`{${v.clave}}`).then(() => toast.success(`Copiado {${v.clave}}`))}>{"{" + v.clave + "}"}</button>
              <span className="text-xs text-muted-foreground">también {"{" + v.clave + "_l}"} y {"{" + v.clave + "_h}"}</span>
              <Button variant="outline" size="sm" className="ml-auto text-destructive" onClick={() => confirm(`¿Eliminar la variable «${v.nombre}»? Las plantillas que usen {${v.clave}} dejarán el marcador sin reemplazar.`) && onEditar((c) => ({ ...c, variables: c.variables.filter((x) => x.clave !== v.clave) }))}>🗑 Eliminar variable</Button>
            </div>
            <div className="space-y-1.5">
              <div className="hidden grid-cols-[1fr_auto_auto] gap-2 text-xs text-muted-foreground sm:grid"><span>Valores del menú</span><span>Marcado</span><span /></div>
              {v.valores.map((x, i) => (
                <div key={x} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                  <Input defaultValue={x} maxLength={60} aria-label="Valor" onBlur={(e) => { const n = e.target.value.trim(); if (n && n !== x && !v.valores.some((y, j) => j !== i && y.toLowerCase() === n.toLowerCase())) cambiar(v.clave, (w) => ({ ...w, valores: w.valores.map((y, j) => (j === i ? n : y)), defecto: w.defecto === x ? n : w.defecto })); else e.target.value = x; }} />
                  <input type="radio" name={`def-${v.clave}`} checked={v.defecto === x} onChange={() => cambiar(v.clave, (w) => ({ ...w, defecto: x }))} title="Valor marcado de entrada" aria-label="Marcado de entrada" />
                  <Button variant="outline" size="sm" className="text-destructive" title="Quitar este valor" disabled={v.valores.length <= 1} onClick={() => cambiar(v.clave, (w) => { const val = w.valores.filter((_, j) => j !== i); return { ...w, valores: val, defecto: w.defecto === x ? val[0] : w.defecto }; })}>🗑</Button>
                </div>
              ))}
              <NuevoValor onAgregar={(n) => {
                if (v.valores.some((y) => y.toLowerCase() === n.toLowerCase())) return toast.error("Ese valor ya existe.");
                if (v.valores.length >= MAX_VALORES) return toast.error(`Máximo ${MAX_VALORES} valores.`);
                cambiar(v.clave, (w) => ({ ...w, valores: [...w.valores, n] }));
              }} />
            </div>
          </div>
        ))}
        {!cfg.variables.length && <p className="text-sm text-muted-foreground">No hay variables. Crea la primera abajo.</p>}
        <div className="space-y-2 border-t pt-3">
          <div className="text-sm font-medium">Nueva variable</div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1"><Label htmlFor="v-nombre">Nombre</Label><Input id="v-nombre" className="w-48" value={nombre} maxLength={40} placeholder="Tipo de servicio" onChange={(e) => setNombre(e.target.value)} /></div>
            <div className="min-w-64 flex-1 space-y-1"><Label htmlFor="v-valores">Valores (separados por coma)</Label><Input id="v-valores" value={valores} placeholder="Reset, Diagnóstico, Activación" onChange={(e) => setValores(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), crear())} /></div>
            <Button onClick={crear} disabled={!nombre.trim() || !valores.trim()}>➕ Crear variable</Button>
            <Button variant="outline" onClick={() => confirm("¿Volver a la variable original (Acción) y quitar las demás?") && onEditar((c) => ({ ...c, variables: VARIABLES_BASE.map((x) => ({ ...x, valores: [...x.valores] })) }))}>↺ Originales</Button>
          </div>
          {nombre.trim() && <p className="text-xs text-muted-foreground">Marcador en las plantillas: <code>{"{" + (clave || "…") + "}"}</code>{clave && !claveValida(clave) ? " — no válido o ya usado por TexTUBE, cambia el nombre" : ""}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function NuevoValor({ onAgregar }: { onAgregar: (v: string) => void }) {
  const [v, setV] = useState("");
  const ok = () => { const n = v.trim(); if (n) { onAgregar(n); setV(""); } };
  return (
    <div className="flex gap-2">
      <Input className="max-w-xs" value={v} maxLength={60} placeholder="Valor nuevo" aria-label="Valor nuevo" onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), ok())} />
      <Button variant="outline" size="sm" onClick={ok} disabled={!v.trim()}>➕ Agregar valor</Button>
    </div>
  );
}

/* ───────── marcas ───────── */
function Marcas({ cfg, onEditar }: Pick<Props, "cfg" | "onEditar">) {
  const [valor, setValor] = useState("");
  const [nombre, setNombre] = useState("");
  const base = (v: string) => MARCAS_BASE.some((m) => m.valor === v);
  const cambiar = (v: string, cambios: { nombre?: string; oculta?: boolean }) => onEditar((c) => ({ ...c, marcas: c.marcas.map((m) => (m.valor === v ? { ...m, ...cambios, oculta: cambios.oculta ?? m.oculta } : m)) }));
  function agregar() {
    const v = valor.trim();
    if (!v || !/^[A-Za-z0-9 ._-]+$/.test(v)) return toast.error("El código de la marca solo lleva letras, números, espacio, punto, guion o guion bajo.");
    if (cfg.marcas.some((m) => m.valor.toLowerCase() === v.toLowerCase())) return toast.error("Esa marca ya existe.");
    onEditar((c) => ({ ...c, marcas: [...c.marcas, { valor: v, nombre: nombre.trim() || v, propia: true }] }));
    setValor("");
    setNombre("");
    toast.success(`Marca «${nombre.trim() || v}» agregada.`);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Marcas</CardTitle>
        <CardDescription>Las del menú «Marca». Las originales se pueden renombrar u ocultar; las que agregues, también eliminar. Una marca nueva no tiene plantilla automática: se usa eligiendo la plantilla a mano.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {cfg.marcas.map((m) => (
          <div key={m.valor} className={`flex flex-wrap items-center gap-2 ${m.oculta ? "opacity-60" : ""}`}>
            <code className="w-28 truncate text-xs text-muted-foreground" title="Código interno">{m.valor}</code>
            <Input className="w-56" defaultValue={m.nombre} maxLength={40} aria-label={`Nombre de ${m.valor}`} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== m.nombre && (cambiar(m.valor, { nombre: e.target.value.trim() }), toast.success("Nombre actualizado."))} />
            {base(m.valor) ? (
              <Button variant="outline" size="sm" onClick={() => cambiar(m.valor, { oculta: !m.oculta })}>{m.oculta ? "👁 Mostrar" : "🙈 Ocultar"}</Button>
            ) : (
              <Button variant="outline" size="sm" className="text-destructive" onClick={() => confirm(`¿Eliminar la marca «${m.nombre}»?`) && onEditar((c) => ({ ...c, marcas: c.marcas.filter((x) => x.valor !== m.valor) }))}>🗑 Eliminar</Button>
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
          <div className="space-y-1"><Label htmlFor="m-valor">Código (sin tildes)</Label><Input id="m-valor" className="w-32" value={valor} maxLength={30} placeholder="HP" onChange={(e) => setValor(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="m-nombre">Nombre en el menú</Label><Input id="m-nombre" className="w-56" value={nombre} maxLength={40} placeholder="HP (Hewlett-Packard)" onChange={(e) => setNombre(e.target.value)} /></div>
          <Button onClick={agregar} disabled={!valor.trim()}>➕ Agregar marca</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────── errores sugeridos ───────── */
function ErroresSugeridos({ cfg, onEditar }: Pick<Props, "cfg" | "onEditar">) {
  const [nuevo, setNuevo] = useState("");
  const agregar = () => {
    const e = nuevo.trim();
    if (!e) return;
    if (!/^[A-Za-z0-9 ./áéíóúüñÁÉÍÓÚÜÑ-]{1,30}$/.test(e)) return toast.error("El error solo puede llevar letras, números, espacio, punto, guion y barra (máximo 30).");
    if (cfg.errores.some((x) => x.toLowerCase() === e.toLowerCase())) return toast.error("Ese error ya está en la lista.");
    onEditar((c) => ({ ...c, errores: [...c.errores, e] }));
    setNuevo("");
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Errores sugeridos</CardTitle>
        <CardDescription>Las sugerencias que salen al escribir el campo «Error» (cuando la plantilla deja escribirlo libre).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {cfg.errores.map((e, i) => (
            <span key={e} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 py-0.5 pl-3 pr-1 text-sm">
              {e}
              <button type="button" title="Cambiar el nombre" className="rounded-full px-1.5 hover:bg-accent" onClick={() => {
                const n = prompt("Nuevo texto del error:", e)?.trim();
                if (n && /^[A-Za-z0-9 ./áéíóúüñÁÉÍÓÚÜÑ-]{1,30}$/.test(n)) onEditar((c) => ({ ...c, errores: c.errores.map((x, j) => (j === i ? n : x)) }));
                else if (n) toast.error("Texto no válido.");
              }}>✎</button>
              <button type="button" title="Eliminar" className="rounded-full px-1.5 hover:bg-accent" onClick={() => onEditar((c) => ({ ...c, errores: c.errores.filter((_, j) => j !== i) }))}>✕</button>
            </span>
          ))}
          {!cfg.errores.length && <span className="text-sm text-muted-foreground">No hay sugerencias.</span>}
        </div>
        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
          <Input className="w-56" value={nuevo} maxLength={30} placeholder="Ej: 5B02" aria-label="Nuevo error" onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregar())} />
          <Button onClick={agregar} disabled={!nuevo.trim()}>➕ Agregar</Button>
          <Button variant="outline" onClick={() => confirm("¿Volver a las sugerencias originales?") && onEditar((c) => ({ ...c, errores: [...ERRORES_BASE] }))}>↺ Originales</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────── opciones de error por plantilla ───────── */
function OpcionesPorPlantilla({ cfg, onEditar }: Pick<Props, "cfg" | "onEditar">) {
  const todas = listaPlantillas();
  const [n, setN] = useState<number>(2);
  const existe = todas.some((p) => p.n === n);
  const actual = existe ? n : todas[0].n;
  const original = !esPropia(actual);
  const filas: OpcionError[] = opcionesDe(actual);
  const defecto = errorDefectoDe(actual) ?? "";
  const [nom, setNom] = useState("");
  const [enl, setEnl] = useState("");

  // guarda la lista completa de opciones de la plantilla elegida (en la propia o en las cambiadas de una original)
  const poner = (lista: OpcionError[], def?: string) =>
    onEditar((c) => {
      if (original) return { ...c, opcionesError: { ...c.opcionesError, [actual]: lista }, opcionDefecto: { ...c.opcionDefecto, [actual]: def ?? (lista.some((o) => o.nombre === defecto) ? defecto : "") } };
      return { ...c, propias: c.propias.map((p) => (p.n === actual ? { ...p, opciones: lista, opcionDefecto: def ?? (lista.some((o) => o.nombre === defecto) ? defecto : "") } : p)) };
    });
  function agregar() {
    const nombre = nom.trim();
    if (!nombre) return;
    if (filas.some((f) => f.nombre.toLowerCase() === nombre.toLowerCase())) return toast.error("Esa opción ya existe.");
    poner([...filas, { nombre, enlace: enl.trim() || nombre }]);
    setNom("");
    setEnl("");
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Opciones de error por plantilla</CardTitle>
        <CardDescription>Cuando una plantilla deja elegir el error de una lista (como la 2, 3, 4 y 6), aquí editas esa lista. «Texto en el enlace» es cómo se escribe en el enlace de WhatsApp. Una plantilla sin opciones deja escribir el error libre.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="op-plantilla">Plantilla</Label>
          <select id="op-plantilla" className={campo} value={actual} onChange={(e) => setN(Number(e.target.value))}>
            {todas.map((p) => <option key={p.n} value={p.n}>{p.n} · {p.nombre}{p.opciones_error.length ? ` (${p.opciones_error.length} opciones)` : " (error libre)"}</option>)}
          </select>
        </div>
        {filas.length > 0 && (
          <div className="space-y-1.5">
            <div className="hidden grid-cols-[1fr_1fr_auto_auto] gap-2 text-xs text-muted-foreground sm:grid"><span>Opción del menú</span><span>Texto en el enlace</span><span>Marcada</span><span /></div>
            {filas.map((f, i) => (
              <div key={f.nombre} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2">
                <Input defaultValue={f.nombre} maxLength={40} aria-label="Opción" onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== f.nombre && !filas.some((x, j) => j !== i && x.nombre.toLowerCase() === v.toLowerCase())) poner(filas.map((x, j) => (j === i ? { ...x, nombre: v } : x)), defecto === f.nombre ? v : undefined); else e.target.value = f.nombre; }} />
                <Input defaultValue={f.enlace} maxLength={40} aria-label="Texto en el enlace" onBlur={(e) => { const v = e.target.value.trim() || f.nombre; if (v !== f.enlace) poner(filas.map((x, j) => (j === i ? { ...x, enlace: v } : x))); }} />
                <input type="radio" name="defecto" checked={defecto === f.nombre} onChange={() => poner(filas, f.nombre)} title="Opción marcada de entrada" aria-label="Marcada de entrada" />
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => poner(filas.filter((_, j) => j !== i))} title="Eliminar">🗑</Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
          <Input className="w-48" value={nom} maxLength={40} placeholder="Opción nueva" aria-label="Opción nueva" onChange={(e) => setNom(e.target.value)} />
          <Input className="w-48" value={enl} maxLength={40} placeholder="Texto en el enlace (opcional)" aria-label="Texto en el enlace" onChange={(e) => setEnl(e.target.value)} />
          <Button onClick={agregar} disabled={!nom.trim()}>➕ Agregar opción</Button>
          {original && cfg.opcionesError[actual] !== undefined && <Button variant="outline" onClick={() => confirm(`¿Volver a las opciones originales de la plantilla ${actual}?`) && onEditar((c) => { const o = { ...c.opcionesError }; delete o[actual]; const d = { ...c.opcionDefecto }; delete d[actual]; return { ...c, opcionesError: o, opcionDefecto: d }; })}>↺ Originales</Button>}
        </div>
        <p className="text-xs text-muted-foreground">Plantilla elegida: {nombreDe(actual)}.</p>
      </CardContent>
    </Card>
  );
}

/* ───────── copia de seguridad ───────── */
function Copia({ cfg, plantillas, onReemplazar }: Pick<Props, "cfg" | "plantillas" | "onReemplazar">) {
  function descargar() {
    const b = new Blob([JSON.stringify({ tipo: "textube-configuracion", version: 1, config: cfg, plantillas }, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `textube-configuracion-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function cargar(f: File | undefined) {
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d?.tipo !== "textube-configuracion") throw new Error("Ese archivo no es una copia de TexTUBE.");
      if (!confirm("¿Reemplazar los menús y las plantillas de este navegador por los del archivo?")) return;
      const pl: Record<string, string> = {};
      if (d.plantillas && typeof d.plantillas === "object") for (const [k, v] of Object.entries(d.plantillas)) if (typeof v === "string" && /^\d+$/.test(k) && v.length < 60000) pl[k] = v;
      onReemplazar(normalizarConfig(d.config ?? configVacia()), pl);
      toast.success("Copia cargada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Copia de seguridad</CardTitle>
        <CardDescription>Tus menús y plantillas viven en este navegador. Descarga una copia para no perderlos o para usarlos en otro equipo.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={descargar}>⬇ Descargar copia</Button>
        <label className="inline-flex cursor-pointer items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
          ⬆ Cargar copia
          <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { cargar(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <Button variant="outline" className="text-destructive" onClick={() => confirm("¿Borrar todos tus cambios de menús y volver a los originales? Las plantillas editadas no se tocan.") && onReemplazar(configVacia(), Object.fromEntries(Object.entries(plantillas).map(([k, v]) => [k, v])))}>↺ Menús originales</Button>
      </CardContent>
    </Card>
  );
}
