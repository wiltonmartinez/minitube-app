"use client";

import { Dices, Download, Shuffle, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const OTRO = "OTRO";

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
const EDADES = [
  "Joven (18-25 años)",
  "Adulto Joven (30-40 años)",
  "Adulto Mayor (45-55 años)",
  "Maduro (56 a 70 años)",
  "Viejo (75 a 90 años)",
];
const ETNIAS = [
  "Latino (Genérico)",
  "Mexicano",
  "Colombiano",
  "Argentino",
  "Peruano",
  "Caribeño",
  "Brasileño",
  "Caucásico (Norteamericano/Europeo)",
  "Nórdico",
  "Mediterráneo",
  "Afrodescendiente",
  "Afroamericano",
  "Asiático (Este de Asia)",
  "Indio / Surasiático",
  "Árabe / Medio Oriente",
];
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
  "Asombro absoluto (mandíbula caída, boca muy abierta)",
  "Alivio y felicidad (sonrisa grande y relajada)",
  "Confianza/Éxito (sonrisa amplia y muy segura)",
  "Shock extremo (boca desencajada por la impresión)",
  "Euforia total (boca abierta en grito de alegría, dientes a la vista)",
  "Incredulidad (mueca de duda, labios apretados hacia un lado)",
  "Sorpresa pícara (media sonrisa ladeada)",
  "Triunfo (sonrisa de victoria radiante y efusiva)",
  "Satisfacción tranquila (sonrisa leve, labios cerrados y serenos)",
  "Mente explotada (expresión facial rígida y paralizada por el asombro)",
];
const MIRADAS = [
  "Contacto visual directo (mirando fijamente a la cámara para conectar con el espectador)",
  "Mirando fijamente hacia la impresora (enfocando la atención en el problema)",
  "Mirando hacia los textos 3D gigantes (guiando la vista hacia el código de error o solución)",
  "Mirando de reojo hacia la impresora (ideal para expresiones de duda o sospecha)",
  "Mirando hacia arriba en ángulo (ideal para admirar insignias o textos flotantes)",
];
const BADGES = [
  "Ninguno",
  "Reset en 1 Minuto",
  "Desbloqueo Inmediato",
  "Ultra Rápido",
  "100% Seguro",
  "Libre de Virus",
  "Solo Compartes USB",
  "Cero Instalaciones",
  "Sin AnyDesk",
  "No Requiere Desarmar",
  "Sin Desactivar Antivirus",
  "No Cambias Almohadillas",
  "Revisión Gratis",
  "Diagnóstico Gratis",
  "Primero Revisión, Después Pago",
  "100% Garantizado",
  "Reutilizable en cualquier PC",
  "Atención 24/7",
  "Pago PayPal",
  "Se recibe Nequi",
  "Pago Binance",
  "Pago con Tarjeta",
  "Pago Banco Local",
];
const GESTOS = [
  "Sin gesto específico (Por defecto)",
  "Señalando la impresora con el dedo índice",
  "Señalando los textos 3D",
  "Señalando directamente a la cámara",
  "Ambas manos en la cabeza (shock/frustración)",
  "Mano cubriendo la boca (sorpresa)",
  "Encogimiento de hombros con palmas arriba (confusión)",
  "Pulgar hacia arriba (aprobación/éxito)",
  "Brazos cruzados (confianza/experto)",
  "Sosteniendo un cable USB brillante",
  "Palmas abiertas mostrando la impresora (presentación)",
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
  gesto: string;
  fondo: string;
  marco: string;
  idioma: string;
  badge1: string;
  badge2: string;
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
  | "gesto"
  | "fondo"
  | "marco"
  | "idioma"
  | "badge1"
  | "badge2";

const SELECT_FIELDS: { key: SelectKey; label: string; options: string[] }[] = [
  { key: "marca", label: "Marca", options: MARCAS },
  { key: "error", label: "Tipo de error", options: ERRORES },
  { key: "genero", label: "Género del personaje", options: GENEROS },
  { key: "edad", label: "Edad", options: EDADES },
  { key: "etnia", label: "Etnia / Raza", options: ETNIAS },
  { key: "profesion", label: "Profesión", options: PROFESIONES },
  { key: "estilo", label: "Estilo / Vestimenta", options: ESTILOS },
  { key: "emocion", label: "Emociones y Gestos Rostros", options: EMOCIONES },
  { key: "mirada", label: "Mirada", options: MIRADAS },
  { key: "gesto", label: "Gesto de las manos", options: GESTOS },
  { key: "fondo", label: "Fondo", options: FONDOS },
  { key: "marco", label: "Marco", options: MARCOS },
  { key: "idioma", label: "Idioma de los Textos", options: IDIOMAS },
  { key: "badge1", label: "Badges 3D # 1", options: BADGES },
  { key: "badge2", label: "Badges 3D # 2", options: BADGES },
];

// Campos con botón individual de aleatorizar (NO incluye marca, modelo, error ni idioma)
const RANDOMIZABLE = new Set<SelectKey>([
  "genero",
  "edad",
  "etnia",
  "profesion",
  "estilo",
  "emocion",
  "mirada",
  "gesto",
  "fondo",
  "marco",
  "badge1",
  "badge2",
]);

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
  gesto: GESTOS[0],
  fondo: FONDOS[0],
  marco: MARCOS[0],
  idioma: IDIOMAS[0],
  badge1: BADGES[0],
  badge2: BADGES[0],
};

