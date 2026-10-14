"use client";

import { useCallback, useEffect, useState } from "react";
import { normalizarConfig, type Config } from "./config";
import { configurar } from "./plantillas";
import { fotoAntesDeEditar } from "./versiones";

export const CLAVE_CONFIG = "textube:config";

/** Configuración de TexTUBE guardada en este navegador. Al cambiarla se activa enseguida y se guarda. */
export function useConfigTextube(): [Config, (fn: (c: Config) => Config) => void, (c: Config) => void] {
  const [cfg, setCfg] = useState<Config>(() => normalizarConfig(undefined));

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const guardada = localStorage.getItem(CLAVE_CONFIG);
        if (guardada) {
          const c = normalizarConfig(JSON.parse(guardada));
          configurar(c);
          setCfg(c);
        }
      } catch {
        /* sin almacenamiento o datos dañados: se usa la configuración original */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const poner = useCallback((c: Config) => {
    fotoAntesDeEditar("Antes de cambiar los menús");
    const n = normalizarConfig(c);
    configurar(n); // primero se activa, para que lo que se dibuje a continuación ya use la configuración nueva
    setCfg(n);
    try {
      localStorage.setItem(CLAVE_CONFIG, JSON.stringify(n));
    } catch {
      /* sin almacenamiento: el cambio vale mientras la página esté abierta */
    }
  }, []);

  const editar = useCallback(
    (fn: (c: Config) => Config) => {
      setCfg((actual) => {
        fotoAntesDeEditar("Antes de cambiar los menús");
        const n = normalizarConfig(fn(structuredClone(actual)));
        configurar(n);
        try {
          localStorage.setItem(CLAVE_CONFIG, JSON.stringify(n));
        } catch {
          /* sin almacenamiento */
        }
        return n;
      });
    },
    [],
  );

  return [cfg, editar, poner];
}
