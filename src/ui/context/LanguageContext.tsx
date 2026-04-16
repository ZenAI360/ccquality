import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { translations } from '@/i18n/translations'
import type { Lang, Translations } from '@/i18n/translations'

interface LanguageCtx {
  lang: Lang
  setLang: (l: Lang) => void
}

export const LanguageContext = createContext<LanguageCtx>({ lang: 'tr', setLang: () => undefined })

/**
 * Provides language state to the entire component tree.
 * Wrap the root App component with this provider.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('tr')
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

/** Returns the current language code and a setter. */
export function useLanguage(): LanguageCtx {
  return useContext(LanguageContext)
}

/** Returns the translation object for the current language. */
export function useT(): Translations {
  const { lang } = useLanguage()
  return translations[lang]
}
