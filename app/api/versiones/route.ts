import { NextResponse } from "next/server";
import { VERSIONES_MODULOS } from "@/lib/versiones-modulos";

/** Versión e historial de cada módulo (lo leen la página de CapaTUBE y los demás módulos). Solo con sesión iniciada (lo exige el proxy). */
export function GET() {
  return NextResponse.json(VERSIONES_MODULOS);
}
