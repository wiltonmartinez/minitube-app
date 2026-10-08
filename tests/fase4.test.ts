import { afterEach, describe, expect, it, vi } from "vitest";

const subir = vi.fn();
vi.mock("@fal-ai/client", () => ({ fal: { config: vi.fn(), storage: { upload: (...a: unknown[]) => subir(...a) } } }));

import { POST } from "@/app/api/generate/route";
import { escribirLista, leerLista, type AlmacenLike } from "@/lib/almacen";
import { esItemHistorial, esReferenciaGuardada, type ItemHistorial } from "@/lib/historial";
import { MAX_REFERENCIAS, MODELOS, buscarModelo } from "@/lib/image-models";
import { ARQUETIPOS, BADGES_REALES, PERFILES, buildApiPrompt, type PromptInput } from "@/lib/prompt-config";

const base = (extra: Partial<PromptInput> = {}): PromptInput => ({
  marca: "Epson",
  modelo: "L3110",
  error: "Error 0x97",
  genero: "Mujer",
  edad: "Joven 18-25",
  etnia: "Afro-Latina",
  profesion: Object.keys(PERFILES)[0],
  marco: "Marco de neón fino rojo y azul",
  plano: "Plano Medio (Medium Shot)",
  idioma: "Inglés",
  badge: BADGES_REALES.find((b) => !b.includes("%"))!,
  gafas: "Ninguna",
  accesorio: "Teléfono celular",
  paleta: "Alerta Clásica (Amarillo / Rojo)",
  arquetipo: Object.keys(ARQUETIPOS).find((n) => ARQUETIPOS[n].etnia === "Medio Oriente/Árabe")!,
  ...extra,
});

// Un JPEG diminuto válido para las pruebas (solo importa el formato del data URI)
const foto = (bytes = 200) => `data:image/jpeg;base64,${Buffer.alloc(bytes, 7).toString("base64")}`;
const pedir = (cuerpo: unknown) => new Request("http://localhost/api/generate", { method: "POST", body: JSON.stringify(cuerpo) });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  subir.mockReset();
});

/* Almacén falso con cupo máximo, para simular el localStorage lleno */
function almacenFalso(cupo = Infinity) {
  const datos = new Map<string, string>();
  const a: AlmacenLike = {
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => {
      if (v.length > cupo) throw new Error("QuotaExceededError");
      datos.set(k, v);
    },
    removeItem: (k) => void datos.delete(k),
  };
  return { a, datos };
}

describe("Fase 4 · almacenamiento local seguro", () => {
  const esNum = (x: unknown): x is number => typeof x === "number";

  it("lee con seguridad: datos dañados o ajenos devuelven lista vacía o filtrada", () => {
    const { a } = almacenFalso();
    expect(leerLista(a, "k", esNum)).toEqual([]);
    a.setItem("k", "{no es json");
    expect(leerLista(a, "k", esNum)).toEqual([]);
    a.setItem("k", JSON.stringify([1, "x", 2, null]));
    expect(leerLista(a, "k", esNum)).toEqual([1, 2]);
    expect(leerLista(null, "k", esNum)).toEqual([]);
    const roto: AlmacenLike = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => {}, removeItem: () => {} };
    expect(leerLista(roto, "k", esNum)).toEqual([]);
  });
  it("respeta el máximo y conserva lo más nuevo", () => {
    const { a } = almacenFalso();
    expect(escribirLista(a, "k", [5, 4, 3, 2, 1], 3)).toEqual([5, 4, 3]);
    expect(leerLista(a, "k", esNum)).toEqual([5, 4, 3]);
  });
  it("si el navegador se llena, descarta los más antiguos y nunca lanza", () => {
    const { a } = almacenFalso(20);
    const guardados = escribirLista(a, "k", [111111, 222222, 333333, 444444, 555555], 10);
    expect(guardados.length).toBeLessThan(5);
    expect(guardados[0]).toBe(111111); // lo más nuevo se conserva
    expect(JSON.stringify(guardados).length).toBeLessThanOrEqual(20);
    const nada = almacenFalso(1);
    expect(escribirLista(nada.a, "k", [1000000], 5)).toEqual([]);
    const sinAlmacen = escribirLista(null, "k", [1, 2, 3], 2);
    expect(sinAlmacen).toEqual([1, 2]);
  });
  it("valida los elementos del historial y de las referencias guardadas", () => {
    const ok: ItemHistorial = { id: "a", fecha: "2026-10-08", modelo: "FLUX.2 Pro", texto3d: false, simulacion: false, url: "https://v3.fal.media/x.png" };
    expect(esItemHistorial(ok)).toBe(true);
    expect(esItemHistorial({ ...ok, url: "http://inseguro/x.png" })).toBe(false);
    expect(esItemHistorial({ ...ok, url: undefined })).toBe(false); // sin miniatura ni URL no sirve
    expect(esItemHistorial({ ...ok, url: undefined, thumb: foto(100) })).toBe(true);
    expect(esItemHistorial({ ...ok, thumb: `data:image/jpeg;base64,${"A".repeat(250_000)}` })).toBe(false); // nada pesado
    expect(esItemHistorial(null)).toBe(false);
    expect(esReferenciaGuardada({ id: "r", nombre: "Ref", imagen: foto(100) })).toBe(true);
    expect(esReferenciaGuardada({ id: "r", nombre: "Ref", imagen: "https://x/y.jpg" })).toBe(false);
  });
});

