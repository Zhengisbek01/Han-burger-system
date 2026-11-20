import { createRoot } from 'react-dom/client'
import { useState, useRef } from 'react'
import './styles.css'
import { products, stores, initialStock, initialWarehouse, initialOrders, STATUS_FLOW, company } from './data.js'
import * as P from './Producer.jsx'
import * as S from './Store.jsx'
import * as A from './Admin.jsx'
import { Toast } from './ui.jsx'

const NAV = {
  producer: [
    ['Главное', [['dashboard', '◎', 'Дашборд'], ['production', '⚙', 'Задание в цех'], ['shipment', '⇢', 'План отгрузки']]],
    ['Операции', [['orders', '☰', 'Заявки'], ['stock', '▦', 'Остатки'], ['reports', '↗', 'Продажи и отчёты']]],
    ['Справочники', [['stores', '⌂', 'Магазины'], ['products', '◫', 'Продукция и цены'], ['staff', '☺', 'Сотрудники']]],
  ],
  store: [['Магазин', [['s-home', '◎', 'Сводка'], ['s-stock', '▦', 'Остатки'], ['s-shift', '₸', 'Продажи за смену'], ['s-order', '+', 'Новая заявка'], ['s-delivery', '⇢', 'Доставка']]]],
  admin: [['Платформа', [['a-home', '◎', 'Компании'], ['a-plans', '₸', 'Тарифы и подписки'], ['a-health', '♥', 'Состояние'], ['a-new', '+', 'Подключить клиента']]]],
}
const HOME = { producer: 'dashboard', store: 's-home', admin: 'a-home' }

function App() {
  const [role, setRole] = useState('producer')
  const [page, setPage] = useState('dashboard')
  const [sid, setSid] = useState('s1')
  const [stock, setStock] = useState(initialStock)
  const [warehouse] = useState(initialWarehouse)
  const [orders, setOrders] = useState(initialOrders)
  const [safety, setSafety] = useState(0.15)
  const [prices, setPrices] = useState(Object.fromEntries(products.map((p) => [p.id, p.price])))
  const [shifts, setShifts] = useState({})
  const [msg, setMsg] = useState('')
  const t = useRef()
  const toast = (m) => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(''), 2600) }
  const go = (p) => { setPage(p); window.scrollTo(0, 0) }
  const switchRole = (r) => { setRole(r); go(HOME[r]) }

  const st = {
    stock, warehouse, orders, safety, setSafety, prices, setPrices, shifts,
    advance: (id) => setOrders((os) => os.map((o) => o.id !== id ? o : {
      ...o, status: STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1],
      ...(o.status === 'assembling' ? { courier: 'Нурбол, 777 ABC 01', eta: '09:30' } : {}),
    })),
    createOrder: (store, items, comment) => {
      const id = 'З-' + (1049 + orders.length - initialOrders.length)
      setOrders((os) => [{ id, store, created: '20.11 ' + new Date().toTimeString().slice(0, 5), status: 'new', items, comment }, ...os])
      return id
    },
    setStoreStock: (store, s) => setStock((all) => ({ ...all, [store]: s })),
    closeShift: (store, q, total, units) => setShifts((x) => ({ ...x, [store]: { total, units } })),
  }
  const newCount = orders.filter((o) => o.status === 'new').length
  const props = { st, toast, go, sid }
  const views = {
    dashboard: P.Dashboard, production: P.Production, shipment: P.Shipment, orders: P.Orders, stock: P.Stock, reports: P.Reports,
    stores: P.Stores, products: P.Products, staff: P.Staff,
    's-home': S.StoreHome, 's-stock': S.StoreStock, 's-shift': S.StoreShift, 's-order': S.StoreOrder, 's-delivery': S.StoreDelivery,
    'a-home': A.AdminHome, 'a-plans': A.AdminPlans, 'a-health': A.AdminHealth, 'a-new': A.AdminNew,
  }
  const View = views[page]
  const who = role === 'producer' ? company.name + ' · владелец' : role === 'store' ? stores.find((s) => s.id === sid).name : 'Суперадмин Qoima'

  return (
    <div className="app">
      <aside className="side">
        <div className="logo"><div className="logo-mark">Q</div><div>Qoima<small>{who}</small></div></div>
        {NAV[role].map(([sec, items]) => (
          <div key={sec} style={{ display: 'contents' }}>
            <div className="side-sec">{sec}</div>
            {items.map(([k, ico, l]) => (
              <button key={k} className={'nav' + (page === k ? ' on' : '')} onClick={() => go(k)}>
                <span className="ico">{ico}</span>{l}{k === 'orders' && newCount > 0 && <span className="badge">{newCount}</span>}
              </button>))}
          </div>))}
        <div className="side-foot">Прототип · данные демо<br />Пятница, 20 ноября 2026</div>
      </aside>
      <div className="main">
        <div className="top">
          <div className="roles">
            {[['producer', 'Производитель'], ['store', 'Магазин'], ['admin', 'Суперадмин']].map(([k, l]) => (
              <button key={k} className={role === k ? 'on' : ''} onClick={() => switchRole(k)}>{l}</button>))}
          </div>
          {role === 'store' && (
            <select className="inp" style={{ width: 'auto' }} value={sid} onChange={(e) => { setSid(e.target.value); go(page) }}>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>)}
          <div className="spacer" />
          <span className="chip-demo">Демо: HAN Burger, Астана</span>
        </div>
        <View key={page + sid} {...props} />
      </div>
      <Toast msg={msg} />
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
