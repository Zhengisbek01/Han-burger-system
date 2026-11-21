import { describe, expect, it } from 'vitest'
import { buildModel } from './model'
import { addDays, isoDate } from '@/shared/lib/format'
import type { Order, Product, Sale, Store } from '@/shared/types/domain'

const now = new Date(2026, 10, 20, 12) // пятница, завтра суббота
const store = (id: string): Store => ({ id, company_id: 'c', name: id, address: null, active: true, created_at: '' })
const product = (id: string, shelf = 1): Product => ({
  id,
  company_id: 'c',
  name: id,
  category: 'x',
  unit: 'шт',
  price: 1000,
  cost: 400,
  shelf_days: shelf,
  active: true,
  sort: 0,
  created_at: '',
})
const daily = (sid: string, pid: string, perDay: number, days = 7): Sale[] =>
  Array.from({ length: days }, (_, i) => ({
    store_id: sid,
    product_id: pid,
    shift_date: isoDate(addDays(now, -i)),
    qty: perDay,
    price: 1000,
  }))

describe('прогноз', () => {
  const base = { stores: [store('s1')], products: [product('p1')], warehouse: [], safety: 0.15, now }

  it('отправить = ⌈среднее × (1+запас)⌉ − остаток', () => {
    const m = buildModel({
      ...base,
      sales: daily('s1', 'p1', 20),
      storeStock: [{ store_id: 's1', product_id: 'p1', qty: 5, updated_at: '' }],
    })
    expect(m.dowK).toBe(1) // меньше 14 дней истории
    expect(m.need('s1', 'p1')).toBe(23) // 20 × 1.15
    expect(m.toSend('s1', 'p1')).toBe(18)
  })

  it('учитывает незакрытые заявки и не уходит в минус', () => {
    const orders = [
      { id: 'o', store_id: 's1', status: 'transit', items: [{ product_id: 'p1', qty: 10, price: 1000 }] },
    ] as unknown as Order[]
    const m = buildModel({ ...base, sales: daily('s1', 'p1', 20), storeStock: [], orders })
    expect(m.toSend('s1', 'p1')).toBe(13)
    const done = [{ ...orders[0]!, status: 'delivered' }] as Order[]
    expect(buildModel({ ...base, sales: daily('s1', 'p1', 20), storeStock: [], orders: done }).toSend('s1', 'p1')).toBe(
      23,
    )
    const big = buildModel({
      ...base,
      sales: daily('s1', 'p1', 20),
      storeStock: [{ store_id: 's1', product_id: 'p1', qty: 500, updated_at: '' }],
    })
    expect(big.toSend('s1', 'p1')).toBe(0)
  })

  it('среднее только по дням, когда магазин работал', () => {
    const m = buildModel({ ...base, sales: daily('s1', 'p1', 30, 3), storeStock: [] })
    expect(m.avg7('s1', 'p1')).toBe(30)
  })

  it('произвести = Σ отправить − склад', () => {
    const m = buildModel({
      ...base,
      stores: [store('s1'), store('s2')],
      sales: [...daily('s1', 'p1', 10), ...daily('s2', 'p1', 10)],
      storeStock: [],
      warehouse: [{ product_id: 'p1', qty: 5 }],
    })
    expect(m.plan[0]!.ship).toBe(24)
    expect(m.plan[0]!.produce).toBe(19)
  })

  it('коэффициент дня недели из истории ≥ 14 дней', () => {
    const sales: Sale[] = Array.from({ length: 14 }, (_, i) => {
      const d = addDays(now, -i)
      return { store_id: 's1', product_id: 'p1', shift_date: isoDate(d), qty: d.getDay() === 6 ? 40 : 20, price: 1000 }
    })
    const m = buildModel({ ...base, sales, storeStock: [] })
    expect(m.dowK).toBeGreaterThan(1.5) // суббота продаёт вдвое больше
  })

  it('статусы остатков и перераспределение излишков', () => {
    const m = buildModel({
      ...base,
      stores: [store('s1'), store('s2')],
      sales: [...daily('s1', 'p1', 20), ...daily('s2', 'p1', 20)],
      storeStock: [
        { store_id: 's1', product_id: 'p1', qty: 80, updated_at: '' },
        { store_id: 's2', product_id: 'p1', qty: 2, updated_at: '' },
      ],
    })
    expect(m.state('s1', 'p1')).toBe('excess')
    expect(m.state('s2', 'p1')).toBe('low')
    expect(m.transfers[0]).toMatchObject({ from: { id: 's1' }, to: { id: 's2' }, qty: 21 })
  })

  it('без продаж: нет прогноза и статус none', () => {
    const m = buildModel({ ...base, sales: [], storeStock: [] })
    expect(m.toSend('s1', 'p1')).toBe(0)
    expect(m.state('s1', 'p1')).toBe('none')
  })
})