describe("Fase 4 · modelos con referencias", () => {
  it("solo Nano Banana Pro y FLUX.2 Pro admiten referencias, con sus endpoints «edit»", () => {
    const con = MODELOS.filter((m) => m.endpointRef).map((m) => [m.id, m.endpointRef]);
    expect(con).toEqual([
      ["nano-banana-pro", "fal-ai/nano-banana-pro/edit"],
      ["flux-2-pro", "fal-ai/flux-2-pro/edit"],
    ]);
    for (const id of ["nano-banana-pro", "flux-2-pro"] as const) {
      const e = buscarModelo(id)!.entradaRef!("hola", ["https://a/1.jpg", "https://a/2.jpg"]);
      expect(e.prompt).toBe("hola");
      expect(e.image_urls).toEqual(["https://a/1.jpg", "https://a/2.jpg"]);
    }
    expect(MAX_REFERENCIAS).toBe(4);
  });
});

describe("Fase 4 · ruta con fotos de referencia", () => {
  it("simulación: acepta las fotos y no llama a fal.ai", async () => {
    vi.stubEnv("FAL_KEY", "");
    const espia = vi.fn();
    vi.stubGlobal("fetch", espia);
    const res = await POST(pedir({ prompt: "p", modelo: "nano-banana-pro", imagenesReferencia: [foto(), foto()] }));
    const j = await res.json();
    expect(j.simulacion).toBe(true);
    expect(decodeURIComponent(j.imagenUrl)).toContain("2 referencia(s)");
    expect(espia).not.toHaveBeenCalled();
    expect(subir).not.toHaveBeenCalled();
  });
  it("rechaza modelos sin soporte, fotos inválidas, demasiadas fotos y fotos pesadas", async () => {
    vi.stubEnv("FAL_KEY", "");
    const r = async (cuerpo: unknown) => (await POST(pedir(cuerpo))).status;
    expect(await r({ prompt: "p", modelo: "gpt-image-2", imagenesReferencia: [foto()] })).toBe(400);
    expect(await r({ prompt: "p", modelo: "seedream-5-pro", imagenesReferencia: [foto()] })).toBe(400);
    expect(await r({ prompt: "p", modelo: "flux-2-pro", imagenesReferencia: ["https://x/y.jpg"] })).toBe(400);
    expect(await r({ prompt: "p", modelo: "flux-2-pro", imagenesReferencia: ["data:text/html;base64,AAAA"] })).toBe(400);
    expect(await r({ prompt: "p", modelo: "flux-2-pro", imagenesReferencia: "no-es-lista" })).toBe(400);
    expect(await r({ prompt: "p", modelo: "flux-2-pro", imagenesReferencia: Array(5).fill(foto()) })).toBe(400);
    expect(await r({ prompt: "p", modelo: "flux-2-pro", imagenesReferencia: [foto(1_600_000)] })).toBe(400);
    expect(await r({ prompt: "p", modelo: "flux-2-pro", imagenesReferencia: [foto(1_400_000), foto(1_400_000), foto(1_400_000)] })).toBe(400);
    expect(await r({ prompt: "p", modelo: "flux-2-pro", imagenesReferencia: [] })).toBe(200); // sin fotos = generación normal
  });
  it("con FAL_KEY: sube las fotos y usa el endpoint «edit» con las URLs subidas", async () => {
    vi.stubEnv("FAL_KEY", "clave-secreta");
    subir.mockResolvedValueOnce("https://v3.fal.media/files/a.jpg").mockResolvedValueOnce("https://v3.fal.media/files/b.jpg");
    const fetchFalso = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status_url: "https://queue.fal.run/x/requests/1/status", response_url: "https://queue.fal.run/x/requests/1" })),
    );
    vi.stubGlobal("fetch", fetchFalso);
    const res = await POST(pedir({ prompt: "hola", modelo: "nano-banana-pro", imagenesReferencia: [foto(), foto()] }));
    const j = await res.json();
    expect(j.estado).toBe("en_cola");
    expect(JSON.stringify(j)).not.toContain("clave-secreta");
    expect(subir).toHaveBeenCalledTimes(2);
    const [url, init] = fetchFalso.mock.calls[0];
    expect(url).toBe("https://queue.fal.run/fal-ai/nano-banana-pro/edit");
    const cuerpo = JSON.parse(init.body as string);
    expect(cuerpo.image_urls).toEqual(["https://v3.fal.media/files/a.jpg", "https://v3.fal.media/files/b.jpg"]);
    expect(cuerpo.aspect_ratio).toBe("16:9");
  });
  it("sin fotos sigue usando el endpoint normal", async () => {
    vi.stubEnv("FAL_KEY", "k");
    const fetchFalso = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status_url: "https://queue.fal.run/x/requests/1/status", response_url: "https://queue.fal.run/x/requests/1" })),
    );
    vi.stubGlobal("fetch", fetchFalso);
    await POST(pedir({ prompt: "hola", modelo: "flux-2-pro" }));
    expect(fetchFalso.mock.calls[0][0]).toBe("https://queue.fal.run/fal-ai/flux-2-pro");
    expect(subir).not.toHaveBeenCalled();
  });
  it("si falla la subida de fotos, explica el error y no envía el trabajo", async () => {
    vi.stubEnv("FAL_KEY", "k");
    subir.mockRejectedValueOnce(new Error("Unauthorized"));
    const espia = vi.fn();
    vi.stubGlobal("fetch", espia);
    const res = await POST(pedir({ prompt: "hola", modelo: "flux-2-pro", imagenesReferencia: [foto()] }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("fotos de referencia");
    expect(espia).not.toHaveBeenCalled();
  });
});

