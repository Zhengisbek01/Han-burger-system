import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Locale } from '@/shared/types/domain'
import { ru, type Dict } from './ru'
import { kk } from './kk'
import { en } from './en'

export const DICTS: Record<Locale, Dict> = { ru, kk, en }
export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'kk', label: 'Қазақша' },
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' },
]

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never
type Paths<T> = { [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>> }[keyof T]
export type TKey = Paths<Dict>
export type TFn = (key: TKey, vars?: Record<string, string | number>) => string

export function translate(dict: Dict, key: string, vars?: Record<string, string | number>): string {
  let v: unknown = dict
  for (const part of key.split('.')) v = (v as Record<string, unknown> | undefined)?.[part]
  const s = typeof v === 'string' ? v : key
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : s
}

const STORAGE_KEY = 'qoima.locale'
const initial = (): Locale => {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s === 'ru' || s === 'kk' || s === 'en') return s
  } catch {
    /* приватный режим */
  }
  const nav = navigator.language.slice(0, 2)
  return nav === 'kk' ? 'kk' : nav === 'en' ? 'en' : 'ru'
}

interface Ctx {
  locale: Locale
  setLocale: (l: Locale) => void
  t: TFn
}
const I18nContext = createContext<Ctx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial)
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  const value = useMemo<Ctx>(
    () => ({ locale, setLocale, t: (key, vars) => translate(DICTS[locale], key, vars) }),
    [locale, setLocale],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): Ctx {
  const c = useContext(I18nContext)
  if (!c) throw new Error('useI18n вне I18nProvider')
  return c
}

/** Серверные ошибки приходят на русском — переводим известные */
const SERVER_ERRORS: Array<[RegExp, TKey]> = [
  [/Нет доступа к магазину/, 'errors.storeForbidden'],
  [/Смена за .* уже закрыта/, 'errors.shiftClosed'],
  [/Заявка пустая/, 'errors.orderEmpty'],
  [/Недопустимый переход статуса/, 'errors.badTransition'],
  [/Отправленную заявку отменить нельзя/, 'errors.cannotCancel'],
  [/Лимит тарифа/, 'errors.storeLimit'],
  [/уже работает в другой компании/, 'errors.userTaken'],
  [/Демо-данные можно загрузить только/, 'errors.demoNotEmpty'],
  [/Invalid login credentials/, 'errors.badLogin'],
  [/User already registered/, 'errors.userExists'],
  [/Failed to fetch|NetworkError/, 'errors.network'],
  [/удаляет аккаунт через поддержку/, 'errors.ownerDelete'],
  [/row-level security|permission denied/, 'errors.forbidden'],
]
export function translateError(t: TFn, message: string): string {
  const hit = SERVER_ERRORS.find(([re]) => re.test(message))
  return hit ? t(hit[1]) : message
}
