import { z } from 'zod'
import { isValidBin, normalizePhone } from './format'
import type { TFn, TKey } from '@/shared/i18n'

// Сообщения — ключи i18n, переводятся при показе
const req = 'v.required' satisfies TKey
export const text = (max = 200) =>
  z
    .string()
    .trim()
    .min(1, req)
    .max(max, 'v.tooLong' satisfies TKey)
export const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('v.email' satisfies TKey)
export const money = z.coerce
  .number({ invalid_type_error: 'v.number' })
  .min(0, 'v.nonNegative' satisfies TKey)
  .max(100_000_000)
export const bin = z
  .string()
  .trim()
  .refine((s) => s === '' || isValidBin(s), 'v.bin' satisfies TKey)
  .transform((s) => (s === '' ? null : s))
export const phone = z
  .string()
  .trim()
  .refine((s) => s === '' || normalizePhone(s) !== null, 'v.phone' satisfies TKey)
  .transform((s) => (s === '' ? null : normalizePhone(s)))

export function fieldErrors(error: z.ZodError, t: TFn): Record<string, string> {
  const out: Record<string, string> = {}
  for (const i of error.issues) {
    const k = String(i.path[0] ?? '_')
    if (!out[k]) out[k] = t(i.message as TKey)
  }
  return out
}
