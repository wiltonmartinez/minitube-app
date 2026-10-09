import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as consultar } from "@/app/api/v1/thumbnail/[id]/route";
import { POST } from "@/app/api/v1/thumbnail/route";
import { crearId, leerId } from "@/lib/api-v1";
import { normalizarMarca, planificar, validarSolicitud } from "@/lib/motor";

const TOKEN = "token-de-prueba-muy-largo-0123456789abcdef";
const OK = { marca: "Epson", modelo: "L3250", error: "Almohadillas" };

const post = (cuerpo: unknown, cabeceras: Record<string, string> = { Authorization: `Bearer ${TOKEN}` }) =>
  POST(
    new Request("http://localhost/api/v1/thumbnail", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...cabeceras },
      body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
    }),
  );
const get = (id: string, cabeceras: Record<string, string> = { Authorization: `Bearer ${TOKEN}` }) =>
  consultar(new Request(`http://localhost/api/v1/thumbnail/${id}`, { headers: cabeceras }), { params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.stubEnv("MINITUBE_API_TOKEN", TOKEN);
  vi.stubEnv("FAL_KEY", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("API v1 · seguridad", () => {
  it("401 sin token, con token equivocado o mal formado", async () => {
    const invalidas: Record<string, string>[] = [{}, { Authorization: "Bearer otro-token" }, { Authorization: TOKEN }, { Authorization: "Basic abc" }, { Authorization: "Bearer " }];
    for (const cabeceras of invalidas) {
      const r = await post(OK, cabeceras);
      expect(r.status).toBe(401);
      const j = await r.json();
      expect(j.error.codigo).toBe("NO_AUTORIZADO");
      expect(j.error.mensaje).toContain("token");
      expect(j.promptImagen).toBeUndefined(); // sin token no se filtra nada
    }
  });
  it("si el servidor no tiene token configurado, la API queda CERRADA (503), nunca abierta", async () => {
    vi.stubEnv("MINITUBE_API_TOKEN", "");
    const r = await post(OK, {});
    expect(r.status).toBe(503);
    expect((await r.json()).error.codigo).toBe("SERVICIO_NO_CONFIGURADO");
    const g = await get("x.y", {});
    expect(g.status).toBe(503);
  });
  it("la consulta GET también exige token", async () => {
    expect((await get("abc.def", {})).status).toBe(401);
  });
});

describe("API v1 · validación (400)", () => {
  it("datos incompletos o con tipos incorrectos", async () => {
    const casos: unknown[] = [
      {},
      { marca: "Epson" },
      { marca: "Epson", modelo: "L3250" },
      { ...OK, marca: "" },
      { ...OK, modelo: "x".repeat(41) },
      { ...OK, error: 123 },
      { ...OK, enfoque: "otro" },
      { ...OK, generarImagen: "si" },
      { ...OK, semilla: 1.5 },
      { ...OK, semilla: -1 },
      { ...OK, modelo: "<script>" },
      [],
      "no es json {",
    ];
    for (const c of casos) {
      const r = await post(c);
      expect(r.status, JSON.stringify(c)).toBe(400);
      const j = await r.json();
      expect(j.error.codigo).toBe("DATOS_INVALIDOS");
      expect(j.error.mensaje).toMatch(/inválid|JSON|objeto/);
    }
  });
  it("el mensaje dice qué campos fallaron", async () => {
    const j = await (await post({ marca: "Epson" })).json();
    expect(j.campos).toEqual(["modelo", "error"]);
    expect(j.error.mensaje).toContain("modelo");
    expect(j.error.mensaje).toContain("error");
  });
  it("normaliza la marca y acepta modelos con guiones y espacios", () => {
    expect(normalizarMarca("EPSON")).toBe("Epson");
    expect(normalizarMarca("Epson-SC")).toBe("Epson");
    expect(normalizarMarca(" canon ")).toBe("Canon");
    const v = validarSolicitud({ marca: "Epson-SC", modelo: "SC-T3170X", error: "5B00" });
    expect(v.ok && v.solicitud).toMatchObject({ marca: "Epson", modelo: "SC-T3170X", enfoque: "error", generarImagen: true });
  });
});

describe("API v1 · contrato de la respuesta", () => {
  it("generarImagen=false: solo los prompts, sin imagen y sin costo", async () => {
    const r = await post({ ...OK, generarImagen: false });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j).toMatchObject({ version: "1", id: null, estado: "completado", imagen: null, costoAproxUSD: 0, simulacion: false });
    expect(j.prioridad).toBe("normal");
    for (const k of ["modeloIA", "semilla", "personaje", "profesion", "plano", "promptImagen", "promptGemini", "aviso"]) expect(j, k).toHaveProperty(k);
    expect(j.personaje).toHaveProperty("arquetipo");
    expect(j.promptImagen).toMatch(/^Hyper-realistic/);
    expect(j.promptGemini).toContain("REGLA DE BRANDING");
    expect(j.aviso).toContain("Solo prompt");
  });
  it("la imagen se pide SIN texto y con la emoción del enfoque", async () => {
    const err = await (await post({ ...OK, generarImagen: false, semilla: 7 })).json();
    const sol = await (await post({ ...OK, generarImagen: false, semilla: 7, enfoque: "solucion" })).json();
    expect(err.promptImagen).toContain("Do not render any text");
    expect(err.promptImagen).not.toContain('"RESET"');
    expect(err.emocion).toBe("panico");
    expect(err.promptImagen).toContain("with panic");
    expect(sol.emocion).toBe("alivio");
    expect(sol.promptImagen).toContain("relief");
    expect(sol.promptImagen).not.toMatch(/with panic|terrifying/);
  });
  it("la misma semilla da el mismo resultado; otra semilla, otro", async () => {
    const a = await (await post({ ...OK, generarImagen: false, semilla: 12345 })).json();
    const b = await (await post({ ...OK, generarImagen: false, semilla: 12345 })).json();
    expect(a.promptImagen).toBe(b.promptImagen);
    expect(a.promptGemini).toBe(b.promptGemini);
    expect(a.personaje).toEqual(b.personaje);
    const distintos = new Set<string>();
    for (let s = 1; s <= 30; s++) distintos.add((await (await post({ ...OK, generarImagen: false, semilla: s })).json()).personaje.arquetipo);
    expect(distintos.size).toBeGreaterThan(8);
  });
  it("sin semilla devuelve la que usó (para poder reproducirlo)", async () => {
    const a = await (await post({ ...OK, generarImagen: false })).json();
    expect(Number.isInteger(a.semilla)).toBe(true);
    const b = await (await post({ ...OK, generarImagen: false, semilla: a.semilla })).json();
    expect(b.promptImagen).toBe(a.promptImagen);
  });
  it("comparte el motor con el panel: planificar() da los mismos prompts que la API", async () => {
    const plan = planificar({ marca: "Epson", modelo: "L3250", error: "Almohadillas", enfoque: "error", generarImagen: false, semilla: 99 });
    const j = await (await post({ ...OK, generarImagen: false, semilla: 99 })).json();
    expect(j.promptImagen).toBe(plan.promptImagen);
    expect(j.promptGemini).toBe(plan.promptGemini);
  });
  it("la escena respeta las reglas del motor: una sola postura, esquinas libres, waist up y sin porcentajes", async () => {
    for (let s = 1; s <= 40; s++) {
      const j = await (await post({ ...OK, generarImagen: false, semilla: s })).json();
      const p: string = j.promptImagen;
      const posturas = (p.match(/Exactly one hand holds|Both hands are placed on the sides|Both hands touch the very same|Both hands are typing/g) ?? []).length;
      expect(posturas, `semilla ${s}`).toBe(1);
      expect(p).toContain("lower-left corner of the frame is completely empty");
      expect(p).toContain("lower-right corner free of important elements");
      expect(p).toContain("framed from the waist up at most, no hips, no legs visible");
      expect(p).not.toMatch(/\d+\s*%/);
    }
  });
});

describe("API v1 · errores simulados y modo simulación", () => {
  it("sin FAL_KEY: imagen de prueba 1280×720, simulacion=true y costo 0", async () => {
    const r = await post(OK);
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j).toMatchObject({ estado: "completado", simulacion: true, costoAproxUSD: 0, id: null });
    expect(j.imagen).toMatchObject({ ancho: 1280, alto: 720 });
    expect(decodeURIComponent(j.imagen.url)).toContain("SIMULACIÓN");
    expect(j.aviso).toContain("simulación");
  });
  it("429 simulado devuelve el promptGemini para generarlo a mano", async () => {
    const r = await post(OK, { Authorization: `Bearer ${TOKEN}`, "x-minitube-simular": "cuota" });
    expect(r.status).toBe(429);
    const j = await r.json();
    expect(j.error.codigo).toBe("CUOTA_AGOTADA");
    expect(j.error.mensaje).toContain("promptGemini");
    expect(j.promptGemini).toContain("REGLA DE BRANDING");
    expect(j.imagen).toBeUndefined();
  });
  it("502 simulado", async () => {
    const r = await post(OK, { Authorization: `Bearer ${TOKEN}`, "x-minitube-simular": "proveedor" });
    expect(r.status).toBe(502);
    expect((await r.json()).error.codigo).toBe("FALLO_PROVEEDOR");
  });
  it("en producción se ignora el encabezado de simulación", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const r = await post(OK, { Authorization: `Bearer ${TOKEN}`, "x-minitube-simular": "cuota" });
    expect(r.status).toBe(200);
  });
});

