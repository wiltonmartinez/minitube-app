"use client";

import { Dices, Download, FileArchive, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { COMMIT, VERSION } from "@/lib/changelog";
import { CatalogEditor } from "@/components/catalog-editor";
import { GuionEscenario } from "@/components/guion-escenario";
import { nombresLote, type LoteItem } from "@/lib/lote";
import { urlAPng } from "@/lib/imagen-cliente";
import { useCatalogo } from "@/lib/use-catalogo";
import { ListsEditor } from "@/components/lists-editor";
import { useListas } from "@/lib/use-listas";
import { aplicarTodoAlAzar, sorteoRespetandoBloqueos } from "@/lib/azar";
import { ARQUETIPOS_ALTA, PLANO_ALTA, PROFESIONES_ALTA } from "@/lib/prioridad";
import {
  ALEATORIO,
  CAMPOS_FORMA,
  MODOS_ROSTRO,
  NOMBRE_LISTA,
  SELECCION_INICIAL,
  avisosCoherencia,
  nivelPlano,
  opcionesMenu,
  resolverPersonaje,
  type CampoLista,
  type ModoRostro,
  type Seleccion,
} from "@/lib/rostro";
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
import {
  ACCESORIOS,
  ACCESORIO_ALEATORIO,
  ARQUETIPO_NINGUNO,
  ARQUETIPO_ALEATORIO,
  ARQUETIPOS,
  ARQUETIPOS_LISTA,
  resolverArquetipo,
  sorteoArquetipoDistinto,
  cerebroPostura,
  posturaDe,
  POSTURA_ACCESORIO,
  POSTURA_IMPRESORA,
  POSTURA_ESCRIBIENDO,
  accesorioDePostura,
  POSTURA_ALEATORIA,
  POSTURA_CABEZA,
  POSTURA_OPCIONES,
  ACCESORIO_NINGUNO,
  ACCESORIOS_MANO,
  DISPOSITIVOS,
  DISPOSITIVO_NINGUNO,
  EDAD_ANIOS_MAX,
  EDAD_ANIOS_MIN,
  edadExacta,
  esPerfilTecnico,
  posturaDispositivo,
  rangoDeEdad,
  BADGES,
  BADGES_REALES,
  BADGE_ALEATORIO,
  EDADES,
  ETNIAS,
  GAFAS_ALEATORIAS,
  GAFAS_ESTILOS,
  GAFAS_OPCIONES,
  GENEROS,
  IDIOMAS,
  MARCOS,
  MIRADA_ES,
  PALETAS_FIJAS,
  PALETAS_OPCIONES,
  PALETA_ALEATORIA,
  PLANOS,
  generatePrompt,
  resolverAccesorio,
  resolverBadge,
  resolverGafas,
  resolverPaleta,
  type GeneratedPrompt,
  type PromptInput,
  type Idioma,
  type Profesion,
} from "@/lib/prompt-config";

const MODOS_PERSONAJE = ["Arquetipo listo", "Personalizar"] as const;

type FormState = {
  // Cámara: fondo con plotters de gran formato (prioridad alta)
  plotter: boolean;
  // Bloque 2
  genero: (typeof GENEROS)[number];
  edad: (typeof EDADES)[number];
  /** Edad exacta en años (opcional): manda sobre el rango de edad */
  edadAnios: string;
  /** Smartphone, PC / Laptop o Tablet: fija la postura de las dos manos */
  dispositivo: string;
  etnia: (typeof ETNIAS)[number];
  gafas: string;
  accesorio: string;
  modoPersonaje: (typeof MODOS_PERSONAJE)[number];
  modoRostro: ModoRostro;
  pers: Seleccion;
  arquetipo: string;
  // Bloque 3 (solo el gatillo; el resto se deriva de PERFILES)
  profesion: Profesion;
  // Bloque 4
  marco: string;
  plano: string;
  idioma: Idioma;
  badge: string;
  paleta: string;
};

const INITIAL: FormState = {
  plotter: false,
  genero: GENEROS[0],
  edad: EDADES[0],
  edadAnios: "",
  dispositivo: DISPOSITIVO_NINGUNO,
  etnia: ETNIAS[0],
  gafas: GAFAS_OPCIONES[0],
  accesorio: ACCESORIO_ALEATORIO,
  modoPersonaje: MODOS_PERSONAJE[1], // «Personalizar»: el arquetipo físico queda oculto
  modoRostro: MODOS_ROSTRO[0],
  pers: SELECCION_INICIAL,
  arquetipo: ARQUETIPO_ALEATORIO,
  profesion: "",
  marco: MARCOS[0].es,
  plano: PLANOS[0].es, // Plano Detalle por defecto
  idioma: IDIOMAS[0],
  badge: BADGES[0],
  paleta: PALETAS_OPCIONES[0],
};

// URL absoluta de las imágenes del repositorio (NEXT_PUBLIC_ASSETS_BASE_URL si se publican en otro dominio)
const baseUrl = () =>
  process.env.NEXT_PUBLIC_ASSETS_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");

const MAX_BATCH = 50;
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

// «Todo al azar»: sorteo completo de TODO salvo el bloque 1 (marca, modelo y error). Las opciones que tienen «🎲 Aleatorio»
// se ponen en Aleatorio (así se re-sortean solas); el resto recibe un valor concreto. Los candados 🔒 se respetan aparte.
function azarTotal(profesiones: readonly string[]): FormState_Azar {
  return {
    genero: pick(GENEROS),
    edad: pick(EDADES),
    etnia: pick(ETNIAS),
    profesion: pick(profesiones),
    marco: pick(MARCOS).es,
    plano: PLANOS[0].es, // siempre Plano Detalle
    idioma: pick(IDIOMAS),
    modoPersonaje: pick(MODOS_PERSONAJE),
    modoRostro: pick(MODOS_ROSTRO),
    gafas: GAFAS_ALEATORIAS,
    accesorio: ACCESORIO_ALEATORIO,
    badge: BADGE_ALEATORIO, // nunca resuelve a «Ninguno»
    paleta: PALETA_ALEATORIA,
    arquetipo: ARQUETIPO_ALEATORIO,
    pers: { ...SELECCION_INICIAL },
  };
}

type FormState_Azar = Pick<
  FormState,
  | "genero" | "edad" | "etnia" | "profesion" | "marco" | "plano" | "idioma" | "modoPersonaje" | "modoRostro"
  | "gafas" | "accesorio" | "badge" | "paleta" | "arquetipo" | "pers"
>;

function Block({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-semibold">
          <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            {step}
          </span>
          {title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function LockButton({ locked, onClick, label }: { locked: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={locked}
      aria-label={`${locked ? "Desbloquear" : "Bloquear"} ${label}`}
      title={locked ? "Bloqueado: el azar no lo cambia (clic para desbloquear)" : "Desbloqueado: el azar puede cambiarlo (clic para bloquear)"}
      className={`rounded px-1.5 text-sm leading-6 transition-colors ${locked ? "bg-primary/20" : "opacity-60 hover:opacity-100"}`}
    >
      {locked ? "🔒" : "🔓"}
    </button>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  className,
  locked,
  onToggleLock,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  className?: string;
  locked?: boolean;
  onToggleLock?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {onToggleLock && <LockButton locked={!!locked} onClick={onToggleLock} label={label} />}
      </div>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full">
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
}

function ReadOnlyField({
  id,
  label,
  value,
  locked,
  onToggleLock,
}: {
  id: string;
  label: string;
  value: string;
  locked?: boolean;
  onToggleLock?: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {onToggleLock && <LockButton locked={!!locked} onClick={onToggleLock} label={label} />}
      </div>
      <Input id={id} value={value} readOnly disabled className="disabled:opacity-80" />
    </div>
  );
}

export default function Home() {
  const { catalogo, guardar: guardarCatalogo, personalizado } = useCatalogo();
  const profesiones = useMemo(() => Object.keys(catalogo), [catalogo]);
  const { listas, modificadas, guardar: guardarLista } = useListas();
  const [mostrarEditor, setMostrarEditor] = useState(false);
  const [formBase, setForm] = useState<FormState>(INITIAL);
  // Si la profesión elegida ya no existe en el catálogo (editada/eliminada), se usa la primera
  // PRIORIDAD ALTA (interruptor «plotters» del bloque Cámara): Seedream, plano detalle, mujer joven de 20 a 30 años
  // y una profesión de gran formato. Se aplica sobre los valores efectivos; al cambiar de modelo se recuperan los elegidos.
  const alta = formBase.plotter;
  const profesionesAlta = useMemo(() => {
    const permitidas = profesiones.filter((p) => (PROFESIONES_ALTA as readonly string[]).includes(p));
    return permitidas.length ? permitidas : profesiones;
  }, [profesiones]);
  const profesionesEf = alta ? profesionesAlta : profesiones;
  const poolArq: readonly string[] = alta ? ARQUETIPOS_ALTA : ARQUETIPOS_LISTA;
  const form = useMemo(() => {
    const f = catalogo[formBase.profesion] ? formBase : { ...formBase, profesion: profesiones[0] };
    if (!alta) return { ...f, modoPersonaje: "Personalizar" as FormState["modoPersonaje"] };
    return {
      ...f,
      plano: PLANO_ALTA,
      modoPersonaje: "Arquetipo listo" as const,
      profesion: profesionesAlta.includes(f.profesion) ? f.profesion : profesionesAlta[0],
      arquetipo: f.arquetipo === ARQUETIPO_ALEATORIO || ARQUETIPOS_ALTA.includes(f.arquetipo) ? f.arquetipo : ARQUETIPO_ALEATORIO,
    };
  }, [formBase, catalogo, profesiones, alta, profesionesAlta]);

  // Resultados generados, acumulados para descargar como lote (.txt o ZIP)
  const [batch, setBatch] = useState<LoteItem[]>([]);
  const [batchCount, setBatchCount] = useState("10");
  // Resultado del último sorteo de las opciones "🎲 Aleatorio" (paleta, gafas y badge). Se vuelve a sortear
  // en cada ciclo de autogeneración provocado por un selector o un botón (cualquier cambio de menú,
  // «Generar al Azar», «Añadir al lote»), pero NO al teclear en los campos de texto (para no parpadear).
  const [sorteo, setSorteo] = useState({
    paleta: PALETAS_FIJAS[0],
    gafas: GAFAS_ESTILOS[0],
    badge: BADGES_REALES[0],
    u: 0.5, // número del sorteo del accesorio (se interpreta según el perfil vigente)
    up: 0.5, // sorteo de la personalización (rostro, cabello y cuerpo)
    ua: 0.5, // sorteo del arquetipo físico
  });
  // Candados: una variable bloqueada no cambia con el azar (ni con «Generar al Azar», ni con el lote, ni con el re-sorteo)
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const sortear = () =>
    setSorteo((s) =>
      sorteoRespetandoBloqueos(
        s,
        {
          paleta: resolverPaleta(PALETA_ALEATORIA),
          gafas: resolverGafas(GAFAS_ALEATORIAS),
          badge: resolverBadge(BADGE_ALEATORIO),
          u: Math.random(),
          up: Math.random(),
          ua: sorteoArquetipoDistinto(s.ua, poolArq.length), // nunca el mismo arquetipo dos veces seguidas
        },
        locks,
        { paleta: "paleta", gafas: "gafas", badge: "badge", u: "accesorio", ua: "arquetipo" },
      ),
    );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    sortear();
  };

  // Controlador Maestro: la profesión define (y bloquea) vestimenta, emoción, manos y fondo; la mirada va siempre clavada en el área libre inferior izquierda
  const perfil = catalogo[form.profesion];

  // Valores concretos (la opción "Aleatorio" se sustituye por el último sorteo)
  const paletaEf = form.paleta === PALETA_ALEATORIA ? sorteo.paleta : form.paleta;
  const gafasEf = form.gafas === GAFAS_ALEATORIAS ? sorteo.gafas : form.gafas;
  const badgeEf = form.badge === BADGE_ALEATORIO ? sorteo.badge : form.badge;
  const accesorioEf = resolverAccesorio(form.accesorio, form.profesion, sorteo.u);
  const modoArq = form.modoPersonaje === "Arquetipo listo";
  // Modo «Arquetipo listo»: el arquetipo lo define todo. Modo «Personalizar»: no hay arquetipo.
  const arquetipoEf = modoArq ? resolverArquetipo(form.arquetipo, sorteo.ua, poolArq) : ARQUETIPO_NINGUNO;
  const arq = ARQUETIPOS[arquetipoEf];
  // Single source of truth: con arquetipo, estos campos se DERIVAN de él; es imposible enviar contradicciones
  const generoEf = arq ? arq.genero : form.genero;
  const aniosExactos = arq ? undefined : edadExacta(form.edadAnios);
  const edadEf = arq ? arq.edad : aniosExactos ? rangoDeEdad(aniosExactos) : form.edad;
  const etniaEf = arq ? arq.etnia : form.etnia;
  const nivel = nivelPlano(form.plano);
  // Personalización concreta (modo «Personalizar»): lo elegido a mano se respeta, lo aleatorio es armónico
  const persEf = useMemo(
    () => resolverPersonaje(listas, form.pers, { genero: generoEf, edad: edadEf, etnia: etniaEf }, form.modoRostro, sorteo.up),
    [listas, form.pers, generoEf, edadEf, etniaEf, form.modoRostro, sorteo.up],
  );



  // Manos mostradas: con cable o teléfono, una mano conserva el gesto y la otra sostiene el accesorio
  const dispositivoActivo = form.dispositivo !== DISPOSITIVO_NINGUNO;
  const manosMostradas = (dispositivoActivo ? posturaDispositivo(form.dispositivo, esPerfilTecnico(form.profesion)) : null)?.manosEs ?? cerebroPostura(accesorioEf).manosEs;

  // Si se elige un par de gafas, la vestimenta del perfil no las incluye (el prompt las quita para no duplicarlas)
  const vestimenta =
    gafasEf !== GAFAS_OPCIONES[0] ? perfil.vestimenta.replace(/\s+y\s+gafas.*$/i, "") : perfil.vestimenta;

  // Autogeneración reactiva: el prompt se recalcula en cada render en que cambia CUALQUIER variable del
  // formulario (error, gafas, paleta, badge, perfil…). useMemo lo deriva sin estado extra ni render de más.
  // Entrada común del prompt de Gemini y del prompt de la API de imágenes (null si faltan datos obligatorios)
  const entrada = useMemo<PromptInput | null>(() => {
    return {
        ...form,
        marca: "",
        modelo: "",
        error: "",
        genero: generoEf,
        edad: edadEf,
        etnia: etniaEf,
        catalogo,
        paleta: paletaEf,
        gafas: gafasEf,
        badge: badgeEf,
        accesorio: accesorioEf,
        edadAnios: aniosExactos,
        dispositivo: form.dispositivo === DISPOSITIVO_NINGUNO ? undefined : form.dispositivo,
        personaje: persEf,
        listas,
        arquetipo: arquetipoEf,
        plotter: alta || undefined,
    };
  }, [form, catalogo, paletaEf, gafasEf, badgeEf, accesorioEf, persEf, listas, arquetipoEf, generoEf, edadEf, etniaEf, alta, aniosExactos]);

  // Prompt para copiar a Gemini (formato de siempre)
  const live = useMemo<GeneratedPrompt | null>(
    () => (entrada ? generatePrompt(entrada, { baseUrl: baseUrl() }) : null),
    [entrada],
  );

  // Alternar candado: al bloquear una opción «Aleatorio» se fija el valor sorteado en ese momento
  function toggleLock(key: string) {
    const bloqueando = !locks[key];
    setLocks((l) => ({ ...l, [key]: bloqueando }));
    if (!bloqueando) return;
    const fijo: Record<string, [string, string]> = {
      gafas: [GAFAS_ALEATORIAS, gafasEf],
      paleta: [PALETA_ALEATORIA, paletaEf],
      badge: [BADGE_ALEATORIO, badgeEf],
      accesorio: [ACCESORIO_ALEATORIO, accesorioEf],
      arquetipo: [ARQUETIPO_ALEATORIO, arquetipoEf],
    };
    const f = fijo[key];
    if (f && form[key as keyof FormState] === f[0]) setForm((x) => ({ ...x, [key]: f[1] }));
    // Campos del personaje («pers.forma», «pers.ojosColor»…): al bloquear «Aleatorio» se fija el valor sorteado
    if (key.startsWith("pers.")) {
      const c = key.slice(5) as CampoLista;
      if (form.pers[c] === ALEATORIO && persEf[c]) setForm((x) => ({ ...x, pers: { ...x.pers, [c]: persEf[c] } }));
    }
  }
  const lockProps = (key: string) => ({ locked: !!locks[key], onToggleLock: () => toggleLock(key) });



  // Selector de un campo del personaje (con «Aleatorio», candado y el valor sorteado debajo)
  function campoPers(campo: CampoLista, clase = "", desactivado = false) {
    const opciones = opcionesMenu(listas, campo);
    const valor = opciones.includes(form.pers[campo]) ? form.pers[campo] : ALEATORIO;
    return (
      <div key={campo} className={clase}>
        <SelectField
          id={`pers-${campo}`}
          label={NOMBRE_LISTA[campo]}
          value={valor}
          options={opciones}
          onChange={(v) => set("pers", { ...form.pers, [campo]: v })}
          disabled={desactivado}
          {...lockProps(`pers.${campo}`)}
        />
        {valor === ALEATORIO && !desactivado && persEf[campo] && (
          <p className="mt-1 text-xs text-muted-foreground">Sorteado ahora: {persEf[campo]}</p>
        )}
      </div>
    );
  }

  // «Generar al Azar»: TODO al azar; los candados 🔒 no cambian
  function randomizeFields() {
    setForm((f) => aplicarTodoAlAzar(f, azarTotal(profesionesEf), locks));
    sortear(); // re-sortea gafas, postura, arquetipo, personaje, paleta y badge que estén en «Aleatorio»
  }

  // Guarda el prompt actual en el lote descargable
  function addToBatch() {
    if (!live) return;
    setBatch((b) => [...b, live]);
    sortear(); // el siguiente prompt estrena un nuevo sorteo (si hay opciones "Aleatorio")
    toast.success(`Añadido al lote (${batch.length + 1})`);
  }

  // N prompts. TODO se sortea en cada prompt (salvo candados 🔒):
  // persona, profesión, plano, marco, idioma, gafas, postura o accesorio, paleta y badge.
  function generateRandomBatch() {
    const total = Math.floor(Number(batchCount));
    if (!Number.isFinite(total) || total < 1 || total > MAX_BATCH) {
      toast.error(`La cantidad debe estar entre 1 y ${MAX_BATCH}`);
      return;
    }
    const prompts: GeneratedPrompt[] = [];
    let uArq = sorteoArquetipoDistinto(sorteo.ua, poolArq.length);
    for (let n = 0; n < total; n++) {
      const f = aplicarTodoAlAzar(form, azarTotal(profesionesEf), locks);
      if (alta) {
        // prioridad alta: plano detalle, mujer joven (arquetipo del grupo) y profesión de gran formato, aunque haya candados
        f.plano = PLANO_ALTA;
        f.modoPersonaje = "Arquetipo listo";
        if (!profesionesAlta.includes(f.profesion)) f.profesion = profesionesAlta[0];
        if (f.arquetipo !== ARQUETIPO_ALEATORIO && !ARQUETIPOS_ALTA.includes(f.arquetipo)) f.arquetipo = ARQUETIPO_ALEATORIO;
      }
      if (!alta) f.modoPersonaje = "Personalizar";
      const aniosLote = alta ? undefined : edadExacta(form.edadAnios);
      if (aniosLote) f.edad = rangoDeEdad(aniosLote);
      const conArquetipo = f.modoPersonaje === "Arquetipo listo";
      const arquetipo = conArquetipo ? resolverArquetipo(f.arquetipo, uArq, poolArq) : ARQUETIPO_NINGUNO; // distinto del anterior
      uArq = sorteoArquetipoDistinto(uArq, poolArq.length);
      prompts.push(
        generatePrompt(
          {
            ...f,
            marca: "",
            modelo: "",
            error: "",
            catalogo,
            listas,
            paleta: resolverPaleta(f.paleta),
            gafas: resolverGafas(f.gafas),
            badge: resolverBadge(f.badge), // el lote siempre lleva un badge real
            accesorio: resolverAccesorio(f.accesorio, f.profesion), // según el perfil de ese prompt
            // Personalización armónica propia de cada prompt
            personaje: resolverPersonaje(listas, f.pers, { genero: f.genero, edad: f.edad, etnia: f.etnia }, f.modoRostro),
            arquetipo,
            plotter: alta || undefined,
            edadAnios: conArquetipo ? undefined : aniosLote,
            dispositivo: form.dispositivo === DISPOSITIVO_NINGUNO ? undefined : form.dispositivo,
          },
          { baseUrl: baseUrl() },
        ),
      );
    }
    setBatch((b) => [...b, ...prompts]);
    toast.success(`Lote listo: ${prompts.length} prompts`);
  }

  function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Una línea por prompt (Automatic1111 lee una imagen por línea): sin saltos internos
  // y con un salto de línea al final de cada uno
  function downloadBatch() {
    if (!batch.length) return;
    const content = batch
      .map((g) => g.promptText.replace(/\s*\n+\s*/g, " ").trim())
      .filter(Boolean)
      .map((p) => `${p}\n`)
      .join("");
    saveBlob(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
      `prompts-lote-${new Date().toISOString().slice(0, 10)}.txt`,
    );
    toast.success(`Lote descargado (${batch.length} prompts)`);
  }

  // ZIP con un archivo .txt por prompt (prompt-01.txt, prompt-02.txt, ...)
  async function downloadZip() {
    const items = batch.filter((g) => g.promptText.trim());
    if (!items.length) return;
    try {
      // Se carga solo al usarlo para no aumentar el peso inicial de la página
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const nombres = nombresLote(items);
      let imagenes = 0;
      let sinCopiar = 0;
      const manifest = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const n = nombres[i];
        zip.file(n.txt, `${it.promptText.trim()}
`);
        if (n.api) zip.file(n.api, `${it.promptApi}
`);
        // Imagen generada: se convierte a PNG; si el navegador no deja copiarla, queda solo su dirección en el manifest
        let imagen: string | null = null;
        if (n.imagen && it.imagenUrl) {
          try {
            zip.file(n.imagen, await urlAPng(it.imagenUrl));
            imagen = n.imagen;
            imagenes++;
          } catch {
            sinCopiar++;
          }
        }
        // Qué imagen de error corresponde a cada prompt (y qué imagen generada, si la hay)
        manifest.push({
          file: n.txt,
          apiPromptFile: n.api ?? null,
          etiqueta: it.etiqueta ?? null,
          errorImageUrl: it.errorImageUrl,
          imagen,
          imagenUrl: imagen ? null : it.imagenUrl?.startsWith("https://") ? it.imagenUrl : null,
        });
      }
      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      saveBlob(blob, `prompts-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success(`ZIP descargado (${items.length} prompts${imagenes ? ` + ${imagenes} imágenes` : ""} + manifest.json)`);
      if (sinCopiar) toast.message(`${sinCopiar} imagen(es) no se pudieron copiar al ZIP: su dirección quedó en manifest.json`);
    } catch {
      toast.error("No se pudo crear el ZIP");
    }
  }

  async function copy() {
    if (!live) return;
    try {
      await navigator.clipboard.writeText(live.promptText);
    } catch {
      // Respaldo para contextos sin permiso/foco del Clipboard API
      const ta = document.createElement("textarea");
      ta.value = live.promptText;
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

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Generador de prompts para miniaturas de YouTube
        </h1>
        <p className="mt-2 text-muted-foreground">
          Servicio de reset remoto asistido de impresoras: prompts fotográficos hiperrealistas y coherentes.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          <Link href="/cambios" className="underline-offset-2 hover:underline">
            v{VERSION} · {COMMIT} · ver cambios
          </Link>
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plantilla de miniatura</CardTitle>
            <CardDescription>
              La imagen es solo la persona y el fondo, sin texto. Todo es manual: elige los campos, copia el prompt y pégalo en Gemini o ChatGPT.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setMostrarEditor((v) => !v)}>
                {mostrarEditor ? "Cerrar editor de menús" : "⚙ Editar menús del panel maestro"}
              </Button>
              {mostrarEditor && (
                <>
                  <CatalogEditor catalogo={catalogo} personalizado={personalizado} onChange={guardarCatalogo} />
                  <ListsEditor listas={listas} modificadas={modificadas} onGuardar={guardarLista} />
                </>
              )}
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <Block
                step={1}
                title="Perfil demográfico"
                description="Quién aparece en la miniatura."
              >
                {modoArq ? (
                  <p className="text-xs text-muted-foreground md:col-span-2">
                    Prioridad alta (plotters): la persona es una mujer joven de 20 a 30 años; el género y la edad quedan fijados.
                  </p>
                ) : (
                  <>
                    <SelectField
                      id="genero"
                      label="Género"
                      value={form.genero}
                      options={GENEROS}
                      onChange={(v) => set("genero", v as FormState["genero"])}
                      {...lockProps("genero")}
                    />
                    <SelectField
                      id="edad"
                      label="Edad"
                      value={form.edad}
                      options={EDADES}
                      onChange={(v) => set("edad", v as FormState["edad"])}
                      disabled={!!aniosExactos}
                      {...lockProps("edad")}
                    />
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="edadAnios">Edad exacta en años (opcional)</Label>
                      <Input
                        id="edadAnios"
                        type="number"
                        inputMode="numeric"
                        min={EDAD_ANIOS_MIN}
                        max={EDAD_ANIOS_MAX}
                        placeholder="Ej: 42"
                        value={form.edadAnios}
                        onChange={(e) => set("edadAnios", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {form.edadAnios.trim() && !aniosExactos
                          ? `Escribe un número entero entre ${EDAD_ANIOS_MIN} y ${EDAD_ANIOS_MAX}.`
                          : aniosExactos
                            ? `El prompt dirá «aged ${aniosExactos}» y el rango de edad queda desactivado: una edad exacta da rostros reales, no modelos de stock.`
                            : "Vacío = se usa el rango de edad de arriba."}
                      </p>
                    </div>
                    <SelectField
                      id="etnia"
                      label="Etnia"
                      value={form.etnia}
                      options={ETNIAS}
                      onChange={(v) => set("etnia", v as FormState["etnia"])}
                      className="md:col-span-2"
                      {...lockProps("etnia")}
                    />
                    <SelectField
                      id="modoRostro"
                      label="Rostro"
                      value={form.modoRostro}
                      options={MODOS_ROSTRO}
                      onChange={(v) => set("modoRostro", v as ModoRostro)}
                      className="md:col-span-2"
                      {...lockProps("modoRostro")}
                    />
                    {form.modoRostro === "Estilo predefinido" ? (
                      <>
                        {campoPers("estilo", "md:col-span-2")}
                        <p className="-mt-2 text-xs text-muted-foreground md:col-span-2">
                          El estilo rellena forma, ojos, cejas, nariz y labios automáticamente.
                        </p>
                        {CAMPOS_FORMA.map((c) => (
                          <ReadOnlyField key={c} id={`ro-${c}`} label={NOMBRE_LISTA[c]} value={persEf[c]} />
                        ))}
                      </>
                    ) : (
                      CAMPOS_FORMA.map((c) => campoPers(c))
                    )}
                    {campoPers("ojosColor")}
                    {campoPers("cabelloColor")}
                    {campoPers("cabelloTipo")}
                    {campoPers("cabelloLargo")}
                    {generoEf !== "Mujer" && campoPers("vello")}
                    {campoPers("complexion", "", nivel !== "medio")}
                    {campoPers("hombros", "", nivel === "detalle")}
                    {nivel !== "medio" && (
                      <p className="-mt-2 text-xs text-muted-foreground md:col-span-2">
                        {nivel === "detalle"
                          ? "Plano detalle: solo rostro y manos, el cuerpo está desactivado."
                          : "Primer plano: cabeza, cuello y hombros; la complexión está desactivada."}
                      </p>
                    )}
                    {avisosCoherencia(listas, persEf, { genero: generoEf, edad: edadEf, etnia: etniaEf }).map((aviso) => (
                      <p key={aviso} className="text-xs text-amber-500 md:col-span-2">
                        Aviso: {aviso}
                      </p>
                    ))}
                  </>
                )}
                <SelectField
                  id="gafas"
                  label="Gafas"
                  value={form.gafas}
                  options={GAFAS_OPCIONES}
                  onChange={(v) => set("gafas", v)}
                  className="md:col-span-2"
                  {...lockProps("gafas")}
                />
                <p className="-mt-2 text-xs text-muted-foreground md:col-span-2">
                  De pasta gruesa (estilo vidIQ): azules, rojas, amarillas, verde gamer o retro. Elegantes de montura metálica fina:
                  doradas o plateadas.
                </p>
                {form.gafas === GAFAS_ALEATORIAS && (
                  <p className="-mt-2 text-xs text-muted-foreground md:col-span-2">
                    Sorteadas ahora: {gafasEf}. Se sortean de nuevo en cada cambio de menú (puede salir «Ninguna»).
                  </p>
                )}
                <SelectField
                  id="dispositivo"
                  label="Dispositivo"
                  value={form.dispositivo}
                  options={[DISPOSITIVO_NINGUNO, ...DISPOSITIVOS]}
                  onChange={(v) => set("dispositivo", v)}
                  className="md:col-span-2"
                />
                <p className="-mt-2 text-xs text-muted-foreground md:col-span-2">
                  {form.dispositivo === "Smartphone" && "Smartphone: la mano derecha sostiene el teléfono; la izquierda va a la sien o a la cabeza, o abierta en el aire (desconcierto)."}
                  {form.dispositivo === "PC / Laptop" &&
                    (esPerfilTecnico(form.profesion)
                      ? "PC / Laptop (perfil técnico): la mano derecha en el ratón; la izquierda con el pulgar arriba o señalando la pantalla (encontró la solución)."
                      : "PC / Laptop: la mano derecha en el ratón; la izquierda agarrándose la cara o la boca (frustración).")}
                  {form.dispositivo === "Tablet" && "Tablet: la mano izquierda sostiene la tablet; la derecha queda suspendida a medio camino o en la cabeza."}
                  {!dispositivoActivo && "Ninguno: la postura de las manos se elige abajo. Con un dispositivo, la postura y el accesorio de abajo se desactivan."}
                </p>
                <SelectField
                  id="postura"
                  label="Postura de las manos"
                  value={posturaDe(form.accesorio)}
                  options={POSTURA_OPCIONES}
                  onChange={(v) => set("accesorio", accesorioDePostura(v, form.accesorio))}
                  disabled={dispositivoActivo}
                  className="md:col-span-2"
                  {...lockProps("accesorio")}
                />
                <SelectField
                  id="accesorio"
                  label="Accesorio en la mano"
                  value={posturaDe(form.accesorio) === POSTURA_ACCESORIO ? form.accesorio : ACCESORIOS_MANO.includes(accesorioEf) ? accesorioEf : ACCESORIO_NINGUNO}
                  options={[ACCESORIO_NINGUNO, ...ACCESORIOS_MANO]}
                  onChange={(v) => v !== ACCESORIO_NINGUNO && set("accesorio", v)}
                  disabled={dispositivoActivo || posturaDe(form.accesorio) !== POSTURA_ACCESORIO}
                  className="md:col-span-2"
                />
                <p className="-mt-2 text-xs text-muted-foreground md:col-span-2">
                  {posturaDe(form.accesorio) === POSTURA_CABEZA &&
                    "Manos a la cabeza: las dos manos van a los lados de la cabeza; el accesorio queda forzado a «Ninguno» y bloqueado."}
                  {posturaDe(form.accesorio) === POSTURA_IMPRESORA &&
                    "Las dos manos tocan la misma impresora del modelo seleccionado (sobre la mesa, lejos de las esquinas inferiores); el accesorio queda forzado a «Ninguno» y bloqueado."}
                  {posturaDe(form.accesorio) === POSTURA_ESCRIBIENDO &&
                    "Las dos manos escriben en una laptop abierta sobre la mesa (lejos de las esquinas inferiores); el personaje mira al vacío, no al teclado. El accesorio queda forzado a «Ninguno» y bloqueado."}
                  {posturaDe(form.accesorio) === POSTURA_ALEATORIA &&
                    `Sorteado ahora (${form.profesion}): ${ACCESORIOS[accesorioEf].corto}. La postura de ambas manos se decide automáticamente.`}
                  {posturaDe(form.accesorio) === POSTURA_ACCESORIO &&
                    "Una mano sostiene el accesorio y la otra descansa o gesticula; tocarse la cabeza o la cara está prohibido."}
                </p>
              </Block>

              <Block
                step={2}
                title="Controlador maestro"
                description="Elige la profesión: vestimenta, emoción, manos y fondo se autocompletan y se bloquean. La mirada siempre va clavada en el centro del área libre inferior izquierda."
              >
                <SelectField
                  id="profesion"
                  label="Profesión"
                  value={form.profesion}
                  options={profesionesEf}
                  onChange={(v) => set("profesion", v as Profesion)}
                  className="md:col-span-2"
                  {...lockProps("profesion")}
                />
                <ReadOnlyField id="vestimenta" label="Vestimenta" value={vestimenta} {...lockProps("profesion")} />
                <ReadOnlyField id="emocion" label="Emociones" value={perfil.emocion} {...lockProps("profesion")} />
                <ReadOnlyField id="mirada" label="Mirada" value={MIRADA_ES} />
                <ReadOnlyField id="manos" label="Manos (según accesorio)" value={manosMostradas} />
                <div className="md:col-span-2">
                  <ReadOnlyField id="fondo" label="Fondo estructural" value={perfil.fondo} {...lockProps("profesion")} />
                </div>
              </Block>

              <Block
                step={3}
                title="Cámara"
                description="Plano fijo: Plano Detalle (Extreme Close-Up). La imagen se crea solo con el fondo: sin texto, sin badges 3D y sin marco."
              >
                <div className="flex items-start gap-3 rounded-md border p-3 md:col-span-2">
                  <Switch id="plotter" checked={form.plotter} onCheckedChange={(v) => set("plotter", v)} />
                  <div className="space-y-1">
                    <Label htmlFor="plotter">Fondo con plotters de gran formato</Label>
                    <p className="text-xs text-muted-foreground">
                      Para videos de plotters (F570, F571, T3170…): persona joven de gran formato y plotters al fondo. Apagado, el fondo lleva impresoras normales.
                    </p>
                  </div>
                </div>
              </Block>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="sm:w-auto"
                  onClick={randomizeFields}
                >
                  <Dices className="size-4" />
                  Generar al Azar
                </Button>
                <Button type="button" className="flex-1" onClick={addToBatch} disabled={!live}>
                  Añadir al lote
                </Button>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">
                El prompt se actualiza solo al cambiar cualquier campo. «Generar al Azar» sortea TODO
                (persona, profesión, plano, gafas y postura); los campos con candado 🔒 no cambian.
                «Añadir al lote» guarda el prompt actual para descargarlo.
              </p>

              <div className="space-y-2 rounded-lg border p-3">
                <Label htmlFor="batchCount">Lote al azar</Label>
                <p className="text-xs text-muted-foreground">
                  Todo se sortea en cada prompt (persona, profesión, plano, gafas y postura), salvo los campos con candado 🔒.
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
                    aria-label="Cantidad de prompts del lote"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={generateRandomBatch}
                  >
                    <Dices className="size-4" />
                    Generar lote al azar
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompt generado</CardTitle>
            <CardDescription>
              Se actualiza automáticamente con cada cambio. Listo para pegar en Google Gemini.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              readOnly
              value={live?.promptText ?? ""}
              placeholder="Escribe el modelo de la impresora (y el error, si eliges «Otro») y el prompt aparecerá aquí al instante..."
              className="min-h-[320px] font-mono text-sm"
            />
            <Button variant="secondary" className="w-full" onClick={copy} disabled={!live}>
              Copiar al portapapeles
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
                variant="outline"
                className="flex-1"
                onClick={downloadZip}
                disabled={!batch.length}
              >
                <FileArchive className="size-4" />
                Descargar ZIP (.txt)
              </Button>
              <Button variant="ghost" onClick={() => setBatch([])} disabled={!batch.length}>
                <Trash2 className="size-4" />
                Vaciar lote
              </Button>
            </div>
            <GuionEscenario
              plotter={alta}
              profesion={form.profesion}
              fondo={perfil?.fondo}
              genero={arq ? undefined : generoEf}
              edadAnios={aniosExactos}
              dispositivo={dispositivoActivo ? form.dispositivo : undefined}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
