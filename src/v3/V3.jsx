import Icon from '../Icon.jsx'
import { ME, STATE_LABEL, ORDER_STATUS, STATUS_FLOW, STEP_SHORT, short, fmt, kzt, itemsCount, stores, coverTxt } from '../shared.js'
import './v3.css'

const COLORS = { 'Бургеры': '#e8401c', 'Булки': '#f2a516', 'Соусы': '#7a3b1d' }
const Ava = ({ p }) => <div className="v3-ava" style={{ background: COLORS[p.cat] }}>{p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>

export default function V3({ d, role, setRole, screen, setScreen }) {
  const store = role === 'store'
  const nav = store
    ? [['stock', 'Остатки', 'box'], ['shift', 'Смена', 'cash'], null, ['delivery', 'Доставка', 'truck'], ['me', 'Профиль', 'user']]
    : [['plan', 'План', 'plan'], ['signals', 'Сигналы', 'bell'], null, ['stores', 'Магазины', 'store'], ['me', 'Профиль', 'user']]
  const go = (id) => id === 'me' ? setRole(store ? 'producer' : 'store') : setScreen(id)
  const low = d.myStock.filter((r) => r.state === 'low')
  return (
    <div className="app v3">
      <main className="scroll">
        <header className="v3-hero">
          <div className="v3-logo">HAN<span>BURGER</span></div>
          <h1>{store ? `Сәлем, ${ME.manager.split(' ')[0]}!` : 'Сәлем, Женисбек!'}</h1>
          <p>{store ? `${ME.name} · смена 20 ноября` : 'Завтра суббота — ждём поток, план +30%'}</p>
          {store && screen === 'stock' && <div className="v3-banner"><b>{low.length} позиций на исходе</b><span>Соберите заявку до 20:00, чтобы получить утром</span><button onClick={() => setScreen('order')}>Собрать</button></div>}
          {!store && screen === 'plan' && <div className="v3-banner"><b>{fmt(d.totals.produce)} шт в производство</b><span>{fmt(d.totals.ship)} шт уедет в 5 магазинов</span><button onClick={() => d.flash('Задание отправлено в цех')}>В цех</button></div>}
        </header>
        <div className="v3-body">
          {screen === 'stock' && <>
            <h2>Что на полке</h2>
            {d.myStock.map((r) => (
              <div key={r.p.id} className="v3-item"><Ava p={r.p} />
                <div className="v3-main"><b>{short(r.p.name)}</b><small>{coverTxt(r.cover)} запаса</small></div>
                <div className={'v3-qty ' + r.state}>{r.qty}<small>{STATE_LABEL[r.state]}</small></div>
              </div>))}
          </>}
          {screen === 'shift' && <>
            <div className="v3-sum"><span>Касса смены</span><b>{kzt(d.totals.shiftSum)}</b><small>{d.totals.shiftUnits} шт</small></div>
            <h2>Сколько продали</h2>
            {d.myStock.map((r) => (
              <div key={r.p.id} className="v3-item"><Ava p={r.p} />
                <div className="v3-main"><b>{short(r.p.name)}</b><small>{kzt(r.p.price)}</small></div>
                <div className="v3-step"><button onClick={() => d.addShift(r.p.id, -1)}>−</button><b>{d.shift[r.p.id] || 0}</b><button onClick={() => d.addShift(r.p.id, 1)}>+</button></div>
              </div>))}
            <button className="v3-btn" onClick={d.closeShift}>Закрыть смену</button>
          </>}
          {screen === 'order' && <>
            <h2>Заявка на субботу</h2>
            <button className="v3-magic" onClick={d.fillSuggested}><Icon n="spark" s={20} /><div><b>Умная заявка</b><small>посчитаем по продажам за 7 дней</small></div></button>
            {d.myStock.map((r) => (
              <div key={r.p.id} className="v3-item"><Ava p={r.p} />
                <div className="v3-main"><b>{short(r.p.name)}</b><small>совет: {r.suggest} {r.p.unit}</small></div>
                <div className="v3-step"><button onClick={() => d.addCart(r.p.id, -5)}>−</button><b>{d.cart[r.p.id] || 0}</b><button onClick={() => d.addCart(r.p.id, 5)}>+</button></div>
              </div>))}
            <button className="v3-btn" onClick={d.submitOrder}>Отправить · {kzt(d.totals.cartSum)}</button>
          </>}
          {screen === 'delivery' && <>
            <h2>Мои заявки</h2>
            {d.myOrders.map((o) => {
              const i = STATUS_FLOW.indexOf(o.status)
              return (
                <div key={o.id} className="v3-ord">
                  <div className="v3-row"><b>{o.id}</b><span className={'v3-tag ' + ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</span></div>
                  <small>{itemsCount(o)} шт · {o.created}{o.eta ? ` · прибудет ${o.eta}` : ''}</small>
                  {o.status !== 'delivered' && <div className="v3-road">{STATUS_FLOW.map((s, k) => <div key={s} className={k <= i ? 'on' : ''}><i>{k < i ? '✓' : k + 1}</i>{STEP_SHORT[s]}</div>)}</div>}
                  {o.status === 'transit' && <button className="v3-btn" onClick={() => d.advance(o.id)}>Поставка принята</button>}
                </div>)
            })}
          </>}
          {screen === 'plan' && <>
            <div className="v3-chips">{[0, 0.1, 0.2].map((x) => <button key={x} className={d.safety === x ? 'on' : ''} onClick={() => d.setSafety(x)}>запас {x * 100}%</button>)}</div>
            <h2>По магазинам</h2>
            <div className="v3-carousel">{stores.map((s) => (
              <div key={s.id} className="v3-scard"><small>{s.name}</small><b>{d.storeShip(s.id)}</b><span>шт завтра</span></div>))}</div>
            <h2>По продуктам</h2>
            {d.planRows.map((r) => (
              <div key={r.p.id} className="v3-item"><Ava p={r.p} />
                <div className="v3-main"><b>{short(r.p.name)}</b><small>испечь {r.produce} · склад {r.ship - r.produce}</small></div>
                <div className="v3-qty">{r.ship}<small>отгрузить</small></div>
              </div>))}
          </>}
          {screen === 'signals' && <>
            <h2>Внимание</h2>
            {d.signals.slice(0, 10).map((x, i) => (
              <div key={i} className="v3-item"><Ava p={x.p} /><div className="v3-main"><b>{x.s.name}</b><small>{short(x.p.name)} · {x.qty} шт</small></div><span className={'v3-tag ' + (x.st === 'low' ? 'red' : 'amber')}>{STATE_LABEL[x.st]}</span></div>))}
            {d.moves.length > 0 && <h2>Перебросить излишки</h2>}
            {d.moves.map((m, i) => <div key={i} className="v3-move"><b>{m.qty} × {short(m.p.name)}</b><small>{m.from.name} → {m.to.name}</small></div>)}
          </>}
          {screen === 'stores' && <>
            <h2>Магазины сети</h2>
            {stores.map((s) => <div key={s.id} className="v3-item"><div className="v3-ava" style={{ background: '#2b1a12' }}>{s.name[0]}</div><div className="v3-main"><b>{s.name}</b><small>{s.addr}</small></div><div className="v3-qty">{d.storeShip(s.id)}<small>завтра</small></div></div>)}
          </>}
        </div>
      </main>
      {d.toast && <div className="toast">{d.toast}</div>}
      <nav className="v3-nav">
        {nav.map((t, i) => t === null
          ? <button key="fab" className="v3-fab" onClick={() => store ? setScreen('order') : d.flash('Накладные сформированы')}><Icon n={store ? 'cart' : 'truck'} s={28} w={2.2} /></button>
          : <button key={t[0]} className={screen === t[0] ? 'on' : ''} onClick={() => go(t[0])}><Icon n={t[2]} s={22} w={2} />{t[1]}</button>)}
      </nav>
    </div>
  )
}
