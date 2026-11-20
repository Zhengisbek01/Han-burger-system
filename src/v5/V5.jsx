import { useState } from 'react'
import Icon from '../Icon.jsx'
import { ME, STORE_TABS, PROD_TABS, ORDER_STATUS, short, fmt, kzt, itemsCount, stores, sum } from '../shared.js'
import './v5.css'

const Num = ({ v, on }) => <input className="v5-in" inputMode="numeric" value={v || ''} placeholder="0" onChange={(e) => on(parseInt(e.target.value.replace(/\D/g, '') || '0'))} />

export default function V5({ d, role, setRole, screen, setScreen }) {
  const [menu, setMenu] = useState(false)
  const tabs = role === 'store' ? STORE_TABS : PROD_TABS
  const t = tabs.find((x) => x.id === screen)
  const abbr = (n) => n.replace('Mega Silk Way', 'Mega').replace('Абу-Даби Плаза', 'Абу-Д').replace('Хан Шатыр', 'Шатыр')
  return (
    <div className="app v5">
      <header className="v5-bar">
        <button onClick={() => setMenu(true)}><Icon n="menu" s={22} /></button>
        <div><b>{screen === 'plan' ? 'План отгрузки · 21.11' : t?.label}</b><small>{role === 'store' ? ME.name : 'HAN Burger'}</small></div>
        <span className="v5-sync">● онлайн</span>
      </header>
      <main className="scroll v5-body">
        {screen === 'stock' && <table className="v5-t">
          <thead><tr><th>Товар</th><th>Ост.</th><th>Прод.</th><th>Дней</th><th></th></tr></thead>
          <tbody>{d.myStock.map((r) => <tr key={r.p.id}><td>{short(r.p.name)}</td><td className={'n ' + r.state}>{r.qty}</td><td className="n">{r.today}</td><td className="n">{r.cover >= 10 ? '10+' : r.cover.toFixed(1)}</td><td><i className={'v5-dot ' + r.state} /></td></tr>)}</tbody>
          <tfoot><tr><td>Итого</td><td className="n">{sum(d.myStock.map((r) => r.qty))}</td><td className="n">{sum(d.myStock.map((r) => r.today))}</td><td colSpan="2" /></tr></tfoot>
        </table>}
        {screen === 'shift' && <table className="v5-t">
          <thead><tr><th>Товар</th><th>Цена</th><th>Ост.</th><th>Продано</th></tr></thead>
          <tbody>{d.myStock.map((r) => <tr key={r.p.id}><td>{short(r.p.name)}</td><td className="n">{fmt(r.p.price)}</td><td className="n">{r.qty}</td><td><Num v={d.shift[r.p.id]} on={(q) => d.setShiftQty(r.p.id, q)} /></td></tr>)}</tbody>
          <tfoot><tr><td>Итого</td><td colSpan="2" className="n">{kzt(d.totals.shiftSum)}</td><td className="n">{d.totals.shiftUnits}</td></tr></tfoot>
        </table>}
        {screen === 'order' && <table className="v5-t">
          <thead><tr><th>Товар</th><th>Ост.</th><th>Совет</th><th>Заказ</th></tr></thead>
          <tbody>{d.myStock.map((r) => <tr key={r.p.id}><td>{short(r.p.name)}</td><td className="n">{r.qty}</td><td className="n acc">{r.suggest}</td><td><Num v={d.cart[r.p.id]} on={(q) => d.addCart(r.p.id, q - (d.cart[r.p.id] || 0))} /></td></tr>)}</tbody>
          <tfoot><tr><td>Итого</td><td /><td className="n">{sum(d.myStock.map((r) => r.suggest))}</td><td className="n">{d.totals.cartUnits}</td></tr></tfoot>
        </table>}
        {screen === 'delivery' && <table className="v5-t">
          <thead><tr><th>№</th><th>Создана</th><th>Шт</th><th>Статус</th></tr></thead>
          <tbody>{d.myOrders.map((o) => <tr key={o.id} onClick={() => o.status === 'transit' && d.advance(o.id)}><td>{o.id}</td><td className="n">{o.created}</td><td className="n">{itemsCount(o)}</td><td><span className={'v5-st ' + ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</span></td></tr>)}</tbody>
        </table>}
        {screen === 'delivery' && d.myOrders.filter((o) => o.courier && o.status !== 'delivered').map((o) => <div key={o.id} className="v5-note">{o.id}: {o.courier}, прибытие {o.eta}. {o.status === 'transit' && 'Нажмите строку, чтобы принять.'}</div>)}
        {screen === 'plan' && <>
          <div className="v5-kpi"><div><small>Отгрузить</small><b>{fmt(d.totals.ship)}</b></div><div><small>Произвести</small><b>{fmt(d.totals.produce)}</b></div><div><small>Запас</small><select value={d.safety} onChange={(e) => d.setSafety(+e.target.value)}>{[0, 0.1, 0.2, 0.3].map((x) => <option key={x} value={x}>{x * 100}%</option>)}</select></div></div>
          <div className="v5-wide"><table className="v5-t mx">
            <thead><tr><th>Товар</th>{stores.map((s) => <th key={s.id}>{abbr(s.name)}</th>)}<th>Σ</th><th>Произв.</th></tr></thead>
            <tbody>{d.planRows.map((r) => <tr key={r.p.id}><td>{short(r.p.name)}</td>{stores.map((s) => <td key={s.id} className={'n' + (r.perStore[s.id] ? '' : ' z')}>{r.perStore[s.id]}</td>)}<td className="n b">{r.ship}</td><td className="n acc">{r.produce}</td></tr>)}</tbody>
            <tfoot><tr><td>Итого</td>{stores.map((s) => <td key={s.id} className="n">{d.storeShip(s.id)}</td>)}<td className="n">{d.totals.ship}</td><td className="n">{d.totals.produce}</td></tr></tfoot>
          </table></div>
          <div className="v5-note">Формула: отправить = прогноз × (1 + запас) − остаток. Прогноз = среднее за 7 дней × коэффициент субботы 1,3.</div>
        </>}
        {screen === 'signals' && <table className="v5-t">
          <thead><tr><th>Магазин</th><th>Товар</th><th>Ост.</th><th>Нужно</th></tr></thead>
          <tbody>{d.signals.map((x, i) => <tr key={i}><td><i className={'v5-dot ' + x.st} /> {abbr(x.s.name)}</td><td>{short(x.p.name)}</td><td className={'n ' + x.st}>{x.qty}</td><td className="n">{x.need}</td></tr>)}</tbody>
        </table>}
        {screen === 'stores' && <table className="v5-t">
          <thead><tr><th>Магазин</th><th>Управляющий</th><th>Завтра</th></tr></thead>
          <tbody>{stores.map((s) => <tr key={s.id}><td>{s.name}</td><td>{s.manager.split(' ')[0]}</td><td className="n b">{d.storeShip(s.id)}</td></tr>)}</tbody>
        </table>}
      </main>
      {(screen === 'shift' || screen === 'order' || screen === 'plan') && (
        <div className="v5-actions">
          {screen === 'order' && <button className="sec" onClick={d.fillSuggested}>Взять совет</button>}
          {screen === 'plan' && <button className="sec" onClick={() => d.flash('Выгружено в Excel')}>Excel</button>}
          <button onClick={screen === 'shift' ? d.closeShift : screen === 'order' ? d.submitOrder : () => d.flash('Накладные сформированы')}>{screen === 'shift' ? 'Закрыть смену' : screen === 'order' ? 'Отправить заявку' : 'Утвердить план'}</button>
        </div>
      )}
      {d.toast && <div className="toast">{d.toast}</div>}
      {menu && <div className="v5-scrim" onClick={() => setMenu(false)}>
        <nav className="v5-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="v5-dh">QOIMA<small>{role === 'store' ? ME.name : 'HAN Burger'}</small></div>
          {tabs.map((x) => <button key={x.id} className={x.id === screen ? 'on' : ''} onClick={() => { setScreen(x.id); setMenu(false) }}><Icon n={x.icon} s={20} />{x.label}</button>)}
          <hr />
          <button onClick={() => { setRole(role === 'store' ? 'producer' : 'store'); setMenu(false) }}><Icon n="swap" s={20} />{role === 'store' ? 'Кабинет производителя' : 'Кабинет магазина'}</button>
        </nav>
      </div>}
    </div>
  )
}
