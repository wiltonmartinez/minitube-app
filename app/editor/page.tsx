import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor de capas – Gestor TUBE",
  description: "Arma la miniatura final con capas PNG: imagen de PromptTUBE, texto 3D, badge, marcos y marca de agua.",
};

/** El editor de capas vive como página estática independiente (public/editor); aquí se muestra dentro de la app. */
export default function EditorPage() {
  return <iframe src="/editor/index.html" title="Editor de capas" className="h-[calc(100vh-49px)] w-full flex-1 border-0 bg-white" />;
}
