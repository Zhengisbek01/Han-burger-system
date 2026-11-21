import { describe, expect, it } from 'vitest'
import { signupSchema, companySchema } from './schemas'
import { inviteSchema, productSchema } from '@/features/producer/schemas'

describe('валидация форм', () => {
  it('регистрация требует согласия на обработку ПД', () => {
    const r = signupSchema.safeParse({ name: 'Айгерим', email: 'a@b.kz', password: '12345678', consent: false })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toBe('v.consent')
    expect(
      signupSchema.safeParse({ name: 'Айгерим', email: ' A@B.KZ ', password: '12345678', consent: true }).data?.email,
    ).toBe('a@b.kz')
  })
  it('БИН необязателен, но если указан — с верным контрольным разрядом', () => {
    expect(companySchema.parse({ name: 'HAN', bin: '', city: 'Астана' }).bin).toBeNull()
    expect(companySchema.safeParse({ name: 'HAN', bin: '123456789012', city: 'Астана' }).success).toBe(false)
  })
  it('цена не отрицательная, срок годности целый', () => {
    expect(
      productSchema.safeParse({ name: 'x', category: 'x', unit: 'шт', price: -1, cost: 0, shelf_days: 1, active: true })
        .success,
    ).toBe(false)
    expect(
      productSchema.safeParse({
        name: 'x',
        category: 'x',
        unit: 'шт',
        price: '990',
        cost: '300',
        shelf_days: '2',
        active: true,
      }).success,
    ).toBe(true)
  })
  it('для роли «магазин» нужен магазин', () => {
    const r = inviteSchema.safeParse({ email: 'a@b.kz', name: 'А', role: 'store', store: null })
    expect(r.error?.issues[0]?.path).toEqual(['store'])
    expect(inviteSchema.safeParse({ email: 'a@b.kz', name: 'А', role: 'manager', store: null }).success).toBe(true)
  })
})
