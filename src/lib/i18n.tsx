"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";

/**
 * Language engine.
 *
 * Three display modes:
 *   en   → English only            (default)
 *   ta   → தமிழ் only
 *   both → தமிழ் · English (Tamil first)
 *
 * Persisted per-device in localStorage. The provider renders in
 * English on first paint and applies the stored choice right after
 * mount, so server HTML and client hydration always agree.
 */

export type Lang = "en" | "ta" | "both";

const STORAGE_KEY = "nbm_lang";

export const LANG_OPTIONS: { value: Lang; label: string; ta: string }[] = [
  { value: "en", label: "English", ta: "ஆங்கிலம்" },
  { value: "ta", label: "Tamil", ta: "தமிழ்" },
  { value: "both", label: "English + Tamil", ta: "ஆங்கிலம் + தமிழ்" },
];

export function langLabel(lang: Lang, ta: boolean): string {
  const o = LANG_OPTIONS.find((x) => x.value === lang);
  return ta ? o?.ta ?? "" : o?.label ?? "";
}

export function langShort(lang: Lang): string {
  return lang === "en" ? "EN" : lang === "ta" ? "த" : "EN·த";
}

/** Pure formatter — mirror of the provider's `t`, usable outside React. */
export function pickText(lang: Lang, en: string, ta?: string): string {
  if (lang === "ta") return ta?.trim() ? ta : en;
  if (lang === "both") return ta?.trim() ? `${ta} · ${en}` : en;
  return en;
}

export type TFunc = (en: string, ta?: string) => string;

interface LangCtxValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** en-only or Tamil-first per current mode. */
  t: TFunc;
  /** True when the UI may show Tamil text (ta or both). */
  tamilVisible: boolean;
}

const LangContext = createContext<LangCtxValue>({
  lang: "en",
  setLang: () => {},
  t: (en) => en,
  tamilVisible: false,
});

function readStored(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const s = window.localStorage.getItem(STORAGE_KEY);
    return s === "ta" || s === "both" || s === "en" ? s : "en";
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(readStored());
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* private mode — session only */
    }
  }, []);

  const value = useMemo<LangCtxValue>(() => {
    const t: TFunc = (en, ta) => pickText(lang, en, ta);
    return {
      lang,
      setLang,
      t,
      tamilVisible: lang === "ta" || lang === "both",
    };
  }, [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangCtxValue {
  return useContext(LangContext);
}
