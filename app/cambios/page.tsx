import type { Metadata } from "next";
import Link from "next/link";
import { CHANGELOG, COMMIT, VERSION } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "Cambios – MiniTube",
  description: "Historial de versiones del generador de prompts",
};

export default function Cambios() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Volver al generador
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Historial de cambios</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Versión actual: <strong>v{VERSION}</strong> · commit {COMMIT}
      </p>

      <div className="mt-8 space-y-6">
        {CHANGELOG.map((c, i) => (
          <section key={c.version} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-lg font-semibold">v{c.version}</h2>
              {i === 0 && <span className="rounded bg-primary px-1.5 text-xs text-primary-foreground">actual</span>}
              <span className="text-sm text-muted-foreground">{c.fecha}</span>
            </div>
            <p className="mt-1 font-medium">{c.titulo}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {c.cambios.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
