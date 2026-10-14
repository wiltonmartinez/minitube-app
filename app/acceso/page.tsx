"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Modo = "entrar" | "recuperar";

export default function AccesoPage() {
  const [modo, setModo] = useState<Modo>("entrar");
  const [pideCorreo, setPideCorreo] = useState(false);
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [enlaceDev, setEnlaceDev] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (new URLSearchParams(window.location.search).get("enlace") === "invalido") setError("Ese enlace ya no sirve (venció o ya se usó). Pide uno nuevo con «¿Olvidaste la contraseña?».");
      try {
        const d = await (await fetch("/api/acceso")).json();
        setPideCorreo(!!d.pideCorreo);
      } catch {
        /* sin respuesta: se pide solo la contraseña */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    try {
      const r = await fetch("/api/acceso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correo, clave }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo entrar.");
      const volver = new URLSearchParams(window.location.search).get("volver");
      window.location.href = volver && volver.startsWith("/") && !volver.startsWith("//") ? volver : "/";
    } catch (er) {
      setError(er instanceof Error ? er.message : "No se pudo entrar.");
      setEnviando(false);
    }
  }

  async function recuperar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    setInfo("");
    setEnlaceDev("");
    try {
      const r = await fetch("/api/acceso/recuperar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correo }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo enviar el enlace.");
      setInfo(d.mensaje || "Listo.");
      if (d.enlaceDev) setEnlaceDev(d.enlaceDev);
    } catch (er) {
      setError(er instanceof Error ? er.message : "No se pudo enviar el enlace.");
    }
    setEnviando(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 items-center px-4 py-16">
      <Card className="w-full">
        {modo === "entrar" ? (
          <>
            <CardHeader>
              <CardTitle>🔒 Acceso</CardTitle>
              <CardDescription>{pideCorreo ? "Escribe tu correo y tu contraseña para entrar a Gestor TUBE." : "Gestor TUBE está protegido: escribe tu contraseña para entrar."}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={entrar} className="space-y-3">
                {pideCorreo && (
                  <>
                    <Label htmlFor="correo">Correo</Label>
                    <Input id="correo" type="email" autoComplete="username" autoFocus value={correo} onChange={(e) => setCorreo(e.target.value)} />
                  </>
                )}
                <Label htmlFor="clave">Contraseña</Label>
                <Input id="clave" type="password" autoComplete="current-password" autoFocus={!pideCorreo} value={clave} onChange={(e) => setClave(e.target.value)} />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={!clave || (pideCorreo && !correo) || enviando}>
                  Entrar
                </Button>
                {pideCorreo && (
                  <button type="button" className="w-full text-center text-sm text-muted-foreground underline-offset-2 hover:underline" onClick={() => { setModo("recuperar"); setError(""); setInfo(""); }}>
                    ¿Olvidaste la contraseña?
                  </button>
                )}
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>🔑 Recuperar el acceso</CardTitle>
              <CardDescription>Escribe tu correo y te mandamos un enlace para entrar sin contraseña. Vale 15 minutos.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={recuperar} className="space-y-3">
                <Label htmlFor="correo-rec">Correo</Label>
                <Input id="correo-rec" type="email" autoComplete="username" autoFocus value={correo} onChange={(e) => setCorreo(e.target.value)} />
                {error && <p className="text-sm text-destructive">{error}</p>}
                {info && <p className="rounded-md border bg-muted/40 p-3 text-sm">{info}</p>}
                {enlaceDev && (
                  <p className="break-all rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                    Solo en tu PC (no hay servicio de correo): <a className="underline" href={enlaceDev}>abrir el enlace</a>
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={!correo || enviando}>
                  Enviarme el enlace
                </Button>
                <button type="button" className="w-full text-center text-sm text-muted-foreground underline-offset-2 hover:underline" onClick={() => { setModo("entrar"); setError(""); setInfo(""); setEnlaceDev(""); }}>
                  ← Volver
                </button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
}
