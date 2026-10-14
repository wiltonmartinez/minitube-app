"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/** Barra superior de Gestor TUBE: 01) TexTUBE, 02) PromptTUBE y 03) Editor de Capas, más «Cerrar sesión». No se muestra en la pantalla de acceso. */
export function BarraApp() {
  const ruta = usePathname();
  const router = useRouter();
  if (ruta === "/acceso") return null;
  const enlace = (activo: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground ${activo ? "bg-accent text-foreground" : "text-muted-foreground"}`;
  return (
    <nav className="sticky top-0 z-40 flex items-center gap-1 border-b bg-background/95 px-4 py-2 backdrop-blur" aria-label="Secciones de la app">
      <span className="mr-3 text-sm font-bold tracking-tight">▶ Gestor TUBE</span>
      <Link href="/textube" className={enlace(ruta === "/textube")}>
        01) ✍️ TexTUBE
      </Link>
      <Link href="/" className={enlace(ruta === "/")}>
        02) 🎨 PromptTUBE
      </Link>
      <Link href="/editor" className={enlace(ruta === "/editor")}>
        03) 🧩 Editor de Capas
      </Link>
      <Link href="/cuenta" className={`ml-auto ${enlace(ruta === "/cuenta")}`}>
        👤 Cuenta
      </Link>
      <button
        type="button"
        className=" rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        onClick={async () => {
          await fetch("/api/acceso", { method: "DELETE" });
          router.push("/acceso");
          router.refresh();
        }}
      >
        Cerrar sesión
      </button>
    </nav>
  );
}
