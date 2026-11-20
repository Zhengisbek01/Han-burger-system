import { products, stores, sales, DOW, TOMORROW } from './data.js'

export const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ')
export const kzt = (n) => fmt(n) + ' ₸'
export const sum = (a) => a.reduce((x, y) => x + y, 0)

export const avg7 = (sid, pid) => sum(sales[sid][pid].slice(-7)) / 7

// Прогноз на завтра: среднее за 7 дней × коэффициент дня недели завтра
export function forecast(sid, pid) {
  return avg7(sid, pid) * DOW[TOMORROW.getDay()]
}

// Отправить = прогноз × (1 + страховой запас) − остаток
export function toSend(sid, pid, stock, safety) {
  const need = forecast(sid, pid) * (1 + safety) - (stock[sid]?.[pid] ?? 0)
  return Math.max(0, Math.ceil(need))
}

// Сколько дней продаж покрывает остаток
export function cover(sid, pid, stock) {
  const a = avg7(sid, pid)
  return a ? (stock[sid]?.[pid] ?? 0) / a : 99
}

export function stockState(sid, pid, stock) {
  const p = products.find((x) => x.id === pid)
  const c = cover(sid, pid, stock)
  if (c < 0.5) return 'low'
  if (c > Math.max(2, p.shelf * 0.8)) return 'excess'
  return 'ok'
}

export function plan(stock, warehouse, safety) {
  const rows = products.map((p) => {
    const perStore = Object.fromEntries(stores.map((s) => [s.id, toSend(s.id, p.id, stock, safety)]))
    const ship = sum(Object.values(perStore))
    const fc = sum(stores.map((s) => forecast(s.id, p.id)))
    const produce = Math.max(0, ship - (warehouse[p.id] ?? 0))
    return { p, perStore, ship, fc, produce }
  })
  return rows
}

// Предложения по перераспределению излишков между магазинами
export function transfers(stock, safety) {
  const out = []
  for (const p of products) {
    const excess = [], deficit = []
    for (const s of stores) {
      const need = forecast(s.id, p.id) * (1 + safety)
      const have = stock[s.id][p.id]
      const diff = Math.round(have - need)
      if (stockState(s.id, p.id, stock) === 'excess' && diff > 3) excess.push({ s, qty: diff })
      if (have < need * 0.6) deficit.push({ s, qty: Math.ceil(need - have) })
    }
    excess.sort((a, b) => b.qty - a.qty); deficit.sort((a, b) => b.qty - a.qty)
    while (excess.length && deficit.length) {
      const e = excess[0], d = deficit[0]
      const q = Math.min(e.qty, d.qty)
      out.push({ p, from: e.s, to: d.s, qty: q })
      e.qty -= q; d.qty -= q
      if (e.qty <= 3) excess.shift()
      if (d.qty <= 0) deficit.shift()
    }
  }
  return out
}

export const revenueByDay = () =>
  sales.s1.p1.map((_, i) => sum(stores.flatMap((s) => products.map((p) => sales[s.id][p.id][i] * p.price))))

export const storeRevenue = (sid, from = -7) =>
  sum(products.map((p) => sum(sales[sid][p.id].slice(from)) * p.price))

export const productUnits = (pid, from = -7) => sum(stores.map((s) => sum(sales[s.id][pid].slice(from))))
