// Демо-данные HAN Burger. Всё детерминировано, бэкенда нет.
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(2026)

export const TODAY = new Date('2026-11-20T12:00:00')
export const TOMORROW = new Date('2026-11-21T12:00:00')

export const company = {
  id: 'han', name: 'HAN Burger', bin: '210940012345', city: 'Астана',
  plan: 'Сеть', owner: 'Женисбек Қапан',
}

export const products = [
  { id: 'p1', name: 'Хан Классик', cat: 'Бургеры', unit: 'шт', price: 2490, cost: 1150, shelf: 1, base: 46 },
  { id: 'p2', name: 'Чизбургер Хан', cat: 'Бургеры', unit: 'шт', price: 2690, cost: 1240, shelf: 1, base: 40 },
  { id: 'p3', name: 'Дабл Хан', cat: 'Бургеры', unit: 'шт', price: 3490, cost: 1690, shelf: 1, base: 24 },
  { id: 'p4', name: 'Чикен Хан', cat: 'Бургеры', unit: 'шт', price: 2290, cost: 990, shelf: 1, base: 28 },
  { id: 'p5', name: 'Булка бриошь, 4 шт', cat: 'Булки', unit: 'уп', price: 990, cost: 380, shelf: 3, base: 14 },
  { id: 'p6', name: 'Булка с кунжутом, 6 шт', cat: 'Булки', unit: 'уп', price: 890, cost: 310, shelf: 3, base: 12 },
  { id: 'p7', name: 'Соус Хан фирменный, 250 г', cat: 'Соусы', unit: 'шт', price: 1290, cost: 420, shelf: 30, base: 9 },
  { id: 'p8', name: 'Соус сырный, 250 г', cat: 'Соусы', unit: 'шт', price: 1190, cost: 390, shelf: 30, base: 7 },
  { id: 'p9', name: 'Соус барбекю, 250 г', cat: 'Соусы', unit: 'шт', price: 1190, cost: 370, shelf: 30, base: 6 },
]

export const stores = [
  { id: 's1', name: 'Хан Шатыр', addr: 'пр. Туран, 37, фудкорт', k: 1.45, manager: 'Айгерим Нурланова', login: 'khanshatyr' },
  { id: 's2', name: 'Mega Silk Way', addr: 'пр. Кабанбай батыра, 62', k: 1.25, manager: 'Ерлан Сапаров', login: 'megasilk' },
  { id: 's3', name: 'Керуен', addr: 'ул. Достык, 9', k: 0.95, manager: 'Дана Касымова', login: 'keruen' },
  { id: 's4', name: 'Абу-Даби Плаза', addr: 'ул. Сыганак, 60', k: 0.8, manager: 'Мадияр Ахметов', login: 'abudhabi' },
  { id: 's5', name: 'Сарыарка', addr: 'пр. Сарыарка, 31/2', k: 0.65, manager: 'Асель Жумабаева', login: 'saryarka' },
]

// коэффициент дня недели (0 = вс)
export const DOW = [1.25, 0.9, 0.92, 0.95, 1.0, 1.15, 1.3]
export const DOW_NAMES = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

// 14 дней истории продаж, последний день — сегодня
export const days = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(TODAY); d.setDate(d.getDate() - (13 - i)); return d
})

// sales[storeId][productId] = [14 чисел]
export const sales = {}
for (const s of stores) {
  sales[s.id] = {}
  for (const p of products) {
    sales[s.id][p.id] = days.map((d) => {
      const noise = 0.8 + rand() * 0.4
      return Math.max(0, Math.round(p.base * s.k * DOW[d.getDay()] * noise))
    })
  }
}
// сюжет для демо: Хан Шатыр растёт по Дабл Хан, Сарыарка падает по Чизбургеру
sales.s1.p3 = sales.s1.p3.map((v, i) => Math.round(v * (0.8 + i * 0.04)))
sales.s5.p2 = sales.s5.p2.map((v, i) => Math.round(v * (1.2 - i * 0.04)))

// остатки на конец смены
export const initialStock = {}
const stockRatio = { s1: 0.15, s2: 0.6, s3: 1.6, s4: 0.4, s5: 2.4 }
for (const s of stores) {
  initialStock[s.id] = {}
  for (const p of products) {
    const avg = sales[s.id][p.id].slice(-7).reduce((a, b) => a + b, 0) / 7
    const r = stockRatio[s.id] * (0.5 + rand()) * (p.shelf > 1 ? 1.6 : 1)
    initialStock[s.id][p.id] = Math.round(avg * r)
  }
}
initialStock.s3.p1 = 74 // явный излишек
initialStock.s1.p2 = 0  // закончилось

// склад производителя (готовая продукция)
export const initialWarehouse = { p1: 20, p2: 15, p3: 0, p4: 10, p5: 40, p6: 30, p7: 120, p8: 85, p9: 60 }

