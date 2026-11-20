import Icon from '../Icon.jsx'
import { ME, STORE_TABS, PROD_TABS, STATE_LABEL, ORDER_STATUS, STATUS_FLOW, STEP_SHORT, short, fmt, kzt, itemsCount, stores, coverTxt } from '../shared.js'
import './v2.css'

export default function V2({ d, role, setRole, screen, setScreen }) {
  const tabs = role === 'store' ? STORE_TABS : PROD_TABS
  const max = Math.max(...d.planRows.map((r) => r.ship))
  return (
    <div className="app v2">
      <header className="v2-top">
        <div className="v2-brand"><i />QOIMA</div>
        <button className="v2-role" onClick={() => setRole(role === 'store' ? 'producer' : 'store')}>{role === 'store' ? ME.name : 'ЦЕХ'} <Icon n="swap" s={14} /></button>
      </header>
      <nav className="v2-tabs">{tabs.map((t) => (
        <button key={t.id} className={screen === t.id ? 'on' : ''} onClick={() => setScreen(t.id)}>{t.label}{t.id === 'signals' && <em>{d.totals.low}</em>}</button>))}
      </nav>
      <main className="scroll v2-body">
        {screen === 'stock' && <>
          <div className="v2-big"><span>на полке</span><b>{d.myStock.reduce((a, r) => a + r.qty, 0)}</b><span>шт · {d.myStock.filter((r) => r.state === 'low').length} позиций на исходе</span></div>
          <div className="v2-grid">{d.myStock.map((r) => (
            <div key={r.p.id} className={'v2-tile ' + r.state}>
              <div className="v2-tname">{short(r.p.name)}</div>
              <b>{r.qty}</b>
              <div className="v2-tfoot"><span>{STATE_LABEL[r.state]}</span><span>{coverTxt(r.cover)}</span></div>
            </div>))}
          </div>
        </>}
        {screen === 'shift' && <>
          <div className="v2-big"><span>продано за смену</span><b>{d.totals.shiftUnits}</b><span>{kzt(d.totals.shiftSum)}</span></div>
          {d.myStock.map((r) => (
            <div key={r.p.id} className="v2-cnt">
              <button onClick={() => d.addShift(r.p.id, -1)}><Icon n="minus" s={26} w={2.6} /></button>
              <div><div className="v2-tname">{short(r.p.name)}</div><b>{d.shift[r.p.id] || 0}</b></div>
              <button className="plus" onClick={() => d.addShift(r.p.id, 1)}><Icon n="plus" s={26} w={2.6} /></button>
            </div>))}
          <button className="v2-cta" onClick={d.closeShift}>ЗАКРЫТЬ СМЕНУ</button>
        </>}
        {screen === 'order' && <>
          <button className="v2-ghost" onClick={d.fillSuggested}><Icon n="spark" s={18} /> Авто-заявка по прогнозу</button>
          {d.myStock.map((r) => (
            <div key={r.p.id} className="v2-orow">
              <div className="v2-oname">{short(r.p.name)}<small>ост {r.qty} · совет {r.suggest}</small></div>
              <button onClick={() => d.addCart(r.p.id, -5)}>−5</button>
              <b>{d.cart[r.p.id] || 0}</b>
              <button onClick={() => d.addCart(r.p.id, 5)}>+5</button>
            </div>))}
          <button className="v2-cta" onClick={d.submitOrder}>ОТПРАВИТЬ · {d.totals.cartUnits} ШТ</button>
        </>}
        {screen === 'delivery' && d.myOrders.map((o) => {
          const i = STATUS_FLOW.indexOf(o.status)
          return (
            <div key={o.id} className={'v2-ord' + (o.status === 'delivered' ? ' done' : '')}>
              <div className="v2-ohead"><span>{o.id}</span><span className={'v2-st ' + ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</span></div>
              {o.status !== 'delivered' && <>
                <div className="v2-eta">{o.eta || '—'}<small>{o.courier || 'ожидает сборки'}</small></div>
                <div className="v2-prog">{STATUS_FLOW.map((s, k) => <i key={s} className={k <= i ? 'on' : ''} title={STEP_SHORT[s]} />)}</div>
                {o.status === 'transit' && <button className="v2-cta" onClick={() => d.advance(o.id)}>ПРИНЯТЬ ПОСТАВКУ</button>}
              </>}
              <small className="v2-omuted">{itemsCount(o)} шт · {o.created}</small>
            </div>)
        })}
        {screen === 'plan' && <>
          <div className="v2-pair">
            <div className="v2-big"><span>отгрузить завтра</span><b>{d.totals.ship}</b></div>
            <div className="v2-big alt"><span>произвести</span><b>{d.totals.produce}</b></div>
          </div>
          <div className="v2-safe">страховой запас {[0, 0.1, 0.2].map((x) => <button key={x} className={d.safety === x ? 'on' : ''} onClick={() => d.setSafety(x)}>{x * 100}%</button>)}</div>
          {d.planRows.map((r) => (
            <div key={r.p.id} className="v2-prow">
              <div className="v2-prt"><span>{short(r.p.name)}</span><b>{r.ship}</b></div>
              <div className="v2-pbar"><i style={{ width: (r.ship / max) * 100 + '%' }} /></div>
              <div className="v2-pst">{stores.map((s) => <span key={s.id}>{s.name.split(' ')[0]} <b>{r.perStore[s.id]}</b></span>)}</div>
              <div className="v2-omuted">произвести {r.produce} · прогноз {Math.round(r.fc)}</div>
            </div>))}
        </>}
        {screen === 'signals' && d.signals.slice(0, 12).map((x, i) => (
          <div key={i} className={'v2-sig ' + x.st}><b>{x.st === 'low' ? x.qty : '+' + (x.qty - x.need)}</b><div><div>{short(x.p.name)}</div><small>{x.s.name} · {STATE_LABEL[x.st]}</small></div></div>))}
        {screen === 'stores' && stores.map((s) => (
          <div key={s.id} className="v2-store"><div><div className="v2-tname">{s.name}</div><small>{s.manager}</small></div><b>{d.storeShip(s.id)}</b></div>))}
      </main>
      {d.toast && <div className="toast v2-toast">{d.toast}</div>}
    </div>
  )
}