const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];

// Apariencia/escena al azar. NO incluye marca, modelo, error ni idioma.
function randomAppearance() {
  const badge1 = pick(BADGES);
  // Evita repetir la misma insignia (salvo "Ninguno", que puede coincidir)
  const badge2 = pick(BADGES.filter((b) => b === BADGES[0] || b !== badge1));
  return {
    genero: pick(GENEROS),
    edad: pick(EDADES),
    etnia: pick(ETNIAS),
    profesion: pick(PROFESIONES),
    estilo: pick(ESTILOS),
    emocion: pick(EMOCIONES),
    mirada: pick(MIRADAS),
    gesto: pick(GESTOS),
    fondo: pick(FONDOS),
    marco: pick(MARCOS),
    badge1,
    badge2,
  };
}

// Cuerpo de la petición a /api/chat a partir del estado del formulario
function buildPayload(f: FormState, error: string, isFluxMode: boolean) {
  // Los atributos del personaje se concatenan en un único campo para la API
  const personaje = [
    f.genero,
    f.edad,
    f.etnia,
    `profesión: ${f.profesion}`,
    `vestimenta: ${f.estilo}`,
    `emoción: ${f.emocion}`,
    `mirada: ${f.mirada}`,
  ].join(", ");

  // Marca + modelo, sin repetir la marca si ya la escribieron
  const modelo = f.modelo.trim();
  const modeloCompleto = modelo.toLowerCase().startsWith(f.marca.toLowerCase())
    ? modelo
    : `${f.marca} ${modelo}`.trim();

  return {
    modelo: modeloCompleto,
    error,
    personaje,
    gesto: f.gesto,
    fondo: f.fondo,
    marco: f.marco,
    idioma: f.idioma,
    badge1: f.badge1,
    badge2: f.badge2,
    isFluxMode,
  };
}

async function requestPrompt(payload: ReturnType<typeof buildPayload>) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || "Error al generar el prompt");
  return text;
}

// El modo FLUX está oculto en la interfaz; poner en true para volver a mostrar el interruptor
const SHOW_FLUX_TOGGLE = false;

const MAX_BATCH = 50;
const BATCH_CONCURRENCY = 3;