describe("API v1 · generación real por cola (fal.ai simulado)", () => {
  const colaOk = () =>
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status_url: "https://queue.fal.run/fal-ai/flux-2-pro/requests/1/status",
          response_url: "https://queue.fal.run/fal-ai/flux-2-pro/requests/1",
        }),
      ),
    );
  const idBueno = (token = TOKEN) =>
    crearId({ s: "https://queue.fal.run/a/requests/1/status", r: "https://queue.fal.run/a/requests/1", m: "flux-2-pro" }, token);

  it("POST responde 202 con un id firmado y NO expone ninguna clave", async () => {
    vi.stubEnv("FAL_KEY", "clave-secreta-fal");
    const espia = colaOk();
    vi.stubGlobal("fetch", espia);
    const r = await post(OK);
    expect(r.status).toBe(202);
    const j = await r.json();
    expect(j).toMatchObject({ estado: "en_cola", imagen: null, simulacion: false, costoAproxUSD: 0.03 });
    expect(JSON.stringify(j)).not.toContain("clave-secreta-fal");
    expect(JSON.stringify(j)).not.toContain(TOKEN);
    expect(leerId(j.id, TOKEN)).toMatchObject({ m: "flux-2-pro" });
    const [url, init] = espia.mock.calls[0];
    expect(url).toBe("https://queue.fal.run/fal-ai/flux-2-pro");
    expect(init.headers.Authorization).toBe("Key clave-secreta-fal");
    expect(JSON.parse(init.body).prompt).toBe(j.promptImagen);
  });
  it("GET consulta el estado: en cola → generando → completado con la imagen", async () => {
    vi.stubEnv("FAL_KEY", "k");
    const id = idBueno();
    const respuestas = [
      new Response(JSON.stringify({ status: "IN_QUEUE" })),
      new Response(JSON.stringify({ status: "IN_PROGRESS" })),
      new Response(JSON.stringify({ status: "COMPLETED" })),
      new Response(JSON.stringify({ images: [{ url: "https://v3.fal.media/x.png", width: 1024, height: 576 }] })),
    ];
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => respuestas.shift()));
    expect((await (await get(id)).json()).estado).toBe("en_cola");
    expect((await (await get(id)).json()).estado).toBe("generando");
    const fin = await (await get(id)).json();
    expect(fin).toMatchObject({ estado: "completado", imagen: { url: "https://v3.fal.media/x.png", ancho: 1024, alto: 576 }, costoAproxUSD: 0.03 });
  });
  it("ids falsos, alterados o firmados con otro token → 404 y sin llamar a fal.ai", async () => {
    vi.stubEnv("FAL_KEY", "k");
    const espia = vi.fn();
    vi.stubGlobal("fetch", espia);
    const bueno = idBueno();
    const alterado = (bueno.startsWith("e") ? "f" : "e") + bueno.slice(1);
    for (const id of ["inventado", "a.b.c", idBueno("otro-token"), alterado, "vacio"]) {
      const r = await get(id);
      expect(r.status, id).toBe(404);
      expect((await r.json()).error.codigo).toBe("NO_ENCONTRADO");
    }
    expect(espia).not.toHaveBeenCalled();
  });
  it("un id firmado con direcciones que no son de fal.ai no se consulta (anti-SSRF)", async () => {
    vi.stubEnv("FAL_KEY", "k");
    const malo = crearId({ s: "http://169.254.169.254/", r: "https://evil.example/x", m: "flux-2-pro" }, TOKEN);
    const espia = vi.fn();
    vi.stubGlobal("fetch", espia);
    const r = await get(malo);
    expect(r.status).toBe(502);
    expect(espia).not.toHaveBeenCalled();
  });
  it("sin saldo en fal.ai (402) → 429 con el promptGemini; otros fallos → 502", async () => {
    vi.stubEnv("FAL_KEY", "k");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Insufficient balance", { status: 402 })));
    const sinSaldo = await post(OK);
    expect(sinSaldo.status).toBe(429);
    const j = await sinSaldo.json();
    expect(j.error.codigo).toBe("CUOTA_AGOTADA");
    expect(j.promptGemini.length).toBeGreaterThan(500);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));
    const caido = await post(OK);
    expect(caido.status).toBe(502);
    expect((await caido.json()).error.codigo).toBe("FALLO_PROVEEDOR");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("red")));
    expect((await post(OK)).status).toBe(502);
  });
});

