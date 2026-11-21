import { addDays, isoDate, parseIso, sum } from '@/shared/lib/format'
import type { Order, Product, Sale, Store, StoreStock, WarehouseStock } from '@/shared/types/domain'

/**
 * Модель прогноза.
 *  нужно(магазин, товар)     = ⌈ среднее за 7 дней × коэффициент дня недели × (1 + страховой запас) ⌉
 *  отправить(магазин, товар) = max(0, нужно − остаток − уже заказано в незакрытых заявках)
 *  произвести(товар)         = max(0, Σ отправить − склад производителя)
 * Среднее считается по дням, когда магазин закрывал смену (нерабочие дни не занижают прогноз).
 * Коэффициент дня недели берётся из истории компании, если есть ≥ 14 дней данных, иначе 1.
 */
export type StockState = 'low' | 'ok' | 'excess' | 'none'

export interface ModelInput {
  stores: Store[]
  products: Product[]
  sales: Sale[]
  storeStock: StoreStock[]
  warehouse: WarehouseStock[]
  orders?: Order[]
  safety: number
  history?: number
  now?: Date
}

export interface PlanRow {
  product: Product
  perStore: Record<string, number>
  ship: number
  forecast: number
  warehouse: number
  produce: number
}

export interface Transfer {
  product: Product
  from: Store
  to: Store
  qty: number
}

const OPEN: ReadonlyArray<string> = ['new', 'confirmed', 'assembling', 'transit']
const MIN_DAYS_FOR_DOW = 14

