"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CONTENEDOR_MODULO, EncabezadoModulo } from "@/components/encabezado-modulo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MODULOS, TODOS_LOS_MODULOS, type Modulo, type Rol } from "@/lib/modulos";

type Usuario = { id: string; nombre: string; apellido: string; correo: string; telefono: string; rol: Rol; modulos: Modulo[]; activo: boolean; tieneClaveDeLaApp: boolean; actualizado: string };
type Lista = { yo: string; puedeGuardar: boolean; almacenamiento: string; usuarios: Usuario[] };
type Formulario = { id: string | null; nombre: string; apellido: string; correo: string; telefono: string; rol: Rol; modulos: Modulo[]; clave: string };

const VACIO: Formulario = { id: null, nombre: "", apellido: "", correo: "", telefono: "", rol: "usuario", modulos: ["promptube"], clave: "" };
const campoSelect = "h-8 w-full min-w-0 rounded-lg border border-input bg-input/30 px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [color-scheme:dark] [&>option]:bg-background [&>option]:text-foreground";

async function pedir<T>(ruta: string, metodo: "GET" | "POST" | "PUT" | "DELETE", cuerpo?: unknown): Promise<T> {
  const r = await fetch(ruta, { method: metodo, headers: { "Content-Type": "application/json" }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Error.");
  return d as T;
}

/** Una contraseña al azar de 14 caracteres con letras y números (sin los que se confunden: 0/O, 1/l/I). */
function claveAlAzar(): string {
  const letras = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const numeros = "23456789";
  const todos = letras + numeros;
  const b = crypto.getRandomValues(new Uint32Array(14));
  const c = [...b].map((n, i) => (i === 0 ? letras : i === 1 ? numeros : todos)[n % (i === 0 ? letras.length : i === 1 ? numeros.length : todos.length)]);
  return c.join("");
}

export default function UsuariosPage() {
  const [datos, setDatos] = useState<Lista | null>(null);
  const [error, setError] = useState("");
  const [f, setF] = useState<Formulario>(VACIO);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setDatos(await pedir<Lista>("/api/usuarios", "GET"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer la lista.");
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(cargar, 0);
    return () => clearTimeout(t);
  }, [cargar]);

  const editando = f.id !== null;
  const esYo = editando && f.id === datos?.yo;
  const bloqueada = !!datos && !datos.puedeGuardar;
  const pone = (k: "nombre" | "apellido" | "correo" | "telefono" | "clave") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const alternarModulo = (m: Modulo) => setF({ ...f, modulos: f.modulos.includes(m) ? f.modulos.filter((x) => x !== m) : [...f.modulos, m] });

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm("");
    try {
      const cuerpo = { nombre: f.nombre, apellido: f.apellido, correo: f.correo, telefono: f.telefono, rol: f.rol, modulos: f.modulos };
      if (editando) await pedir(`/api/usuarios/${f.id}`, "PUT", { ...cuerpo, ...(f.clave ? { nuevaClave: f.clave } : {}) });
      else await pedir("/api/usuarios", "POST", { ...cuerpo, clave: f.clave });
      toast.success(editando ? "Usuario actualizado." : "Usuario creado.");
      setF(VACIO);
      await cargar();
    } catch (er) {
      setErrorForm(er instanceof Error ? er.message : "No se pudo guardar.");
    }
    setGuardando(false);
  }

  async function accion(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      await cargar();
    } catch (er) {
      toast.error(er instanceof Error ? er.message : "No se pudo.");
    }
  }

  function editar(u: Usuario) {
    setF({ id: u.id, nombre: u.nombre, apellido: u.apellido, correo: u.correo, telefono: u.telefono, rol: u.rol, modulos: u.modulos, clave: "" });
    setErrorForm("");
    document.getElementById("form-usuario")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className={`${CONTENEDOR_MODULO} space-y-6`}>
      <EncabezadoModulo icono="👥" nombre="Usuarios">
        Crea usuarios y decide a cuáles módulos puede entrar cada uno: TexTUBE, PrompTUBE y CapaTUBE. Los administradores entran a todo y gestionan esta lista; a un usuario desactivado o con un módulo quitado se le cierra la sesión.
      </EncabezadoModulo>

      {error && <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">{error}</p>}
      {bloqueada && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          ⚠️ Aquí todavía no hay dónde guardar cambios. En internet falta conectar una base de datos (<b>Upstash Redis</b>, gratis, desde la tienda de integraciones de Vercel); en tu PC se guarda sola.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usuarios{datos ? ` (${datos.usuarios.length})` : ""}</CardTitle>
          <CardDescription>Cada usuario entra con su correo y su contraseña, y solo ve los módulos que le diste.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!datos && !error && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {datos?.usuarios.map((u) => (
            <div key={u.id} className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${u.activo ? "" : "opacity-60"}`}>
              <div className="min-w-48 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b>{[u.nombre, u.apellido].filter(Boolean).join(" ") || "(sin nombre)"}</b>
                  {u.id === datos.yo && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">tú</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${u.rol === "admin" ? "bg-amber-500/20 text-amber-300" : "bg-muted"}`}>{u.rol === "admin" ? "Administrador" : "Usuario"}</span>
                  {!u.activo && <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-xs text-destructive">Desactivado</span>}
                </div>
                <div className="text-xs text-muted-foreground">{u.correo || "(sin correo)"}{u.telefono ? ` · ${u.telefono}` : ""}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MODULOS.map((m) => {
                  const tiene = u.rol === "admin" || u.modulos.includes(m.id);
                  return <span key={m.id} className={`rounded-full border px-2 py-0.5 text-xs ${tiene ? "bg-foreground/10" : "border-dashed text-muted-foreground line-through opacity-60"}`} title={tiene ? "Tiene acceso" : "Sin acceso"}>{m.icono} {m.nombre}</span>;
                })}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" disabled={bloqueada} onClick={() => editar(u)}>✎ Editar</Button>
                {u.id !== datos.yo && (
                  <>
                    <Button size="sm" variant="outline" disabled={bloqueada} onClick={() => accion(() => pedir(`/api/usuarios/${u.id}`, "PUT", { activo: !u.activo }), u.activo ? "Usuario desactivado." : "Usuario activado.")}>{u.activo ? "⏸ Desactivar" : "▶ Activar"}</Button>
                    <Button size="sm" variant="outline" className="text-destructive" disabled={bloqueada} onClick={() => confirm(`¿Eliminar a ${u.nombre || u.correo}? No se puede deshacer.`) && accion(() => pedir(`/api/usuarios/${u.id}`, "DELETE"), "Usuario eliminado.")}>🗑</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card id="form-usuario">
        <CardHeader>
          <CardTitle>{editando ? `Editar usuario${esYo ? " (tú)" : ""}` : "Nuevo usuario"}</CardTitle>
          <CardDescription>{editando ? "Cambia sus datos y sus accesos. Deja la contraseña vacía para no cambiarla." : "Dale una contraseña inicial y avísale: podrá cambiarla en su panel «Cuenta»."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={guardar} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="u-nombre">Nombre</Label><Input id="u-nombre" value={f.nombre} maxLength={60} onChange={pone("nombre")} disabled={bloqueada} /></div>
              <div className="space-y-1.5"><Label htmlFor="u-apellido">Apellido</Label><Input id="u-apellido" value={f.apellido} maxLength={60} onChange={pone("apellido")} disabled={bloqueada} /></div>
              <div className="space-y-1.5"><Label htmlFor="u-correo">Correo (con él entra)</Label><Input id="u-correo" type="email" value={f.correo} maxLength={120} onChange={pone("correo")} disabled={bloqueada} /></div>
              <div className="space-y-1.5"><Label htmlFor="u-tel">Teléfono</Label><Input id="u-tel" type="tel" value={f.telefono} maxLength={25} onChange={pone("telefono")} disabled={bloqueada} /></div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="u-clave">{editando ? "Contraseña nueva (opcional)" : "Contraseña inicial"}</Label>
                <div className="flex gap-2">
                  <Input id="u-clave" type="text" autoComplete="off" value={f.clave} maxLength={128} placeholder="Mínimo 10 caracteres, con letras y números" onChange={pone("clave")} disabled={bloqueada} />
                  <Button type="button" variant="outline" disabled={bloqueada} onClick={() => setF({ ...f, clave: claveAlAzar() })}>🎲 Generar</Button>
                </div>
                {editando && f.clave && <p className="text-xs text-muted-foreground">Al guardar, se cierran las sesiones abiertas de este usuario.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-rol">Rol</Label>
                <select id="u-rol" className={campoSelect} value={f.rol} disabled={bloqueada || esYo} onChange={(e) => setF({ ...f, rol: e.target.value as Rol })}>
                  <option value="usuario">Usuario (solo los módulos que marques)</option>
                  <option value="admin">Administrador (todos los módulos y esta lista)</option>
                </select>
                {esYo && <p className="text-xs text-muted-foreground">No puedes cambiar tu propio rol.</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Módulos permitidos</Label>
                <div className="flex flex-wrap gap-2">
                  {MODULOS.map((m) => {
                    const marcado = f.rol === "admin" || f.modulos.includes(m.id);
                    return (
                      <label key={m.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${marcado ? "border-foreground/40 bg-foreground/10" : ""} ${f.rol === "admin" ? "cursor-default opacity-70" : ""}`}>
                        <input type="checkbox" checked={marcado} disabled={bloqueada || f.rol === "admin"} onChange={() => alternarModulo(m.id)} />
                        {m.icono} {m.nombre}
                      </label>
                    );
                  })}
                </div>
                {f.rol !== "admin" && f.modulos.length === 0 && <p className="text-xs text-amber-300">Sin ningún módulo: podrá entrar, pero no verá nada. Marca al menos uno.</p>}
              </div>
            </div>
            {errorForm && <p className="text-sm text-destructive">{errorForm}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={bloqueada || guardando || !f.nombre.trim() || !f.apellido.trim() || !f.correo.trim() || (!editando && !f.clave)}>{editando ? "💾 Guardar cambios" : "➕ Crear usuario"}</Button>
              {(editando || f.nombre || f.correo) && <Button type="button" variant="outline" onClick={() => { setF(VACIO); setErrorForm(""); }}>Cancelar</Button>}
            </div>
          </form>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Total de módulos: {TODOS_LOS_MODULOS.length}. Las contraseñas se guardan cifradas: ni tú ni nadie puede verlas; solo restablecerlas.</p>
    </main>
  );
}
