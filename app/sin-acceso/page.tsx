import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { CONTENEDOR_MODULO, EncabezadoModulo } from "@/components/encabezado-modulo";
import { MODULOS } from "@/lib/modulos";
import { usuarioActual } from "@/lib/sesion-servidor";

/** A donde se manda a quien pide un módulo que no tiene permitido. */
export default function SinAccesoPage({ searchParams }: { searchParams: Promise<{ modulo?: string }> }) {
  return (
    <Suspense fallback={null}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ searchParams }: { searchParams: Promise<{ modulo?: string }> }) {
  await connection();
  const { modulo } = await searchParams;
  const pedido = MODULOS.find((m) => m.id === modulo);
  const u = await usuarioActual();
  const mios = u ? MODULOS.filter((m) => u.modulos.includes(m.id)) : [];
  return (
    <main className={`${CONTENEDOR_MODULO} space-y-6`}>
      <EncabezadoModulo icono="🚫" nombre="Sin acceso">
        {modulo === "admin" ? "Esta sección es solo para administradores." : pedido ? `Tu cuenta no tiene permiso para entrar a ${pedido.nombre}.` : "Tu cuenta no tiene permiso para entrar aquí."} Si lo necesitas, pídele a un administrador que te lo active.
      </EncabezadoModulo>
      {mios.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {mios.map((m) => (
            <Link key={m.id} href={m.ruta} className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent">
              {m.icono} Ir a {m.nombre}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Por ahora tu cuenta no tiene ningún módulo activo. Puedes ver y cambiar tus datos en <Link href="/cuenta" className="underline">Cuenta</Link>.</p>
      )}
    </main>
  );
}