export function buildModel({
  stores,
  products,
  sales,
  storeStock,
  warehouse,
  orders = [],
  safety,
  history = 28,
  now = new Date(),
}: ModelInput) {
  const tomorrow = addDays(now, 1)
  const days = Array.from({ length: history }, (_, i) => isoDate(addDays(now, i - history + 1)))
  const last7 = new Set(days.slice(-7))
  const prev7 = new Set(days.slice(-14, -7))

  const qty = new Map<string, number>() // `${store}|${product}|${date}`
  const opened = new Map<string, Set<string>>()
  const totalByDay = new Map<string, number>()
  for (const r of sales) {
    const k = `${r.store_id}|${r.product_id}|${r.shift_date}`
    qty.set(k, (qty.get(k) ?? 0) + Number(r.qty))
    if (!opened.has(r.store_id)) opened.set(r.store_id, new Set())
    opened.get(r.store_id)!.add(r.shift_date)
    totalByDay.set(r.shift_date, (totalByDay.get(r.shift_date) ?? 0) + Number(r.qty))
  }
  const stock = new Map(storeStock.map((r) => [`${r.store_id}|${r.product_id}`, Number(r.qty)]))
  const wh = new Map(warehouse.map((r) => [r.product_id, Number(r.qty)]))
  const pending = new Map<string, number>()
  for (const o of orders)
    if (OPEN.includes(o.status))
      for (const i of o.items) {
        const k = `${o.store_id}|${i.product_id}`
        pending.set(k, (pending.get(k) ?? 0) + Number(i.qty))
      }

  // коэффициент дня недели
  const byDow = Array<number>(7).fill(0)
  const cntDow = Array<number>(7).fill(0)
  for (const [d, q] of totalByDay) {
    const w = parseIso(d).getDay()
    byDow[w] = (byDow[w] ?? 0) + q
    cntDow[w] = (cntDow[w] ?? 0) + 1
  }
  const daysWithData = totalByDay.size
  const overall = daysWithData ? sum([...totalByDay.values()]) / daysWithData : 0
  const tw = tomorrow.getDay()
  const dowK =
    daysWithData >= MIN_DAYS_FOR_DOW && (cntDow[tw] ?? 0) > 0 && overall > 0 ? byDow[tw]! / cntDow[tw]! / overall : 1

  const avg7 = (sid: string, pid: string): number => {
    const open = [...(opened.get(sid) ?? [])].filter((d) => last7.has(d)).length
    if (!open) return 0
    let q = 0
    for (const d of last7) q += qty.get(`${sid}|${pid}|${d}`) ?? 0
    return q / open
  }
  const forecast = (sid: string, pid: string) => avg7(sid, pid) * dowK
  const need = (sid: string, pid: string) => Math.ceil(forecast(sid, pid) * (1 + safety))
  const stockOf = (sid: string, pid: string) => stock.get(`${sid}|${pid}`) ?? 0
  const pendingOf = (sid: string, pid: string) => pending.get(`${sid}|${pid}`) ?? 0
  const toSend = (sid: string, pid: string) => Math.max(0, need(sid, pid) - stockOf(sid, pid) - pendingOf(sid, pid))
  const cover = (sid: string, pid: string) => {
    const a = avg7(sid, pid)
    return a ? stockOf(sid, pid) / a : stockOf(sid, pid) ? Infinity : 0
  }
  const shelf = new Map(products.map((p) => [p.id, p.shelf_days]))
  const state = (sid: string, pid: string): StockState => {
    if (!avg7(sid, pid)) return stockOf(sid, pid) ? 'ok' : 'none'
    const c = cover(sid, pid)
    if (c < 0.5) return 'low'
    if (c > Math.max(2, (shelf.get(pid) ?? 1) * 0.8)) return 'excess'
    return 'ok'
  }

  const plan: PlanRow[] = products.map((p) => {
    const perStore = Object.fromEntries(stores.map((s) => [s.id, toSend(s.id, p.id)]))
    const ship = sum(Object.values(perStore))
    const w = wh.get(p.id) ?? 0
    return {
      product: p,
      perStore,
      ship,
      forecast: sum(stores.map((s) => forecast(s.id, p.id))),
      warehouse: w,
      produce: Math.max(0, ship - w),
    }
  })

  const transfers: Transfer[] = []
  for (const p of products) {
    const ex: { s: Store; qty: number }[] = []
    const df: { s: Store; qty: number }[] = []
    for (const s of stores) {
      const n = forecast(s.id, p.id) * (1 + safety)
      const have = stockOf(s.id, p.id)
      if (state(s.id, p.id) === 'excess' && have - n > 3) ex.push({ s, qty: Math.round(have - n) })
      if (n > 0 && have + pendingOf(s.id, p.id) < n * 0.6)
        df.push({ s, qty: Math.ceil(n - have - pendingOf(s.id, p.id)) })
    }
    ex.sort((a, b) => b.qty - a.qty)
    df.sort((a, b) => b.qty - a.qty)
    while (ex.length && df.length) {
      const e = ex[0]!
      const d = df[0]!
      const q = Math.min(e.qty, d.qty)
      transfers.push({ product: p, from: e.s, to: d.s, qty: q })
      e.qty -= q
      d.qty -= q
      if (e.qty <= 3) ex.shift()
      if (d.qty <= 0) df.shift()
    }
  }

  const inSet = (set: Set<string>, r: Sale) => set.has(r.shift_date)
  const revenueByDay = days.map((d) => sum(sales.filter((r) => r.shift_date === d).map((r) => r.qty * r.price)))
  const revenue = (set: Set<string>, sid?: string) =>
    sum(sales.filter((r) => inSet(set, r) && (!sid || r.store_id === sid)).map((r) => r.qty * r.price))
  const units = (set: Set<string>, pid: string, sid?: string) =>
    sum(sales.filter((r) => inSet(set, r) && r.product_id === pid && (!sid || r.store_id === sid)).map((r) => r.qty))

  return {
    tomorrow,
    days,
    last7,
    prev7,
    dowK,
    daysWithData,
    avg7,
    forecast,
    need,
    stockOf,
    pendingOf,
    toSend,
    cover,
    state,
    warehouseOf: (pid: string) => wh.get(pid) ?? 0,
    plan,
    transfers,
    revenueByDay,
    revenue,
    units,
  }
}

export type Model = ReturnType<typeof buildModel>
