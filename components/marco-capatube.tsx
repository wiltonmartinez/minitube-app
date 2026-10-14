"use client";

import { useEffect, useRef } from "react";

/**
 * Muestra CapaTUBE (página aparte en public/editor) dentro de la app y le presta la letra de la app (Geist), para que los tres
 * módulos se vean igual: copia al marco las reglas @font-face ya cargadas y su familia tipográfica.
 */
export function MarcoCapaTube() {
  const ref = useRef<HTMLIFrameElement>(null);

  function prestarLetra() {
    const doc = ref.current?.contentDocument;
    if (!doc || doc.getElementById("letra-de-la-app")) return;
    try {
      const reglas: string[] = [];
      for (const hoja of Array.from(document.styleSheets)) {
        try {
          for (const r of Array.from(hoja.cssRules)) if (r.type === CSSRule.FONT_FACE_RULE) reglas.push(r.cssText);
        } catch {
          /* hoja de otro sitio: no se puede leer */
        }
      }
      const familia = getComputedStyle(document.body).fontFamily;
      const estilo = doc.createElement("style");
      estilo.id = "letra-de-la-app";
      estilo.textContent = `${reglas.join("\n")}\n:root { --fuente-app: ${familia}; }`;
      doc.head.appendChild(estilo);
    } catch {
      /* sin permiso o sin reglas: el marco usa su letra de reserva */
    }
  }

  // el marco puede terminar de cargar antes de que React atienda su evento «load»: se revisa también al montar
  useEffect(() => {
    if (ref.current?.contentDocument?.readyState === "complete") prestarLetra();
  }, []);

  return <iframe ref={ref} onLoad={prestarLetra} src="/editor/index.html" title="CapaTUBE" className="h-[calc(100vh-45px)] w-full flex-1 border-0 bg-background" />;
}
