"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { translations } from "@/i18n/translations";
import type { Language } from "@/i18n/translations";

/**
 * useTranslation
 *
 * Reads the current user's language_preference from the users table
 * and returns the correct translation strings.
 *
 * Defaults to "en" for all non-caregiver roles or unauthenticated users.
 * Caregivers with language_preference = "es" automatically get Spanish.
 *
 * Usage:
 *   const { t, language } = useTranslation();
 *   t("tasks.title")        // returns "Care Tasks" or "Mis Tareas"
 *   t("common.save")        // returns "Save" or "Guardar"
 */

type TranslationSet = typeof translations.en;

function getNestedValue(obj: any, path: string): string {
  return path.split(".").reduce((acc, key) => acc?.[key], obj) ?? path;
}

export function useTranslation() {
  const [language, setLanguage] = useState<Language>("en");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLanguage = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLanguage("en");
          setLoading(false);
          return;
        }

        // Pull language_preference from public.users table
        const { data, error } = await supabase
          .from("users")
          .select("language_preference, role")
          .eq("id", user.id)
          .single();

        if (error || !data) {
          setLanguage("en");
          setLoading(false);
          return;
        }

        // Caregivers default to Spanish if preference is set to "es"
        // All other roles default to "en" unless explicitly set
        const lang = (data.language_preference === "es") ? "es" : "en";
        setLanguage(lang);
      } catch {
        setLanguage("en");
      } finally {
        setLoading(false);
      }
    };

    fetchLanguage();
  }, []);

  /**
   * t(key) — translate a dot-notation key
   * Example: t("tasks.title") → "Care Tasks" or "Mis Tareas"
   */
  const t = (key: string): string => {
    const result = getNestedValue(translations[language], key);
    // Fallback to English if key missing in Spanish
    if (result === key && language !== "en") {
      return getNestedValue(translations.en, key);
    }
    return result;
  };

  /**
   * setLanguageManually — allows user to switch language from UI
   * Persists to Supabase users table
   */
  const setLanguageManually = async (lang: Language) => {
    setLanguage(lang);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("users")
          .update({ language_preference: lang })
          .eq("id", user.id);
      }
    } catch {
      // Non-blocking — UI already updated
    }
  };

  return { t, language, loading, setLanguageManually };
}
