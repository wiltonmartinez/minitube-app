import Link from "next/link";

/** Barra superior de la app unificada: PromptTUBE (generador de prompts) y Editor de capas (arma la miniatura final). */
export function BarraApp() {
  const enlace = "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
  return (
    <nav className="sticky top-0 z-40 flex items-center gap-1 border-b bg-background/95 px-4 py-2 backdrop-blur" aria-label="Secciones de la app">
      <span className="mr-3 text-sm font-bold tracking-tight">▶ Gestor TUBE</span>
      <Link href="/" className={enlace}>
        🎨 PromptTUBE
      </Link>
      <Link href="/editor" className={enlace}>
        🧩 Editor de capas
      </Link>
    </nav>
  );
}
