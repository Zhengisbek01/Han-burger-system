import { z } from 'zod'
import { bin, email, text } from '@/shared/lib/validation'

export const CONSENT_VERSION = '2026-11'

export const loginSchema = z.object({ email, password: z.string().min(1, 'v.required') })
export const signupSchema = z.object({
  name: text(120).refine((s) => s.length >= 2, 'v.required'),
  email,
  password: z.string().min(8, 'v.password'),
  consent: z.literal(true, { errorMap: () => ({ message: 'v.consent' }) }),
})
export const resetSchema = z.object({ email })
export const passwordSchema = z.object({ password: z.string().min(8, 'v.password') })
export const companySchema = z.object({ name: text(120), bin, city: text(80) })