describe("API v1 · MINITUBE_FORZAR_SIMULACION", () => {
  it("con la bandera activa responde en simulación aunque exista FAL_KEY y no llama a fal.ai", async () => {
    vi.stubEnv("FAL_KEY", "clave-real");
    vi.stubEnv("MINITUBE_FORZAR_SIMULACION", "1");
    const espia = vi.fn();
    vi.stubGlobal("fetch", espia);
    const r = await post(OK);
    expect(r.status).toBe(200);
    expect((await r.json()).simulacion).toBe(true);
    expect(espia).not.toHaveBeenCalled();
  });
});

describe("API v1 · costo estimado", () => {
  it("siempre informa lo que costaría generar la imagen, aunque pidas solo el prompt", async () => {
    const normal = await (await post({ ...OK, generarImagen: false })).json();
    expect(normal).toMatchObject({ costoAproxUSD: 0, costoEstimadoUSD: 0.03, prioridad: "normal" });
    const alta = await (await post({ marca: "Epson", modelo: "F570", error: "Almohadillas", generarImagen: false })).json();
    expect(alta).toMatchObject({ costoAproxUSD: 0, costoEstimadoUSD: 0.0675, prioridad: "alta" });
  });
  it("en modo manual no hay costo estimado", async () => {
    vi.stubEnv("MINITUBE_MODELO_NORMAL", "manual");
    const j = await (await post({ ...OK, generarImagen: false })).json();
    expect(j.costoEstimadoUSD).toBe(0);
  });
});
