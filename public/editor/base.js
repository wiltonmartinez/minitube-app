/* Funciones comunes que el editor necesita (en Gestor TUBE vivían en el resto del panel). */
const TOKEN = "";
const BUILD = "";
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const leer = (k) => { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } };
const api = (ruta, cuerpo, crudo) => GT.api(ruta, cuerpo, crudo);
function aviso(texto, mal) { const t = $("toast"); t.textContent = texto; t.className = "toast" + (mal ? " mal" : ""); t.style.display = "block"; clearTimeout(aviso.t); aviso.t = setTimeout(() => (t.style.display = "none"), mal ? 7000 : 3500); }
function mostrarError(id, texto) { const e = $(id); e.textContent = texto || ""; e.style.display = texto ? "block" : "none"; }
