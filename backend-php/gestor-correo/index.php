<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../lib/api_publica.php';
require_once __DIR__ . '/../../../lib/limitador_publico.php';
require_once __DIR__ . '/../../../lib/correo.php';

api_publica_preparar_respuesta_post();

// COPIA para subir al backend: va en  ver.resetenlinea.com/api/public/gestor-correo/index.php
//
// Envía correos para Gestor TUBE (gestortube.vercel.app): hoy, el enlace de "Olvidé mi contraseña".
// NO es público de verdad: exige el token GESTOR_CORREO_TOKEN (en ver_config/.env) en el encabezado
// "Authorization: Bearer <token>". Sin token configurado en el servidor, el endpoint queda apagado (503).
// Usa el mismo SMTP de lib/correo.php y NO manda copia oculta al admin: el correo lleva un enlace de acceso
// de un solo uso y no debe quedar en otras bandejas.
const GESTOR_CORREO_MAX_POR_HORA = 20;
const GESTOR_CORREO_VENTANA_SEGUNDOS = 3600;

$tokenEsperado = trim((string) env('GESTOR_CORREO_TOKEN', ''));
if (strlen($tokenEsperado) < 24) {
    api_publica_json(['status' => 'error', 'message' => 'Envío deshabilitado: falta GESTOR_CORREO_TOKEN (mínimo 24 caracteres) en el servidor.'], 503);
}

$cabecera = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
if ($cabecera === '' && function_exists('getallheaders')) {
    foreach (getallheaders() as $nombre => $valor) {
        if (strcasecmp((string) $nombre, 'Authorization') === 0) {
            $cabecera = (string) $valor;
        }
    }
}
$token = str_starts_with($cabecera, 'Bearer ') ? trim(substr($cabecera, 7)) : '';
if ($token === '' || !hash_equals($tokenEsperado, $token)) {
    api_publica_json(['status' => 'error', 'message' => 'No autorizado.'], 401);
}

if (limitador_publico_excedido('gestor_correo', GESTOR_CORREO_MAX_POR_HORA, GESTOR_CORREO_VENTANA_SEGUNDOS)) {
    api_publica_json(['status' => 'error', 'message' => 'Demasiados envíos en poco tiempo.'], 429);
}

$body = api_publica_leer_json_body();
$limpiar = static fn (string $v): string => trim(str_replace(["\r", "\n"], ' ', $v));

$para = $limpiar((string) ($body['para'] ?? ''));
$asunto = $limpiar((string) ($body['asunto'] ?? ''));
$texto = (string) ($body['texto'] ?? '');
$html = (string) ($body['html'] ?? '');

if (!filter_var($para, FILTER_VALIDATE_EMAIL)) {
    api_publica_json(['status' => 'error', 'message' => 'El correo de destino no es válido.'], 400);
}
if ($asunto === '' || $texto === '' || $html === '' || strlen($asunto) > 200 || strlen($texto) > 20000 || strlen($html) > 50000) {
    api_publica_json(['status' => 'error', 'message' => 'Faltan datos o son demasiado largos: asunto, texto y html.'], 400);
}

$resultado = enviar_correo($para, '', $asunto, $texto, $html, [], false);
if (!$resultado['ok']) {
    api_publica_json(['status' => 'error', 'message' => 'No se pudo enviar el correo.'], 502);
}

api_publica_json(['status' => 'success', 'message' => 'Correo enviado']);
