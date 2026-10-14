"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Perfil = { nombre: string; apellido: string; correo: string; telefono: string };
type Estado = { perfil: Perfil; claveDeLaApp: boolean; almacenamiento: "redis" | "archivo" | "ninguno"; puedeGuardar: boolean; actualizado: string | null };

async function pedir<T>(ruta: string, metodo: "GET" | "PUT" | "POST", cuerpo?: unknown): Promise<T> {
  const r = await fetch(ruta, { method: metodo, headers: { "Content-Type": "application/json" }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && d.error === "Necesitas iniciar sesión.") {
    window.location.assign("/acceso?volver=/cuenta"); // eslint-disable-line @next/next/no-location-assign-relative-destination -- recarga completa para que el servidor revise la sesión
    throw new Error(d.error);
  }
  if (!r.ok) throw new Error(d.error || "Error.");
  return d as T;
}

/** Fuerza de la contraseña nueva: solo una guía visual; las reglas reales las revisa el servidor. */
function fuerza(c: string): { n: number; texto: string } {
  let n = 0;
  if (c.length >= 10) n++;
  if (c.length >= 14) n++;
  if (/[A-Z]/.test(c) && /[a-z]/.test(c)) n++;
  if (/\d/.test(c) && /[^A-Za-z0-9]/.test(c)) n++;
  return { n, texto: ["Muy débil", "Débil", "Aceptable", "Buena", "Muy buena"][n] };
}

export default function CuentaPage() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [perfil, setPerfil] = useState<Perfil>({ nombre: "", apellido: "", correo: "", telefono: "" });
  const [claveParaCorreo, setClaveParaCorreo] = useState("");
  const [errorPerfil, setErrorPerfil] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [errorClave, setErrorClave] = useState("");
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const e = await pedir<Estado>("/api/cuenta", "GET");
        setEstado(e);
        setPerfil(e.perfil);
      } catch (er) {
        setErrorPerfil(er instanceof Error ? er.message : "No se pudo leer la cuenta.");
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const correoOriginal = estado?.perfil.correo.toLowerCase() ?? "";
  const cambiaCorreo = !!estado && perfil.correo.trim().toLowerCase() !== correoOriginal;
  const sinCambios = !!estado && JSON.stringify({ ...perfil, correo: perfil.correo.trim().toLowerCase() }) === JSON.stringify({ ...estado.perfil, correo: correoOriginal });
  const pone = (k: keyof Perfil) => (e: React.ChangeEvent<HTMLInputElement>) => setPerfil({ ...perfil, [k]: e.target.value });
  const f = fuerza(nueva);

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrorPerfil("");
    try {
      const r = await pedir<{ perfil: Perfil }>("/api/cuenta", "PUT", { ...perfil, claveActual: claveParaCorreo });
      setEstado((s) => (s ? { ...s, perfil: r.perfil, actualizado: new Date().toISOString() } : s));
      setPerfil(r.perfil);
      setClaveParaCorreo("");
      toast.success("Datos guardados.");
    } catch (er) {
      setErrorPerfil(er instanceof Error ? er.message : "No se pudo guardar.");
    }
    setGuardando(false);
  }

  async function cambiarClave(e: React.FormEvent) {
    e.preventDefault();
    setErrorClave("");
    if (nueva !== repetir) return setErrorClave("La contraseña nueva y su repetición no coinciden.");
    setCambiando(true);
    try {
      const r = await pedir<{ mensaje: string }>("/api/cuenta/clave", "POST", { actual, nueva });
      toast.success(r.mensaje);
      setActual("");
      setNueva("");
      setRepetir("");
      setEstado((s) => (s ? { ...s, claveDeLaApp: true } : s));
    } catch (er) {
      setErrorClave(er instanceof Error ? er.message : "No se pudo cambiar la contraseña.");
    }
    setCambiando(false);
  }

  const bloqueada = !!estado && !estado.puedeGuardar;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">👤 Cuenta de usuario</h1>
        <p className="mt-1 text-muted-foreground">Tus datos y tu contraseña de Gestor TUBE.</p>
      </header>

      {bloqueada && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          ⚠️ Aquí todavía no hay dónde guardar cambios. En internet falta conectar una base de datos (<b>Upstash Redis</b>, gratis, desde la tienda de integraciones de Vercel); en tu PC se guarda sola. Mientras tanto la cuenta se lee de las variables de Vercel (<code>GESTOR_EMAIL</code> y <code>GESTOR_CLAVE</code>).
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
          <CardDescription>El correo es el que usas para entrar y donde llega el enlace si olvidas la contraseña.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={guardarPerfil} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="nombre">Nombre</Label><Input id="nombre" value={perfil.nombre} maxLength={60} autoComplete="given-name" onChange={pone("nombre")} disabled={bloqueada} /></div>
              <div className="space-y-1.5"><Label htmlFor="apellido">Apellido</Label><Input id="apellido" value={perfil.apellido} maxLength={60} autoComplete="family-name" onChange={pone("apellido")} disabled={bloqueada} /></div>
              <div className="space-y-1.5"><Label htmlFor="correo">Correo</Label><Input id="correo" type="email" value={perfil.correo} maxLength={120} autoComplete="email" onChange={pone("correo")} disabled={bloqueada} /></div>
              <div className="space-y-1.5"><Label htmlFor="telefono">Teléfono</Label><Input id="telefono" type="tel" value={perfil.telefono} maxLength={25} placeholder="+57 300 000 0000" autoComplete="tel" onChange={pone("telefono")} disabled={bloqueada} /></div>
            </div>
            {cambiaCorreo && (
              <div className="space-y-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                <Label htmlFor="clave-correo">Para cambiar el correo, escribe tu contraseña actual</Label>
                <Input id="clave-correo" type="password" autoComplete="current-password" value={claveParaCorreo} onChange={(e) => setClaveParaCorreo(e.target.value)} />
                <p className="text-xs text-muted-foreground">Desde ahora entrarás con el correo nuevo y el enlace de recuperación llegará a él.</p>
              </div>
            )}
            {errorPerfil && <p className="text-sm text-destructive">{errorPerfil}</p>}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={bloqueada || guardando || sinCambios || (cambiaCorreo && !claveParaCorreo)}>💾 Guardar datos</Button>
              {estado?.actualizado && <span className="text-xs text-muted-foreground">Última vez: {new Date(estado.actualizado).toLocaleString()}</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
          <CardDescription>Mínimo 10 caracteres, con letras y números. Al cambiarla se cierran las demás sesiones abiertas (otros equipos o navegadores).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={cambiarClave} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="actual">Contraseña actual</Label><Input id="actual" type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} disabled={bloqueada} /></div>
            <div className="space-y-1.5">
              <Label htmlFor="nueva">Contraseña nueva</Label>
              <Input id="nueva" type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} disabled={bloqueada} />
              {nueva && (
                <div className="flex items-center gap-2" aria-live="polite">
                  <div className="h-1.5 flex-1 rounded-full bg-muted"><div className={`h-1.5 rounded-full transition-all ${f.n <= 1 ? "bg-red-500" : f.n === 2 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${(f.n / 4) * 100}%` }} /></div>
                  <span className="w-24 text-xs text-muted-foreground">{f.texto}</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5"><Label htmlFor="repetir">Repite la contraseña nueva</Label><Input id="repetir" type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} disabled={bloqueada} /></div>
            {errorClave && <p className="text-sm text-destructive">{errorClave}</p>}
            <Button type="submit" disabled={bloqueada || cambiando || !actual || !nueva || !repetir}>🔑 Cambiar contraseña</Button>
            {estado && !estado.claveDeLaApp && !bloqueada && <p className="text-xs text-muted-foreground">Ahora entras con la contraseña de la configuración del servidor; al cambiarla aquí, la nueva pasa a ser la que vale.</p>}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
