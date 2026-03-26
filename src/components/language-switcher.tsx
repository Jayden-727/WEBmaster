"use client";

import { useI18n, type Locale } from "@/lib/i18n";
import { Globe } from "lucide-react";

const LOCALES: { id: Locale; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "ko", label: "한국어" },
];

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Globe className="h-3.5 w-3.5 text-slate-500" />
      {LOCALES.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setLocale(id)}
          className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
            locale === id
              ? "bg-indigo-500/15 text-indigo-300"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
