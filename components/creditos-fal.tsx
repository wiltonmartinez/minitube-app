"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatearSaldo } from "@/lib/fal-helpers";

type Resultado =
  | { tipo: "saldo"; texto: string; usuario: string | null; hora: string }
  | { tipo: "simulacion" }
  | { tipo: "error"; mensaje: string };

/** Muestra los créditos (saldo) de la cuenta de fal.ai. Solo consulta cuando se pulsa el botón. */
export function CreditosFal() {
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function consultar() {
    setCargando(true);
    try {
      const res = await fetch("/api/credits", { cache: "no-store" });
      const j = await res.json();
      if (j.simulacion) setResultado({ tipo: "simulacion" });
      else if (!res.ok || typeof j.saldo !== "number") setResultado({ tipo: "error", mensaje: j.error ?? "No se pudo consultar el saldo." });
      else
        setResultado({
          tipo: "saldo",
          texto: formatearSaldo(j.saldo, j.moneda),
          usuario: j.usuario ?? null,
          hora: new Date().toLocaleTimeString("es"),
        });
    } catch {
      setResultado({ tipo: "error", mensaje: "No se pudo consultar el saldo. Revisa tu conexión a internet." });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
      <span className="font-medium">Créditos de fal.ai</span>
      <Button type="button" variant="outline" size="sm" onClick={() => void consultar()} disabled={cargando}>
        <RefreshCw className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        {resultado ? "Actualizar" : "Ver saldo"}
      </Button>
      {resultado?.tipo === "saldo" && (
        <span aria-live="polite">
          <strong>{resultado.texto}</strong>
          <span className="text-xs text-muted-foreground">
            {resultado.usuario ? ` · cuenta ${resultado.usuario}` : ""} · consultado a las {resultado.hora}
          </span>
        </span>
      )}
      {resultado?.tipo === "simulacion" && (
        <span className="text-xs text-amber-500">Modo simulación: no hay clave FAL_KEY, así que no hay saldo que consultar.</span>
      )}
      {resultado?.tipo === "error" && (
        <span role="alert" className="text-xs text-destructive">
          {resultado.mensaje}
        </span>
      )}
    </div>
  );
}
