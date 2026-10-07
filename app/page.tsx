"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const OTRO = "OTRO";
const NINGUNA = "__ninguna__";

type AssetKey =
  | "modelos"
  | "errores"
  | "soluciones"
  | "mediosPago"
  | "procedimiento"
  | "branding";
type Asset = { name: string; path: string };
type AssetsData = Record<AssetKey, Asset[]>;

const ASSET_FIELDS: { key: AssetKey; label: string }[] = [
  { key: "modelos", label: "Imagen de Modelo" },
  { key: "errores", label: "Imagen de Error" },
  { key: "soluciones", label: "Imagen de Solución" },
  { key: "branding", label: "Imagen de Branding (logo)" },
  { key: "mediosPago", label: "Imagen de Medio de Pago" },
  { key: "procedimiento", label: "Imagen de Procedimiento" },
];

const NO_ASSETS: AssetsData = {
  modelos: [],
  errores: [],
  soluciones: [],
  mediosPago: [],
  procedimiento: [],
  branding: [],
};

// Midjourney necesita URLs públicas: define NEXT_PUBLIC_ASSETS_BASE_URL al publicar o usar un túnel
const ASSETS_BASE_URL = process.env.NEXT_PUBLIC_ASSETS_BASE_URL;

const MARCAS = ["Epson", "Canon"];
const ERRORES = [
  "Almohadillas",
  "Error 5b00",
  "Código E-11",
  "Error E-11",
  "0014BD",
  "00000008",
  "00000001",
  "00000004",
  "0000000C",
  "00080000",
  "00010000",
  "00040000",
  "000C0000",
  OTRO,
];
const IDIOMAS = [
  "Español",
  "Portugués",
  "Inglés",
  "Francés",
  "Alemán",
  "Polaco",
  "Holandés",
  "Italiano",
];
const GENEROS = ["Hombre", "Mujer"];
const EDADES = ["Joven (20-25 años)", "Adulto (30-40 años)", "Maduro (45+ años)"];
const ETNIAS = ["Latino", "Caucásico", "Afrodescendiente", "Asiático"];
const PROFESIONES = [
  "Técnico",
  "Ama de casa",
  "Oficina",
  "Fotógrafo",
  "Diseñador gráfico",
  "Estudiante",
  "Ingeniero de Sistemas",
  "Profesor",
];
const ESTILOS = [
  "Casual (Sudadera/Hoodie)",
  "Técnico (Polo de trabajo)",
  "Profesional (Camisa)",
  "Overol de mecánico técnico",
  "Bata blanca de laboratorio",
  "Chaleco de taller con herramientas",
  "Camiseta gamer con auriculares",
  "Blazer elegante sin corbata",
  "Delantal de casa",
  "Camiseta básica y gorra",
  "Chaqueta de mezclilla",
  "Camisa a cuadros remangada",
];
const EMOCIONES = [
  "Asombro absoluto (boca abierta, ojos muy abiertos)",
  "Alivio y felicidad (sonrisa grande)",
  "Confianza/Éxito (guiño y pulgar arriba)",
  "Shock extremo (manos en la cabeza, ojos desorbitados)",
  "Euforia total (puños arriba, grito de alegría)",
  "Incredulidad (ceja levantada, mano en la boca)",
  "Sorpresa pícara (sonrisa de lado, mirada cómplice)",
  "Triunfo (puño cerrado, sonrisa de victoria)",
  "Satisfacción tranquila (brazos cruzados, sonrisa segura)",
  "Mente explotada (cara de asombro, destellos alrededor)",
];
const MIRADAS = [
  "Hacia el frente (a la cámara)",
  "Hacia el objeto (la impresora)",
  "Hacia las letras (el texto)",
  "Ojos cerrados",
];
const FONDOS = [
  "Cyber-tech oscuro con escudos holográficos azules",
  "Centro de servidores con luces de neón",
  "Taller técnico moderno con iluminación gamer",
  "Matriz de código verde estilo hacker",
  "Laboratorio futurista de electrónica con pantallas holográficas",
  "Ciudad cyberpunk nocturna con lluvia de neón",
  "Circuito impreso gigante con trazas luminosas",
  "Sala de control con múltiples monitores azules",
  "Túnel de datos con rayos de luz y partículas",
  "Espacio digital oscuro con candados y escudos de seguridad",
  "Oficina moderna desenfocada con pantallas y luz azulada",
  "Estudio gamer con luces RGB moradas y azules",
  "Galaxia digital con partículas y constelaciones de datos",
  "Nube de datos futurista con servidores flotantes",
  "Fondo degradado rojo y negro con humo y destellos",
  "Escritorio de técnico con laptop, cables y luces LED",
];
const MARCOS = [
  "Marco de neón fino rojo y azul",
  "Marco de neón amarillo brillante con resplandor",
  "Marco de doble línea cian y magenta",
  "Marco metálico cromado con reflejos",
  "Marco de circuito electrónico luminoso",
  "Marco de fuego y chispas naranjas",
  "Marco glitch digital con destellos RGB",
  "Marco holográfico con bordes translúcidos",
  "Marco de rayos eléctricos azules",
  "Marco grueso rojo con borde blanco y sombra 3D",
];

