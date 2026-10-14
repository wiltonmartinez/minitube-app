"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";

/** Campo de contraseña con un ojito para ver lo que se escribe. */
export function CampoClave({ className, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={ver ? "text" : "password"} className={`pr-10 ${className ?? ""}`} />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        disabled={props.disabled}
        aria-label={ver ? "Ocultar la contraseña" : "Mostrar la contraseña"}
        aria-pressed={ver}
        title={ver ? "Ocultar la contraseña" : "Mostrar la contraseña"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
