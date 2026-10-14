import { connection } from "next/server";
import { BarraApp } from "@/components/barra-app";
import { usuarioActual } from "@/lib/sesion-servidor";

/** La barra de módulos con los permisos de quien tiene la sesión abierta. Se arma en cada visita (por eso va dentro de un Suspense en el layout). */
export async function BarraServidor() {
  await connection();
  return <BarraApp usuario={await usuarioActual()} />;
}
