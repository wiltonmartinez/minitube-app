import type { Metadata } from "next";
import { MarcoCapaTube } from "@/components/marco-capatube";

export const metadata: Metadata = {
  title: "CapaTUBE – Gestor TUBE",
  description: "Arma la miniatura final con capas PNG: imagen de PrompTUBE, texto 3D, badge, marcos y marca de agua.",
};

/** CapaTUBE vive como página estática independiente (public/editor); aquí se muestra dentro de la app. */
export default function EditorPage() {
  return <MarcoCapaTube />;
}
