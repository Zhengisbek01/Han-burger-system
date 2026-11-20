import { useMemo, useState } from 'react'
import { products, stores, initialStock, initialWarehouse, initialOrders, ORDER_STATUS, STATUS_FLOW, sales } from './data.js'
import { plan, transfers, stockState, cover, toSend, forecast, fmt, kzt, sum } from './logic.js'

export { products, stores, ORDER_STATUS, STATUS_FLOW, fmt, kzt, sum }
export const SID = 's2' // демо: магазин «Mega Silk Way»
export const ME = stores.find((s) => s.id === SID)
export const pById = Object.fromEntries(products.map((p) => [p.id, p]))
export const sById = Object.fromEntries(stores.map((s) => [s.id, s]))
export const short = (name) => name.replace(/,.*$/, '')
export const STATE_LABEL = { low: 'Заканчивается', ok: 'Норма', excess: 'Излишек' }

const seedOrders = initialOrders.map((o) =>
  o.id === 'З-1048' ? { ...o, status: 'assembling', courier: 'Нурбол, 777 ABC 01', eta: 'завтра 08:30' } : o).concat([
  { id: 'З-1041', store: 's2', created: '19.11 08:45', status: 'delivered', items: { p1: 50, p2: 45, p3: 25, p8: 10 }, comment: '' },
  { id: 'З-1036', store: 's2', created: '18.11 08:30', status: 'delivered', items: { p1: 48, p2: 40, p4: 20 }, comment: '' },
])

// демо: у «Mega Silk Way» часть позиций на исходе, соус — с излишком
const demoStock = { ...initialStock, s2: { ...initialStock.s2, p2: 4, p3: 3, p5: 2, p8: 34 } }

export function useDemo() {
  const [stock, setStock] = useState(demoStock)
  const [shift, setShift] = useState({})
  const [cart, setCart] = useState({})
  const [orders, setOrders] = useState(seedOrders)
  const [safety, setSafety] = useState(0.1)
  const [toast, setToast] = useState('')
  const flash = (t) => { setToast(t); clearTimeout(flash.t); flash.t = setTimeout(() => setToast(''), 2200) }

  const myStock = useMemo(() => products.map((p) => ({
    p, qty: stock[SID][p.id], state: stockState(SID, p.id, stock),
    cover: cover(SID, p.id, stock), suggest: toSend(SID, p.id, stock, safety),
    today: sales[SID][p.id][13],
  })), [stock, safety])

  const planRows = useMemo(() => plan(stock, initialWarehouse, safety), [stock, safety])
  const moves = useMemo(() => transfers(stock, safety), [stock, safety])
  const signals = useMemo(() => {
    const out = []
    for (const s of stores) for (const p of products) {
      const st = stockState(s.id, p.id, stock)
      if (st !== 'ok') out.push({ s, p, st, qty: stock[s.id][p.id], need: Math.round(forecast(s.id, p.id)) })
    }
    return out.sort((a, b) => (a.st === 'low' ? -1 : 1) - (b.st === 'low' ? -1 : 1))
  }, [stock])

  const totals = {
    ship: sum(planRows.map((r) => r.ship)),
    produce: sum(planRows.map((r) => r.produce)),
    low: signals.filter((x) => x.st === 'low').length,
    excess: signals.filter((x) => x.st === 'excess').length,
    shiftUnits: sum(Object.values(shift)),
    shiftSum: sum(Object.entries(shift).map(([pid, q]) => q * pById[pid].price)),
    cartUnits: sum(Object.values(cart)),
    cartSum: sum(Object.entries(cart).map(([pid, q]) => q * pById[pid].price)),
  }
  const storeShip = (sid) => sum(planRows.map((r) => r.perStore[sid]))
  const myOrders = orders.filter((o) => o.store === SID)

  const api = {
    setShiftQty: (pid, q) => setShift((x) => ({ ...x, [pid]: Math.max(0, Math.min(q, stock[SID][pid])) })),
    addShift: (pid, d) => setShift((x) => ({ ...x, [pid]: Math.max(0, Math.min((x[pid] || 0) + d, stock[SID][pid])) })),
    closeShift: () => {
      if (!totals.shiftUnits) return flash('Сначала внесите продажи')
      setStock((st) => ({ ...st, [SID]: Object.fromEntries(products.map((p) => [p.id, st[SID][p.id] - (shift[p.id] || 0)])) }))
      setShift({}); flash(`Смена закрыта: ${totals.shiftUnits} шт на ${kzt(totals.shiftSum)}`)
    },
    addCart: (pid, d) => setCart((x) => ({ ...x, [pid]: Math.max(0, (x[pid] || 0) + d) })),
    fillSuggested: () => { setCart(Object.fromEntries(myStock.filter((r) => r.suggest > 0).map((r) => [r.p.id, r.suggest]))); flash('Заявка заполнена по прогнозу') },
    submitOrder: () => {
      const items = Object.fromEntries(Object.entries(cart).filter(([, q]) => q > 0))
      if (!Object.keys(items).length) return flash('Заявка пустая')
      const id = 'З-' + (1049 + orders.length - seedOrders.length)
      setOrders((o) => [{ id, store: SID, created: '20.11 23:10', status: 'new', items, comment: '' }, ...o])
      setCart({}); flash(`Заявка ${id} отправлена`)
    },
    advance: (id) => setOrders((os) => os.map((o) => o.id === id ? { ...o, status: STATUS_FLOW[Math.min(STATUS_FLOW.indexOf(o.status) + 1, 4)] } : o)),
    setSafety, flash,
  }
  return { stock, shift, cart, orders, myOrders, safety, toast, myStock, planRows, moves, signals, totals, storeShip, ...api }
}

export const STORE_TABS = [
  { id: 'stock', label: 'Остатки', icon: 'box' },
  { id: 'shift', label: 'Смена', icon: 'cash' },
  { id: 'order', label: 'Заявка', icon: 'cart' },
  { id: 'delivery', label: 'Доставка', icon: 'truck' },
]
export const PROD_TABS = [
  { id: 'plan', label: 'План', icon: 'plan' },
  { id: 'signals', label: 'Сигналы', icon: 'bell' },
  { id: 'stores', label: 'Магазины', icon: 'store' },
]
export const itemsCount = (o) => sum(Object.values(o.items))
export const STEP_SHORT = { new: 'Новая', confirmed: 'Принята', assembling: 'Сборка', transit: 'В пути', delivered: 'Получена' }
export const coverTxt = (c) => (c >= 10 ? '10+' : c.toFixed(1)) + ' дн'
