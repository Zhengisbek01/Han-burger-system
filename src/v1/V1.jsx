import { useState } from 'react'
import Icon from '../Icon.jsx'
import { ME, STORE_TABS, PROD_TABS, STATE_LABEL, ORDER_STATUS, STATUS_FLOW, STEP_SHORT, pById, sById, short, fmt, kzt, itemsCount, stores } from '../shared.js'
import { storeRevenue } from '../logic.js'
import './v1.css'

const Step = ({ v, on }) => (
  <div className="v1-step">
    <button onClick={() => on(-1)}><Icon n="minus" s={16} w={2.4} /></button>
    <span>{v || 0}</span>
    <button onClick={() => on(1)}><Icon n="plus" s={16} w={2.4} /></button>
  </div>
)

export default function V1({ d, role, setRole, screen, setScreen }) {
  const tabs = role === 'store' ? STORE_TABS : PROD_TABS
  const title = tabs.find((t) => t.id === screen)?.label
  const [open, setOpen] = useState('p1')
  return (
    <div className="app v1">
      <header className="v1-top">
        <div className="v1-sub">{role === 'store' ? ME.name : 'HAN Burger · Производство'}</div>
        <div className="v1-row">
          <h1>{screen === 'plan' ? 'План на завтра' : title}</h1>
          <button className="v1-role" onClick={() => setRole(role === 'store' ? 'producer' : 'store')}>
            <Icon n="swap" s={15} /> {role === 'store' ? 'Магазин' : 'Владелец'}
          </button>
        </div>
      </header>
      <main className="scroll v1-body">
        {screen === 'stock' && <>
          <div className="v1-chips">
            <div className="v1-chip red"><b>{d.myStock.filter((r) => r.state === 'low').length}</b>заканчивается</div>
            <div className="v1-chip amber"><b>{d.myStock.filter((r) => r.state === 'excess').length}</b>излишек</div>
            <div className="v1-chip"><b>{fmt(d.myStock.reduce((a, r) => a + r.qty, 0))}</b>шт на полке</div>
          </div>
          <div className="v1-card list">
            {d.myStock.map((r) => (
              <div key={r.p.id} className="v1-li">
                <div className="v1-li-main">
                  <div className="v1-name">{short(r.p.name)}</div>
                  <div className="v1-bar"><i className={r.state} style={{ width: Math.min(100, r.cover * 50) + '%' }} /></div>
                  <div className="v1-muted">на {r.cover >= 10 ? '10+' : r.cover.toFixed(1)} дн · сегодня −{r.today}</div>
                </div>
                <div className="v1-li-end"><b>{r.qty}</b><span className={'v1-badge ' + r.state}>{STATE_LABEL[r.state]}</span></div>
              </div>
            ))}
          </div>
        </>}

        {screen === 'shift' && <>
          <div className="v1-card hero"><span>Смена 20.11 · {ME.manager}</span><b>{kzt(d.totals.shiftSum)}</b><small>{d.totals.shiftUnits} шт продано</small></div>
          <div className="v1-card list">
            {d.myStock.map((r) => (
              <div key={r.p.id} className="v1-li">
                <div className="v1-li-main"><div className="v1-name">{short(r.p.name)}</div><div className="v1-muted">{kzt(r.p.price)} · на полке {r.qty}</div></div>
                <Step v={d.shift[r.p.id]} on={(x) => d.addShift(r.p.id, x)} />
              </div>
            ))}
          </div>
          <div className="v1-space" />
        </>}

        {screen === 'order' && <>
          <button className="v1-ai" onClick={d.fillSuggested}><Icon n="spark" s={18} /> Заполнить по прогнозу на субботу</button>
          <div className="v1-card list">
            {d.myStock.map((r) => (
              <div key={r.p.id} className="v1-li">
                <div className="v1-li-main"><div className="v1-name">{short(r.p.name)}</div><div className="v1-muted">остаток {r.qty} · советуем <b className="v1-acc">{r.suggest}</b></div></div>
                <Step v={d.cart[r.p.id]} on={(x) => d.addCart(r.p.id, x * 5)} />
              </div>
            ))}
          </div>
          <div className="v1-space" />
        </>}

        {screen === 'delivery' && <>
          {d.myOrders.filter((o) => o.status !== 'delivered').map((o) => {
            const i = STATUS_FLOW.indexOf(o.status)
            return (
              <div key={o.id} className="v1-card pad">
                <div className="v1-row"><b>Заявка {o.id}</b><span className={'v1-badge ' + ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</span></div>
                <div className="v1-muted">{itemsCount(o)} шт · создана {o.created}</div>
                <div className="v1-track">{STATUS_FLOW.map((s, k) => <div key={s} className={k <= i ? 'on' : ''}><i />{STEP_SHORT[s]}</div>)}</div>
                {o.courier && <div className="v1-courier"><Icon n="truck" s={18} /> {o.courier} · {o.eta}</div>}
                {o.status === 'transit' && <button className="v1-btn" onClick={() => d.advance(o.id)}>Принять поставку</button>}
              </div>)
          })}
          <div className="v1-h">История</div>
          <div className="v1-card list">{d.myOrders.filter((o) => o.status === 'delivered').map((o) => (
            <div key={o.id} className="v1-li"><div className="v1-li-main"><div className="v1-name">{o.id}</div><div className="v1-muted">{o.created} · {itemsCount(o)} шт</div></div><span className="v1-badge green">Доставлена</span></div>))}
          </div>
        </>}

        {screen === 'plan' && <>
          <div className="v1-kpis">
            <div className="v1-card hero dark"><span>Отправить в магазины</span><b>{fmt(d.totals.ship)}</b><small>шт на сб, 21.11</small></div>
            <div className="v1-card hero"><span>Произвести</span><b>{fmt(d.totals.produce)}</b><small>с учётом склада</small></div>
          </div>
          <div className="v1-seg">{[0, 0.1, 0.2].map((x) => <button key={x} className={d.safety === x ? 'on' : ''} onClick={() => d.setSafety(x)}>запас {x * 100}%</button>)}</div>
          <div className="v1-card list">
            {d.planRows.map((r) => (
              <div key={r.p.id}>
                <button className="v1-li" onClick={() => setOpen(open === r.p.id ? '' : r.p.id)}>
                  <div className="v1-li-main"><div className="v1-name">{short(r.p.name)}</div><div className="v1-muted">прогноз {Math.round(r.fc)} · произвести <b className="v1-acc">{r.produce}</b></div></div>
                  <div className="v1-li-end"><b>{r.ship}</b><span className="v1-muted">отправить</span></div>
                </button>
                {open === r.p.id && <div className="v1-split">{stores.map((s) => (
                  <div key={s.id}><span>{s.name}</span><i style={{ width: (r.perStore[s.id] / Math.max(1, ...Object.values(r.perStore))) * 100 + '%' }} /><b>{r.perStore[s.id]}</b></div>))}
                </div>}
              </div>
            ))}
          </div>
          <button className="v1-btn wide" onClick={() => d.flash('Накладные сформированы для 5 магазинов')}>Сформировать накладные</button>
        </>}

        {screen === 'signals' && <>
          <div className="v1-h">Где заканчивается и где лишнее</div>
          <div className="v1-card list">{d.signals.slice(0, 10).map((x, i) => (
            <div key={i} className="v1-li"><div className={'v1-dot ' + x.st} /><div className="v1-li-main"><div className="v1-name">{x.s.name}</div><div className="v1-muted">{short(x.p.name)} · остаток {x.qty}, нужно ~{x.need}</div></div><span className={'v1-badge ' + x.st}>{STATE_LABEL[x.st]}</span></div>))}
          </div>
          <div className="v1-h">Перебросить между магазинами</div>
          <div className="v1-card list">{d.moves.map((m, i) => (
            <div key={i} className="v1-li"><div className="v1-li-main"><div className="v1-name">{m.qty} × {short(m.p.name)}</div><div className="v1-muted">{m.from.name} → {m.to.name}</div></div><button className="v1-mini" onClick={() => d.flash('Перемещение создано')}>Создать</button></div>))}
          </div>
        </>}

        {screen === 'stores' && <div className="v1-card list">{stores.map((s) => (
          <div key={s.id} className="v1-li"><div className="v1-ava">{s.name[0]}</div><div className="v1-li-main"><div className="v1-name">{s.name}</div><div className="v1-muted">{s.manager} · 7 дн {kzt(storeRevenue(s.id))}</div></div><div className="v1-li-end"><b>{d.storeShip(s.id)}</b><span className="v1-muted">завтра</span></div></div>))}
        </div>}
      </main>

      {(screen === 'shift' || screen === 'order') && (
        <div className="v1-foot">
          <div><small>{screen === 'shift' ? 'Итого за смену' : `${d.totals.cartUnits} шт в заявке`}</small><b>{kzt(screen === 'shift' ? d.totals.shiftSum : d.totals.cartSum)}</b></div>
          <button className="v1-btn" onClick={screen === 'shift' ? d.closeShift : d.submitOrder}>{screen === 'shift' ? 'Закрыть смену' : 'Отправить'}</button>
        </div>
      )}
      {d.toast && <div className="toast">{d.toast}</div>}
      <nav className="v1-tabs">
        {tabs.map((t) => (
          <button key={t.id} className={screen === t.id ? 'on' : ''} onClick={() => setScreen(t.id)}>
            <Icon n={t.icon} s={23} />{t.label}
            {t.id === 'signals' && d.totals.low > 0 && <em>{d.totals.low}</em>}
          </button>
        ))}
      </nav>
    </div>
  )
}
