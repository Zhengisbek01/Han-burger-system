import { z } from 'zod'
import { bin, email, text } from '@/shared/lib/validation'

export const newClientSchema = z.object({
  name: text(120),
  bin,
  city: text(80),
  plan: z.enum(['start', 'biz', 'net']),
  ownerName: text(120),
  ownerEmail: email,
  trialDays: z.coerce.number().int('v.integer').min(0, 'v.nonNegative').max(90, 'v.tooLong'),
})
