"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AccesoPage() {
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    try {
      const r = await fetch("/api/acceso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo entrar.");
      const volver = new URLSearchParams(window.location.search).get("volver");
      window.location.href = volver && volver.startsWith("/") && !volver.startsWith("//") ? volver : "/textube";
    } catch (er) {
      setError(er instanceof Error ? er.message : "No se pudo entrar.");
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 items-center px-4 py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>🔒 Acceso</CardTitle>
          <CardDescription>Esta sección cambia títulos y descripciones de tu canal de YouTube. Escribe tu contraseña.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={entrar} className="space-y-3">
            <Label htmlFor="clave">Contraseña</Label>
            <Input id="clave" type="password" autoComplete="current-password" autoFocus value={clave} onChange={(e) => setClave(e.target.value)} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={!clave || enviando}>
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
