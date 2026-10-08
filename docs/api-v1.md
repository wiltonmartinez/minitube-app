# API v1 de miniaturas (MiniTube)

Motor único de miniaturas: recibe **marca, modelo y error** y devuelve los prompts (y, si se pide, la imagen).

Todas las peticiones llevan `Authorization: Bearer <MINITUBE_API_TOKEN>`.

## POST /api/v1/thumbnail

```json
{ "marca": "Epson", "modelo": "F570", "error": "Almohadillas",
  "enfoque": "error", "generarImagen": true, "semilla": 12345 }
```

- `enfoque` (opcional): `"error"` (pánico, por defecto) o `"solucion"` (alivio).
- `generarImagen` (opcional, por defecto `true`): `false` = solo prompts.
- `semilla` (opcional): entero ≥ 0; la misma semilla da la misma escena. La respuesta siempre devuelve la usada.

Respuesta (200 o 202): `version`, `id`, `estado` (`completado` | `en_cola`), `prioridad`, `modeloIA`, `semilla`,
`personaje`, `profesion`, `plano`, `emocion`, `promptImagen` (inglés), `promptGemini` (español), `imagen`
(`{url, ancho, alto}` o `null`), `costoAproxUSD`, `simulacion`, `aviso`.

- Con imagen real el estado es `en_cola` (HTTP 202) y hay que consultar el `id`.
- Sin `FAL_KEY` responde en **modo simulación** (`simulacion: true`, imagen de prueba, costo 0).

## Prioridad y modelo de IA

| Prioridad | Cuándo | Modelo | Escena |
|---|---|---|---|
| `alta` | modelo F570, F571, T3170 o T3170X (se ignoran mayúsculas, espacios, guiones y prefijos como «SC-» o «SureColor») | Seedream 5.0 Pro (fal.ai) | plano detalle, mujer joven de 20 a 30 años, profesión de sublimación, vinilo o fotografía, plotter de la marca al fondo |
| `normal` | cualquier otro modelo | FLUX.2 Pro (fal.ai) por defecto; `MINITUBE_MODELO_NORMAL` lo cambia | la que sortee el motor |

Con `MINITUBE_MODELO_NORMAL=manual`, la prioridad normal no genera imagen: responde 429 con el `promptGemini`.

## GET /api/v1/thumbnail/{id}

Devuelve `estado`: `en_cola`, `generando` o `completado` (con `imagen`). Consultar cada 3–5 segundos.

## Composición (para TexTube)

La imagen se genera **sin texto**. El campo `composicion` de la respuesta indica lo que se agrega por código: tamaño final
1280×720, marca de agua `ResetEnLinea.com` translúcida en la esquina inferior izquierda, ventana de error en esa misma
esquina, zonas que deben quedar libres (inferior izquierda e inferior derecha) y estilo del texto principal (3D, contorno,
sombra y alto contraste, lejos de la esquina inferior derecha).

## Errores

```json
{ "version": "1", "error": { "codigo": "CUOTA_AGOTADA", "mensaje": "…" } }
```

| HTTP | codigo | Cuándo |
|---|---|---|
| 400 | `DATOS_INVALIDOS` | faltan datos o tienen un formato incorrecto (incluye `campos`) |
| 401 | `NO_AUTORIZADO` | falta el token o no es válido |
| 404 | `NO_ENCONTRADO` | el `id` no es válido |
| 429 | `CUOTA_AGOTADA` | sin saldo/cuota del proveedor; trae `promptGemini` para generarlo a mano |
| 502 | `FALLO_PROVEEDOR` | falló el proveedor de imágenes |
| 503 | `SERVICIO_NO_CONFIGURADO` | el servidor no tiene `MINITUBE_API_TOKEN` (la API nunca queda abierta) |

Solo en desarrollo (nunca en producción), el encabezado `x-minitube-simular: cuota | proveedor` simula el 429 o el 502.
