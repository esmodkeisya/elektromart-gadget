"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type Variant = "navbar" | "light" | "auth" | "compact";

export default function LanguageSwitcher({ variant = "light" }: { variant?: Variant }) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const triggerClass =
    variant === "navbar"
      ? "flex items-center gap-1.5 text-sm font-medium text-white"
      : variant === "compact"
        ? "flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10"
        : variant === "auth"
          ? "flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-navy-900 shadow-sm"
          : "flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy-900";

  const menuClass =
    variant === "navbar"
      ? "absolute right-0 top-10 z-30 w-36 rounded-lg bg-white p-1.5 text-sm text-slate-700 shadow-lg"
      : "absolute right-0 top-10 z-30 w-36 rounded-lg border border-slate-100 bg-white p-1.5 text-sm text-slate-700 shadow-lg";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={triggerClass}
        aria-label={t("selectLanguage")}
        aria-expanded={open}
      >
        <Globe className="h-4 w-4" />
        {variant === "compact" ? null : (
          <>
            {language === "id" ? "ID" : "EN"}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>
      {open ? (
        <div className={menuClass}>
          <button
            type="button"
            onClick={() => {
              setLanguage("id");
              setOpen(false);
            }}
            className={`w-full rounded px-3 py-2 text-left hover:bg-slate-100 ${language === "id" ? "font-semibold text-brand-orange" : ""}`}
          >
            Indonesia
          </button>
          <button
            type="button"
            onClick={() => {
              setLanguage("en");
              setOpen(false);
            }}
            className={`w-full rounded px-3 py-2 text-left hover:bg-slate-100 ${language === "en" ? "font-semibold text-brand-orange" : ""}`}
          >
            English
          </button>
        </div>
      ) : null}
    </div>
  );
}
