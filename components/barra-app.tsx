"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const MODULOS = [
  { href: "/textube", etiqueta: "01) ✍️ TexTUBE" },
  { href: "/", etiqueta: "02) 🎨 PrompTUBE" },
  { href: "/editor", etiqueta: "03) 🧩 CapaTUBE" },
] as const;

/**
 * Barra superior de Gestor TUBE con aspecto de pestañas de navegador: la pestaña activa «se une» a la página
 * (mismo color, sin línea debajo), las demás se iluminan al pasar el ratón. No se muestra en la pantalla de acceso.
 */
export function BarraApp() {
  const ruta = usePathname();
  const router = useRouter();
  if (ruta === "/acceso") return null;
  const pestana = (activa: boolean) =>
    `relative -mb-px flex h-9 items-center whitespace-nowrap rounded-t-lg border border-b-0 px-3 text-[13px] font-medium md:px-4 md:text-sm transition-colors duration-150 ${
      activa
        ? "border-foreground/15 bg-background text-foreground before:absolute before:inset-x-3 before:top-0 before:h-0.5 before:rounded-full before:bg-foreground/70 after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-background"
        : "border-transparent text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
    }`;
  return (
    <nav className="sticky top-0 z-40 flex items-end gap-1 overflow-x-auto [scrollbar-width:none] border-b border-foreground/15 bg-[oklch(0.11_0_0)] px-3 pt-2" aria-label="Módulos de Gestor TUBE">
      <span className="mr-2 mb-2 hidden shrink-0 text-sm font-bold tracking-tight lg:block">▶ Gestor TUBE</span>
      {MODULOS.map((m) => (
        <Link key={m.href} href={m.href} className={pestana(ruta === m.href)} aria-current={ruta === m.href ? "page" : undefined}>
          {m.etiqueta}
        </Link>
      ))}
      <span className="flex-1" />
      <Link href="/cuenta" className={pestana(ruta === "/cuenta")} aria-current={ruta === "/cuenta" ? "page" : undefined}>
        👤 Cuenta
      </Link>
      <button
        type="button"
        className="mb-1 ml-1 shrink-0 rounded-md px-2 py-1.5 text-[13px] md:px-3 md:text-sm text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
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