type FormState = {
  marca: string;
  modelo: string;
  error: string;
  errorOtro: string;
  genero: string;
  edad: string;
  etnia: string;
  profesion: string;
  estilo: string;
  emocion: string;
  mirada: string;
  fondo: string;
  marco: string;
  idioma: string;
  badges: string;
};

type SelectKey =
  | "marca"
  | "error"
  | "genero"
  | "edad"
  | "etnia"
  | "profesion"
  | "estilo"
  | "emocion"
  | "mirada"
  | "fondo"
  | "marco"
  | "idioma";

const SELECT_FIELDS: { key: SelectKey; label: string; options: string[] }[] = [
  { key: "marca", label: "Marca", options: MARCAS },
  { key: "error", label: "Tipo de error", options: ERRORES },
  { key: "genero", label: "Género del personaje", options: GENEROS },
  { key: "edad", label: "Edad", options: EDADES },
  { key: "etnia", label: "Etnia / Raza", options: ETNIAS },
  { key: "profesion", label: "Profesión", options: PROFESIONES },
  { key: "estilo", label: "Estilo / Vestimenta", options: ESTILOS },
  { key: "emocion", label: "Emoción", options: EMOCIONES },
  { key: "mirada", label: "Mirada", options: MIRADAS },
  { key: "fondo", label: "Fondo", options: FONDOS },
  { key: "marco", label: "Marco", options: MARCOS },
  { key: "idioma", label: "Idioma de los Textos", options: IDIOMAS },
];

const INITIAL: FormState = {
  marca: MARCAS[0],
  modelo: "",
  error: ERRORES[0],
  errorOtro: "",
  genero: GENEROS[0],
  edad: EDADES[0],
  etnia: ETNIAS[0],
  profesion: PROFESIONES[0],
  estilo: ESTILOS[0],
  emocion: EMOCIONES[0],
  mirada: MIRADAS[0],
  fondo: FONDOS[0],
  marco: MARCOS[0],
  idioma: IDIOMAS[0],
  badges: "",
};

