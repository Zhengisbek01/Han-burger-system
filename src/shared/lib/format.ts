import type { Locale } from '@/shared/types/domain'

const NBSP = ' '
const intl: Record<Locale, string> = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' }

/** 12345.6 → «12 346» (неразрывные пробелы между разрядами) */
export const fmt = (n: number | null | undefined): string =>
  Math.round(Number(n) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)

export const kzt = (n: number | null | undefined): string => `${fmt(n)}${NBSP}₸`

export const VAT_RATE = 0.12
/** НДС, включённый в сумму: сумма × 12 / 112 */
export const vatIncluded = (gross: number): number => Math.round(((gross * VAT_RATE) / (1 + VAT_RATE)) * 100) / 100

export const sum = (a: Array<number | null | undefined>): number => a.reduce<number>((x, y) => x + (Number(y) || 0), 0)

/** Локальная дата в формате YYYY-MM-DD (не UTC) */
export const isoDate = (d: Date): string => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
  return z.toISOString().slice(0, 10)
}
export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export const parseIso = (s: string): Date => new Date(`${s}T12:00:00`)

export const formatDate = (d: Date | string, locale: Locale, opts: Intl.DateTimeFormatOptions = {}): string =>
  new Intl.DateTimeFormat(intl[locale], opts).format(
    typeof d === 'string' ? new Date(d.length === 10 ? `${d}T12:00:00` : d) : d,
  )

export const formatDateTime = (d: string, locale: Locale): string =>
  formatDate(d, locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/** Проверка БИН/ИИН Республики Казахстан по контрольному разряду */
export function isValidBin(bin: string): boolean {
  if (!/^\d{12}$/.test(bin)) return false
  const d = bin.split('').map(Number)
  const calc = (w: number[]) => w.reduce((s, wi, i) => s + wi * (d[i] ?? 0), 0) % 11
  let c = calc([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  if (c === 10) c = calc([3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2])
  return c !== 10 && c === d[11]
}

/** Телефон Казахстана: +7 7XX XXX XX XX */
export const normalizePhone = (s: string): string | null => {
  const d = s.replace(/\D/g, '').replace(/^8/, '7')
  return /^77\d{9}$/.test(d) ? `+${d}` : null
}