export default function Home() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFluxMode, setIsFluxMode] = useState(false);
  // Prompts generados, acumulados para descargar como lote (.txt)
  const [batch, setBatch] = useState<string[]>([]);
  const [batchCount, setBatchCount] = useState("10");
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const busy = loading || batchProgress !== null;
  const update = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Aleatoriza únicamente el campo indicado, sin tocar el resto del formulario
  function randomizeSingleField(fieldName: SelectKey) {
    if (!RANDOMIZABLE.has(fieldName)) return;
    const options = SELECT_FIELDS.find((f) => f.key === fieldName)!.options;
    const other = fieldName === "badge1" ? "badge2" : fieldName === "badge2" ? "badge1" : null;
    // Se evita repetir el valor actual (para que el cambio sea visible) y, en badges,
    // la misma insignia del otro menú (salvo "Ninguno")
    const candidates = options.filter(
      (o) =>
        o !== form[fieldName] &&
        !(other && o !== BADGES[0] && o === form[other]),
    );
    const pool = candidates.length ? candidates : options;
    const value = pool[Math.floor(Math.random() * pool.length)];
    setForm((f) => ({ ...f, [fieldName]: value }));
  }

  // Aleatoriza solo la apariencia/escena. NO toca marca, modelo, error (ni errorOtro) ni idioma.
  function handleRandomize() {
    setForm((f) => ({ ...f, ...randomAppearance() }));
  }

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
      const text = await requestPrompt(buildPayload(form, error, isFluxMode));
      setResult(text);
      setBatch((b) => [...b, text]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  // Genera N prompts con marca, modelo, error e idioma fijos y el resto de campos al azar
  async function generateRandomBatch() {
    const error = form.error === OTRO ? form.errorOtro.trim() : form.error;
    if (!error) {
      toast.error("Escribe el error en el campo OTRO");
      return;
    }
    if (!form.modelo.trim()) {
      toast.error("Escribe el modelo de la impresora");
      return;
    }
    const total = Math.floor(Number(batchCount));
    if (!Number.isFinite(total) || total < 1 || total > MAX_BATCH) {
      toast.error(`La cantidad debe estar entre 1 y ${MAX_BATCH}`);
      return;
    }

    setBatchProgress({ done: 0, total });
    const results: (string | null)[] = new Array(total).fill(null);
    let next = 0;
    let done = 0;
    let firstError = "";

    // Pocos pedidos en paralelo para no saturar la API de Gemini
    const worker = async () => {
      while (next < total) {
        const i = next++;
        // Un reintento por prompt si la API falla o tarda demasiado
        for (let attempt = 1; attempt <= 2 && results[i] === null; attempt++) {
          try {
            results[i] = await requestPrompt(
              buildPayload({ ...form, ...randomAppearance() }, error, isFluxMode),
            );
          } catch (err) {
            if (!firstError) firstError = err instanceof Error ? err.message : "Error inesperado";
          }
        }
        done++;
        setBatchProgress({ done, total });
      }
    };
    await Promise.all(Array.from({ length: Math.min(BATCH_CONCURRENCY, total) }, worker));

    const ok = results.filter((r): r is string => r !== null);
    if (ok.length) {
      setBatch((b) => [...b, ...ok]);
      setResult(ok[ok.length - 1]);
    }
    setBatchProgress(null);
    if (!ok.length) toast.error(firstError || "No se pudo generar el lote");
    else if (ok.length < total)
      toast.warning(`Lote parcial: ${ok.length} de ${total} prompts (${firstError})`);
    else toast.success(`Lote listo: ${ok.length} prompts. Pulsa "Descargar Lote (.txt)".`);
  }

  // Una línea por prompt (Automatic1111 lee una imagen por línea): sin saltos internos
  // y con un salto de línea al final de cada uno
  function downloadBatch() {
    if (!batch.length) return;
    const content = batch
      .map((p) => p.replace(/\s*\n+\s*/g, " ").trim())
      .filter(Boolean)
      .map((p) => `${p}\n`)
      .join("");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompts-lote-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Lote descargado (${batch.length} prompts)`);
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
      <div className="flex items-center gap-1">
        <Label htmlFor={key}>{label}</Label>
        {RANDOMIZABLE.has(key) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground"
            aria-label={`Aleatorizar ${label}`}
            title={`Aleatorizar ${label}`}
            onClick={() => randomizeSingleField(key)}
            disabled={busy}
          >
            <Shuffle className="size-3.5" />
          </Button>
        )}
      </div>
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
          Plantillas para el servicio de reset remoto asistido de impresoras, listas para Google Gemini (Imagen 3).
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plantilla de miniatura</CardTitle>
            <CardDescription>
              Escribe el modelo; elige el resto en los menús.
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
                    "gesto",
                    "fondo",
                    "marco",
                    "idioma",
                    "badge1",
                    "badge2",
                  ] as SelectKey[]
                ).map((k) => renderSelect(select(k)))}
              </div>
              {SHOW_FLUX_TOGGLE && (
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="isFluxMode" className="leading-tight">
                    Modo FLUX (Optimizado para lotes)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Prompt en una sola línea, textos entre comillas dobles y sin etiquetas sueltas.
                  </p>
                </div>
                <Switch
                  id="isFluxMode"
                  checked={isFluxMode}
                  onCheckedChange={setIsFluxMode}
                />
              </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="sm:w-auto"
                  onClick={handleRandomize}
                  disabled={busy}
                >
                  <Dices className="size-4" />
                  Generar al Azar
                </Button>
                <Button type="submit" className="flex-1" disabled={busy}>
                  {loading ? "Generando..." : "Generar prompt"}
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <Label htmlFor="batchCount">Lote al azar</Label>
                <p className="text-xs text-muted-foreground">
                  Mantiene Marca, Modelo, Error e Idioma y varía el resto de campos en cada prompt.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="batchCount"
                    type="number"
                    min={1}
                    max={MAX_BATCH}
                    value={batchCount}
                    onChange={(e) => setBatchCount(e.target.value)}
                    className="sm:w-28"
                    disabled={busy}
                    aria-label="Cantidad de prompts del lote"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={generateRandomBatch}
                    disabled={busy}
                  >
                    <Dices className="size-4" />
                    {batchProgress
                      ? `Generando ${batchProgress.done}/${batchProgress.total}...`
                      : "Generar lote al azar"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompt generado</CardTitle>
            <CardDescription>Listo para pegar en Google Gemini.</CardDescription>
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1"
                onClick={downloadBatch}
                disabled={!batch.length}
              >
                <Download className="size-4" />
                Descargar Lote (.txt) ({batch.length})
              </Button>
              <Button
                variant="ghost"
                onClick={() => setBatch([])}
                disabled={!batch.length}
              >
                <Trash2 className="size-4" />
                Vaciar lote
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