describe("Fase 4 · prompt con referencia", () => {
  it("la identidad viene de las fotos: sin descripción del arquetipo ni «persona distinta»", () => {
    const con = buildApiPrompt(base(), { texto3d: true, referencia: true });
    expect(con).toContain("the exact same person shown in the reference photos");
    expect(con).toContain("copy the face, not the clothing");
    expect(con).not.toContain("completely different person");
    expect(con).not.toContain("Middle Eastern");
    expect(con).not.toContain("receding hairline");
  });
  it("conserva todo lo demás: postura, mirada, ropa lisa, impresoras, esquinas, waist up y negativos", () => {
    for (const texto3d of [true, false]) {
      const p = buildApiPrompt(base(), { texto3d, referencia: true });
      for (const t of [
        "Exactly one hand holds a modern smartphone",
        "never look at the camera",
        "no logos, brand names, printed text or emblems",
        "Real physical Epson printers",
        "lower-left corner of the frame is completely empty",
        "lower-right corner free of important elements",
        "framed from the waist up at most, no hips, no legs visible",
        "Avoid:",
      ]) {
        expect(p).toContain(t);
      }
    }
  });
  it("sin referencia el prompt no cambia", () => {
    const p = buildApiPrompt(base(), { texto3d: true });
    expect(p).toContain("completely different person");
    expect(p).toContain("Middle Eastern");
    expect(p).not.toContain("reference photos");
    expect(buildApiPrompt(base(), { texto3d: true, referencia: false })).toBe(p);
  });
});
