"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ERRORES_BASE, MARCAS_BASE, configVacia, normalizarConfig, type Config, type OpcionError } from "@/lib/textube/config";
import { errorDefectoDe, esPropia, listaPlantillas, nombreDe, opcionesDe } from "@/lib/textube/plantillas";

const campo = "h-8 w-full min-w-0 rounded-lg border border-input bg-input/30 px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [color-scheme:dark] [&>option]:bg-background [&>option]:text-foreground";

type Props = { cfg: Config; onEditar: (fn: (c: Config) => Config) => void; onReemplazar: (c: Config, plantillas: Record<string, string>) => void; plantillas: Record<number, string> };

/** Editar los menús de TexTUBE: marcas, errores sugeridos y opciones de error de cada plantilla (crear, cambiar, ocultar o eliminar). */
export function MenusTextube({ cfg, onEditar, onReemplazar, plantillas }: Props) {
  return (
    <div className="space-y-6">
      <Marcas cfg={cfg} onEditar={onEditar} />
      <ErroresSugeridos cfg={cfg} onEditar={onEditar} />
      <OpcionesPorPlantilla cfg={cfg} onEditar={onEditar} />
      <Copia cfg={cfg} plantillas={plantillas} onReemplazar={onReemplazar} />
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
