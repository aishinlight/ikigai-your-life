import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en, { type Dict } from "./en";
import uk from "./uk";

export type Locale = "en" | "uk";
const DICTS: Record<Locale, Dict> = { en, uk };
const KEY = "iyl.locale";

function readStored(): Locale {
  try {
    const v = localStorage.getItem(KEY);
    return v === "uk" ? "uk" : "en";
  } catch {
    return "en";
  }
}

type Ctx = { locale: Locale; t: Dict; setLocale: (l: Locale) => void };
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStored);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo<Ctx>(
    () => ({
      locale,
      t: DICTS[locale],
      setLocale: (l) => {
        setLocaleState(l);
        try { localStorage.setItem(KEY, l); } catch { /* storage unavailable */ }
      },
    }),
    [locale],
  );
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
