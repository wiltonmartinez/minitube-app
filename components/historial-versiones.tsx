"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { borrarVersion, guardarVersion, leerVersiones, restaurarVersion, type Version } from "@/lib/historial-datos";

const almacen = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/**
 * Versiones de los datos de un módulo (lo que editas y se guarda en este navegador): ver, guardar una versión a mano, volver a una anterior o borrarla.
 * Las versiones automáticas se guardan solas antes de empezar a editar. Al volver a una versión se recarga la página para que todo la use.
 */
export function HistorialVersiones({ modulo, claves, titulo = "Versiones anteriores", descripcion }: { modulo: string; claves: string[]; titulo?: string; descripcion?: string }) {
  const [lista, setLista] = useState<Version[] | null>(null);
  const recargar = () => setLista(leerVersiones(almacen(), modulo));
  const versiones = lista ?? (typeof window === "undefined" ? [] : leerVersiones(almacen(), modulo));

  function guardarAhora() {
    const nombre = prompt("Nombre de esta versión (para reconocerla después):", "Mi versión")?.trim();
    if (!nombre) return;
    if (!guardarVersion(almacen(), modulo, claves, nombre)) toast.message("No hay cambios desde la última versión guardada.");
    else toast.success("Versión guardada.");
    recargar();
  }
  function volver(v: Version) {
    if (!confirm(`¿Volver a la versión «${v.motivo}» del ${new Date(v.fecha).toLocaleString()}? Antes se guarda cómo está todo ahora, para que puedas deshacerlo.`)) return;
    if (restaurarVersion(almacen(), modulo, claves, v.id)) window.location.reload();
    else toast.error("No se pudo volver a esa versión.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descripcion ?? "Se guardan versiones de lo que editas (solas, antes de empezar a editar, o cuando tú lo pides). Puedes volver a cualquiera; hasta 20."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={guardarAhora}>💾 Guardar versión ahora</Button>
          <Button variant="ghost" size="sm" onClick={recargar}>⟳ Actualizar</Button>
        </div>
        {versiones.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay versiones guardadas. Se crea una sola cuando empieces a editar, o pulsa «Guardar versión ahora».</p>}
        {versiones.map((v, i) => (
          <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2.5 text-sm">
            <div className="min-w-48 flex-1">
              <b>{v.motivo}</b> {v.auto && <span className="rounded bg-muted px-1.5 text-[10px]">automática</span>} {i === 0 && <span className="rounded bg-primary px-1.5 text-[10px] text-primary-foreground">la más reciente</span>}
              <div className="text-xs text-muted-foreground">{new Date(v.fecha).toLocaleString()}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => volver(v)}>↩ Volver a esta</Button>
            <Button size="sm" variant="outline" className="text-destructive" title="Borrar esta versión" onClick={() => { borrarVersion(almacen(), modulo, v.id); recargar(); }}>🗑</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