export default function Home() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<AssetsData>(NO_ASSETS);
  const [imagenes, setImagenes] = useState<Record<AssetKey, string | null>>({
    modelos: null,
    errores: null,
    soluciones: null,
    mediosPago: null,
    procedimiento: null,
    branding: null,
  });

  useEffect(() => {
    fetch("/api/assets")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("assets"))))
      .then((data: AssetsData) => setAssets({ ...NO_ASSETS, ...data }))
      .catch(() => toast.error("No se pudieron cargar las imágenes de Assets"));
  }, []);

  const update = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function generate(e: React.FormEvent) {
    e.preventDefault();

    const error = form.error === OTRO ? form.errorOtro.trim() : form.error;
    if (!error) {
      toast.error("Escribe el error en el campo OTRO");
      return;
    }

    setLoading(true);
    setResult("");
    try {
      // Los atributos del personaje se concatenan en un único campo para la API
      const personaje = [
        form.genero,
        form.edad,
        form.etnia,
        `profesión: ${form.profesion}`,
        `vestimenta: ${form.estilo}`,
        `emoción: ${form.emocion}`,
        `mirada: ${form.mirada}`,
      ].join(", ");

      // Marca + modelo, sin repetir la marca si ya la escribieron
      const modelo = form.modelo.trim();
      const modeloCompleto = modelo.toLowerCase().startsWith(form.marca.toLowerCase())
        ? modelo
        : `${form.marca} ${modelo}`.trim();

      const base = (ASSETS_BASE_URL || window.location.origin).replace(/\/$/, "");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelo: modeloCompleto,
          error,
          personaje,
          fondo: form.fondo,
          marco: form.marco,
          idioma: form.idioma,
          badges: form.badges,
          imagenes: Object.fromEntries(
            Object.entries(imagenes).map(([k, path]) => [
              k,
              path ? `${base}${path}` : null,
            ]),
          ),
        }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Error al generar el prompt");
      setResult(text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(result);
    } catch {
      // Respaldo para contextos sin permiso/foco del Clipboard API
      const ta = document.createElement("textarea");
      ta.value = result;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (!ok) {
        toast.error("No se pudo copiar");
        return;
      }
    }
    toast.success("Prompt copiado al portapapeles");
  }

  const renderSelect = ({ key, label, options }: (typeof SELECT_FIELDS)[number]) => (
    <div key={key} className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Select value={form[key]} onValueChange={(v) => update(key, v)}>
        <SelectTrigger id={key} className="w-full">
          <SelectValue placeholder="Selecciona..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const select = (key: SelectKey) => SELECT_FIELDS.find((f) => f.key === key)!;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Generador de prompts para miniaturas de YouTube
        </h1>
        <p className="mt-2 text-muted-foreground">
          Plantillas para el servicio de reset remoto asistido de impresoras, listas para Midjourney v6.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plantilla de miniatura</CardTitle>
            <CardDescription>
              Escribe modelo y badges; elige el resto en los menús.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={generate} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {renderSelect(select("marca"))}
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo de impresora</Label>
                  <Input
                    id="modelo"
                    placeholder="Ej: L3250, G6010"
                    value={form.modelo}
                    onChange={(e) => update("modelo", e.target.value)}
                  />
                </div>

                {renderSelect(select("error"))}
                {form.error === OTRO && (
                  <div className="space-y-2">
                    <Label htmlFor="errorOtro">Otro error</Label>
                    <Input
                      id="errorOtro"
                      placeholder="Escribe el código o error"
                      value={form.errorOtro}
                      onChange={(e) => update("errorOtro", e.target.value)}
                    />
                  </div>
                )}

                {(
                  [
                    "genero",
                    "edad",
                    "etnia",
                    "profesion",
                    "estilo",
                    "emocion",
                    "mirada",
                    "fondo",
                    "marco",
                    "idioma",
                  ] as SelectKey[]
                ).map((k) => renderSelect(select(k)))}

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="badges">Badges 3D</Label>
                  <Input
                    id="badges"
                    placeholder="Ej: 100% REMOTO + VÍA USB"
                    value={form.badges}
                    onChange={(e) => update("badges", e.target.value)}
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <p className="text-sm font-medium">
                    Imágenes de referencia (opcionales)
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {ASSET_FIELDS.map(({ key, label }) => {
                      const selected = assets[key].find((a) => a.path === imagenes[key]);
                      return (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={`img-${key}`}>{label}</Label>
                          <div className="flex items-center gap-2">
                            <Select
                              value={imagenes[key] ?? NINGUNA}
                              onValueChange={(v) =>
                                setImagenes((im) => ({
                                  ...im,
                                  [key]: v === NINGUNA ? null : v,
                                }))
                              }
                            >
                              <SelectTrigger id={`img-${key}`} className="w-full min-w-0">
                                <SelectValue placeholder="Ninguna" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NINGUNA}>Ninguna</SelectItem>
                                {assets[key].map((a) => (
                                  <SelectItem key={a.path} value={a.path}>
                                    {a.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selected && (
                              <Image
                                src={selected.path}
                                alt={selected.name}
                                width={40}
                                height={40}
                                unoptimized
                                className="size-10 shrink-0 rounded border bg-white object-contain"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Generando..." : "Generar prompt"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompt generado</CardTitle>
            <CardDescription>Listo para pegar en Midjourney.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              readOnly
              value={result}
              placeholder="El prompt aparecerá aquí..."
              className="min-h-[320px] font-mono text-sm"
            />
            <Button
              variant="secondary"
              className="w-full"
              onClick={copy}
              disabled={!result || loading}
            >
              Copiar al portapapeles
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
