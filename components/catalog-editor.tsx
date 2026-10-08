"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PERFILES, type Perfil } from "@/lib/prompt-config";

type Catalogo = Record<string, Perfil>;

// Campos editables: visibles en español (bloque 3) y redacción en inglés que usa el prompt
const CAMPOS_ES: { k: "vestimenta" | "emocion" | "manos" | "manos1" | "fondo"; label: string }[] = [
  { k: "vestimenta", label: "Vestimenta (visible)" },
  { k: "emocion", label: "Emoción (visible)" },
  { k: "manos", label: "Manos, dos manos (visible)" },
  { k: "fondo", label: "Fondo estructural (visible)" },
];
const CAMPOS_EN: { k: "role" | "emotion" | "hands" | "hands1" | "scene" | "props"; label: string }[] = [
  { k: "role", label: "Profesión (EN, p. ej. «corporate assistant»)" },
  { k: "emotion", label: "Emoción (EN)" },
  { k: "hands", label: "Manos, dos manos (EN)" },
  { k: "scene", label: "Escena de fondo (EN)" },
  { k: "props", label: "Detalles del lugar de trabajo (EN)" },
];

// Aviso (no bloquea): la ropa no debe llevar logos ni marcas; el prompt además repite la prohibición
const RIESGO_LOGO = /logo|brand|marca|corporat|uniform|epson|canon|insignia|emblem/i;

export function CatalogEditor({
  catalogo,
  personalizado,
  onChange,
}: {
  catalogo: Catalogo;
  personalizado: boolean;
  onChange: (c: Catalogo | null) => void;
}) {
  const nombres = Object.keys(catalogo);
  const [sel, setSel] = useState(nombres[0]);
  const actual = catalogo[sel] ? sel : nombres[0];
  const perfil = catalogo[actual];

  const editar = (fn: (p: Perfil) => Perfil) => onChange({ ...catalogo, [actual]: fn(perfil) });

  function nueva() {
    const nombre = window.prompt("Nombre de la nueva profesión (se copia el perfil actual):")?.trim();
    if (!nombre) return;
    if (catalogo[nombre]) return toast.error("Ya existe una profesión con ese nombre");
    onChange({ ...catalogo, [nombre]: structuredClone(perfil) });
    setSel(nombre);
  }
  function renombrar() {
    const nombre = window.prompt("Nuevo nombre:", actual)?.trim();
    if (!nombre || nombre === actual) return;
    if (catalogo[nombre]) return toast.error("Ya existe una profesión con ese nombre");
    const nuevo: Catalogo = {};
    for (const [k, v] of Object.entries(catalogo)) nuevo[k === actual ? nombre : k] = v;
    onChange(nuevo);
    setSel(nombre);
  }
  function eliminar() {
    if (nombres.length <= 1) return toast.error("Debe quedar al menos una profesión");
    const resto = { ...catalogo };
    delete resto[actual];
    onChange(resto);
    setSel(Object.keys(resto)[0]);
  }
  function restablecer() {
    if (!window.confirm("¿Restablecer todos los menús a los valores originales?")) return;
    onChange(null);
    setSel(Object.keys(PERFILES)[0]);
    toast.success("Menús restablecidos");
  }
  function exportar() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(catalogo, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "catalogo-minitube.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const ropa = `${perfil.vestimenta} ${perfil.en.clothing.f} ${perfil.en.clothing.m}`;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">
        Los cambios se aplican al instante al prompt y se guardan en este navegador (localStorage).
        {personalizado ? " Catálogo personalizado activo." : " Usando el catálogo original."}
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1 space-y-2">
          <Label htmlFor="cat-sel">Profesión a editar</Label>
          <select
            id="cat-sel"
            value={actual}
            onChange={(e) => setSel(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          >
            {nombres.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={nueva}>
          Nueva (copia)
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={renombrar}>
          Renombrar
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={eliminar}>
          Eliminar
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={exportar}>
          Exportar JSON
        </Button>
        <Button type="button" variant="destructive" size="sm" onClick={restablecer}>
          Restablecer
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {CAMPOS_ES.map(({ k, label }) => (
          <div key={k} className="space-y-1">
            <Label>{label}</Label>
            <Input value={perfil[k]} onChange={(e) => editar((p) => ({ ...p, [k]: e.target.value }))} />
          </div>
        ))}
        {CAMPOS_EN.map(({ k, label }) => (
          <div key={k} className="space-y-1">
            <Label>{label}</Label>
            <Textarea
              rows={2}
              value={perfil.en[k]}
              onChange={(e) => editar((p) => ({ ...p, en: { ...p.en, [k]: e.target.value } }))}
            />
          </div>
        ))}
        <div className="space-y-1">
          <Label>Vestimenta mujer (EN)</Label>
          <Textarea
            rows={2}
            value={perfil.en.clothing.f}
            onChange={(e) => editar((p) => ({ ...p, en: { ...p.en, clothing: { ...p.en.clothing, f: e.target.value } } }))}
          />
        </div>
        <div className="space-y-1">
          <Label>Vestimenta hombre (EN)</Label>
          <Textarea
            rows={2}
            value={perfil.en.clothing.m}
            onChange={(e) => editar((p) => ({ ...p, en: { ...p.en, clothing: { ...p.en.clothing, m: e.target.value } } }))}
          />
        </div>
      </div>

      {RIESGO_LOGO.test(ropa) && (
        <p className="text-xs text-amber-500">
          Aviso: la vestimenta menciona logo, marca o uniforme corporativo. La ropa debe ser lisa y sin marcas; el prompt
          mantiene la prohibición de logotipos, pero conviene reescribirla.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Las reglas fijas (espacio negativo inferior izquierdo, marca de agua, anti-logos, impresoras de la marca al fondo,
        accesorios, badges, paletas, gafas y zonas seguras de YouTube) no se editan aquí y se añaden siempre al prompt.
      </p>
    </div>
  );
}