export const initialOrders = [
  { id: 'З-1048', store: 's1', created: '20.11 18:40', status: 'new', items: { p1: 70, p2: 60, p3: 45, p4: 35 }, comment: 'Суббота, ожидаем поток' },
  { id: 'З-1047', store: 's4', created: '20.11 17:15', status: 'new', items: { p1: 40, p2: 30, p5: 10 }, comment: '' },
  { id: 'З-1046', store: 's2', created: '20.11 09:05', status: 'transit', items: { p1: 55, p2: 50, p3: 30, p7: 12 }, comment: '', courier: 'Нурбол, 777 ABC 01', eta: '11:30' },
  { id: 'З-1045', store: 's3', created: '20.11 08:50', status: 'delivered', items: { p1: 40, p4: 25, p6: 8 }, comment: '' },
  { id: 'З-1044', store: 's5', created: '19.11 19:20', status: 'delivered', items: { p1: 30, p2: 25, p8: 6 }, comment: '' },
  { id: 'З-1043', store: 's1', created: '19.11 18:55', status: 'delivered', items: { p1: 65, p2: 55, p3: 35, p4: 30 }, comment: '' },
]

export const ORDER_STATUS = {
  new: { label: 'Новая', tone: 'blue' },
  confirmed: { label: 'Подтверждена', tone: 'violet' },
  assembling: { label: 'Собирается', tone: 'amber' },
  transit: { label: 'В пути', tone: 'amber' },
  delivered: { label: 'Доставлена', tone: 'green' },
}
export const STATUS_FLOW = ['new', 'confirmed', 'assembling', 'transit', 'delivered']

export const employees = [
  { name: 'Женисбек Қапан', role: 'Владелец', scope: 'Вся компания', phone: '+7 701 *** 12 34', active: true },
  { name: 'Галым Оспанов', role: 'Технолог производства', scope: 'Цех', phone: '+7 702 *** 45 11', active: true },
  { name: 'Нурбол Абенов', role: 'Логист', scope: 'Доставка', phone: '+7 747 *** 09 87', active: true },
  { name: 'Айгерим Нурланова', role: 'Управляющий магазином', scope: 'Хан Шатыр', phone: '+7 705 *** 33 21', active: true },
  { name: 'Ерлан Сапаров', role: 'Управляющий магазином', scope: 'Mega Silk Way', phone: '+7 701 *** 77 00', active: true },
  { name: 'Дана Касымова', role: 'Управляющий магазином', scope: 'Керуен', phone: '+7 708 *** 52 19', active: true },
  { name: 'Мадияр Ахметов', role: 'Управляющий магазином', scope: 'Абу-Даби Плаза', phone: '+7 776 *** 14 62', active: true },
  { name: 'Асель Жумабаева', role: 'Управляющий магазином', scope: 'Сарыарка', phone: '+7 700 *** 81 45', active: false },
]

// ——— Платформа (суперадмин) ———
export const plans = [
  { id: 'start', name: 'Старт', price: 29900, stores: 'до 3 магазинов', users: 'до 5 пользователей', features: ['Заявки и остатки', 'Продажи за смену', 'Базовые отчёты'] },
  { id: 'biz', name: 'Бизнес', price: 79900, stores: 'до 10 магазинов', users: 'до 25 пользователей', features: ['Всё из «Старт»', 'Прогноз производства', 'План отгрузки', 'Экспорт в Excel / 1С'] },
  { id: 'net', name: 'Сеть', price: 199900, stores: 'без ограничений', users: 'без ограничений', features: ['Всё из «Бизнес»', 'Перераспределение излишков', 'API и интеграции', 'Персональный менеджер'] },
]

export const tenants = [
  { name: 'HAN Burger', city: 'Астана', plan: 'net', stores: 5, users: 8, status: 'active', since: '01.09.2026', paidTill: '01.12.2026', activity: 98 },
  { name: 'Нан-Ай пекарня', city: 'Астана', plan: 'biz', stores: 7, users: 14, status: 'active', since: '15.10.2026', paidTill: '15.12.2026', activity: 91 },
  { name: 'Самса Хаус', city: 'Алматы', plan: 'start', stores: 3, users: 4, status: 'trial', since: '12.11.2026', paidTill: '26.11.2026', activity: 64 },
  { name: 'Moloko Qazaq', city: 'Караганда', plan: 'biz', stores: 9, users: 19, status: 'active', since: '03.10.2026', paidTill: '03.12.2026', activity: 87 },
  { name: 'Shashlyk Point', city: 'Шымкент', plan: 'start', stores: 2, users: 3, status: 'overdue', since: '20.09.2026', paidTill: '20.11.2026', activity: 22 },
  { name: 'Таза Ет', city: 'Астана', plan: 'biz', stores: 4, users: 9, status: 'trial', since: '17.11.2026', paidTill: '01.12.2026', activity: 71 },
]
