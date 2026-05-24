import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language } from "@/i18n/translations";

/**
 * LanguageContext
 * 
 * Provides language support throughout the app
 * - Detects language from user.language_preference
 * - Provides useTranslation() hook for components
 * - Supports English (en) and Spanish (es)
 * 
 * Usage:
 *   const { t, language, setLanguage } = useTranslation();
 *   <div>{t('tasks.title')}</div>
 */

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Get nested value from translations object using dot notation
 * Example: getNestedValue(translations.en, "tasks.title") → "Tasks"
 */
function getNestedValue(obj: any, path: string): string {
  const keys = path.split(".");
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      // Return the key itself if translation not found (fallback)
      return path;
    }
  }

  return typeof value === "string" ? value : path;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  // Detect language from localStorage or default to English
  useEffect(() => {
    const savedLanguage = localStorage.getItem("kinto-language") as Language;
    if (savedLanguage && ["en", "es"].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language preference to localStorage
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("kinto-language", lang);
  };

  // Translation function
  const t = (key: string): string => {
    return getNestedValue(translations[language], key);
  };

  const value: LanguageContextType = {
    language,
    setLanguage: handleSetLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * useTranslation Hook
 * 
 * Use this hook in any component to access translations
 * 
 * Example:
 *   const { t, language, setLanguage } = useTranslation();
 *   return <h1>{t('dashboard.title')}</h1>
 */
export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within LanguageProvider");
  }
  return context;
}
