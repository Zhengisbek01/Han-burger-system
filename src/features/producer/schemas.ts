import { z } from 'zod'
import { email, money, text } from '@/shared/lib/validation'

export const productSchema = z.object({
  name: text(120),
  category: text(60),
  unit: text(10),
  price: money,
  cost: money,
  shelf_days: z.coerce.number().int('v.integer').min(1, 'v.min1').max(365, 'v.tooLong'),
  active: z.boolean(),
})
export const storeSchema = z.object({
  name: text(120),
  address: z.string().trim().max(200).nullable(),
  active: z.boolean(),
})
export const inviteSchema = z
  .object({ email, name: text(120), role: z.enum(['manager', 'store']), store: z.string().uuid().nullable() })
  .refine((v) => v.role !== 'store' || Boolean(v.store), { message: 'v.store', path: ['store'] })
export const settingsSchema = z.object({
  name: text(120),
  city: text(80),
  safety_pct: z.coerce.number().int('v.integer').min(0, 'v.nonNegative').max(100, 'v.max100'),
})
