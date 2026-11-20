import Icon from '../Icon.jsx'
import { ME, STATE_LABEL, ORDER_STATUS, STATUS_FLOW, STEP_SHORT, short, fmt, kzt, itemsCount, stores, coverTxt } from '../shared.js'
import './v4.css'

function Task({ n, done, title, sub, tone, onClick, right }) {
  return (
    <button className={'v4-task ' + (tone || '') + (done ? ' done' : '')} onClick={onClick}>
      <div className="v4-num">{done ? <Icon n="check" s={18} w={2.6} /> : n}</div>
      <div className="v4-tmain"><b>{title}</b><small>{sub}</small></div>
      {right}<Icon n="chevron" s={18} />
    </button>
  )
}

export default function V4({ d, role, setRole, screen, setScreen }) {
  const store = role === 'store'
  const home = store ? 'stock' : 'plan'
  const low = d.myStock.filter((r) => r.state === 'low')
  const transit = d.myOrders.find((o) => o.status === 'transit')
  const sentToday = d.myOrders.some((o) => o.created.startsWith('20.11 2'))
  const storeTasks = [
    { id: 'delivery', title: transit ? `Принять поставку ${transit.id}` : 'Поставка принята', sub: transit ? `${transit.courier} · ${transit.eta}` : 'всё сверено', done: !transit, tone: 'blue' },
    { id: 'stocklist', title: 'Проверить остатки', sub: `${low.length} позиций заканчиваются`, tone: low.length ? 'red' : '' },
    { id: 'shift', title: 'Внести продажи за смену', sub: d.totals.shiftUnits ? `внесено ${d.totals.shiftUnits} шт` : 'до закрытия смены в 22:00' },
    { id: 'order', title: 'Заявка на завтра', sub: sentToday ? 'отправлена' : 'отправить до 20:00 · готов прогноз', done: sentToday, tone: 'amber' },
  ]
  const prodTasks = [
    { id: 'plandetail', title: `Запустить производство: ${fmt(d.totals.produce)} шт`, sub: 'план на субботу 21.11 готов', tone: 'amber' },
    { id: 'plandetail', title: `Отгрузка: ${fmt(d.totals.ship)} шт в 5 магазинов`, sub: 'накладные сформируются автоматически', tone: 'blue' },
    { id: 'signals', title: `${d.totals.low} точек без товара`, sub: `и ${d.totals.excess} с излишками · ${d.moves.length} переброски`, tone: 'red' },
    { id: 'stores', title: 'Сарыарка не закрыла смену', sub: 'Асель Жумабаева · напомнить', tone: '' },
  ]
  const tasks = store ? storeTasks : prodTasks
  const doneN = tasks.filter((t) => t.done).length
  const sheet = screen !== home
  const titles = { stocklist: 'Остатки', shift: 'Продажи за смену', order: 'Заявка на субботу', delivery: 'Доставка', plandetail: 'План на завтра', signals: 'Сигналы', stores: 'Магазины' }

  return (
    <div className="app v4">
      <main className="scroll v4-home">
        <div className="v4-date">Пятница, 20 ноября</div>
        <div className="v4-head">
          <h1>{store ? 'Задачи смены' : 'Задачи на утро'}</h1>
          <button onClick={() => setRole(store ? 'producer' : 'store')} className="v4-who">{store ? ME.name : 'Владелец'}<Icon n="swap" s={14} /></button>
        </div>
        <div className="v4-prog">
          <svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" stroke="#e7e3f5" strokeWidth="8" fill="none" /><circle cx="32" cy="32" r="27" stroke="#6c4cf5" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={`${(doneN / tasks.length) * 170} 170`} transform="rotate(-90 32 32)" /></svg>
          <div><b>{doneN} из {tasks.length}</b><small>{store ? 'выполнено за смену' : 'выполнено с утра'}</small></div>
        </div>
        {tasks.map((t, i) => <Task key={i} n={i + 1} {...t} onClick={() => setScreen(t.id)} />)}
        <div className="v4-insight"><Icon n="spark" s={18} />{store ? <span>Завтра суббота: продажи обычно <b>+30%</b>. Заявка уже учитывает это.</span> : <span>Хан Шатыр растёт по <b>Дабл Хан</b> (+40% за 2 недели). Сарыарка падает по Чизбургеру.</span>}</div>
      </main>

      <div className={'v4-sheet' + (sheet ? ' open' : '')}>
        <div className="v4-shead"><button onClick={() => setScreen(home)}><Icon n="close" s={20} /></button><b>{titles[screen]}</b><span /></div>
        <div className="scroll v4-sbody">
          {screen === 'stocklist' && d.myStock.map((r) => (
            <div key={r.p.id} className="v4-line"><span className={'v4-dot ' + r.state} /><div className="v4-tmain"><b>{short(r.p.name)}</b><small>{STATE_LABEL[r.state]} · {coverTxt(r.cover)}</small></div><b className="v4-n">{r.qty}</b></div>))}
          {screen === 'shift' && <>
            {d.myStock.map((r) => (
              <div key={r.p.id} className="v4-line"><div className="v4-tmain"><b>{short(r.p.name)}</b><small>{kzt(r.p.price)}</small></div>
                <div className="v4-step"><button onClick={() => d.addShift(r.p.id, -1)}><Icon n="minus" s={16} w={2.4} /></button><b>{d.shift[r.p.id] || 0}</b><button onClick={() => d.addShift(r.p.id, 1)}><Icon n="plus" s={16} w={2.4} /></button></div></div>))}
            <button className="v4-btn" onClick={() => { d.closeShift(); d.totals.shiftUnits && setScreen(home) }}>Готово · {kzt(d.totals.shiftSum)}</button>
          </>}
          {screen === 'order' && <>
            <button className="v4-soft" onClick={d.fillSuggested}><Icon n="spark" s={18} /> Подставить прогноз</button>
            {d.myStock.map((r) => (
              <div key={r.p.id} className="v4-line"><div className="v4-tmain"><b>{short(r.p.name)}</b><small>остаток {r.qty} · совет {r.suggest}</small></div>
                <div className="v4-step"><button onClick={() => d.addCart(r.p.id, -5)}><Icon n="minus" s={16} w={2.4} /></button><b>{d.cart[r.p.id] || 0}</b><button onClick={() => d.addCart(r.p.id, 5)}><Icon n="plus" s={16} w={2.4} /></button></div></div>))}
            <button className="v4-btn" onClick={() => { const had = d.totals.cartUnits; d.submitOrder(); had && setScreen(home) }}>Отправить {d.totals.cartUnits} шт</button>
          </>}
          {screen === 'delivery' && d.myOrders.map((o) => {
            const i = STATUS_FLOW.indexOf(o.status)
            return (
              <div key={o.id} className="v4-card">
                <div className="v4-row"><b>{o.id}</b><span className={'v4-tag ' + ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</span></div>
                <small>{itemsCount(o)} шт · {o.created}</small>
                {o.status !== 'delivered' && <ol className="v4-tl">{STATUS_FLOW.map((s, k) => <li key={s} className={k <= i ? 'on' : ''}>{STEP_SHORT[s]}{k === i && o.eta ? ` · ${o.eta}` : ''}</li>)}</ol>}
                {o.status === 'transit' && <button className="v4-btn" onClick={() => { d.advance(o.id); setScreen(home) }}>Принять и сверить</button>}
              </div>)
          })}
          {screen === 'plandetail' && <>
            <div className="v4-seg">{[0, 0.1, 0.2].map((x) => <button key={x} className={d.safety === x ? 'on' : ''} onClick={() => d.setSafety(x)}>запас {x * 100}%</button>)}</div>
            <div className="v4-tbl">
              <div className="h"><span>Продукт</span><span>Произв.</span><span>Отгруз.</span></div>
              {d.planRows.map((r) => <div key={r.p.id}><span>{short(r.p.name)}</span><span className="acc">{r.produce}</span><span>{r.ship}</span></div>)}
              <div className="t"><span>Итого</span><span className="acc">{d.totals.produce}</span><span>{d.totals.ship}</span></div>
            </div>
            <button className="v4-btn" onClick={() => d.flash('Задание отправлено в цех')}>Отправить в цех</button>
          </>}
          {screen === 'signals' && <>
            {d.moves.map((m, i) => <div key={i} className="v4-card"><b>{m.qty} × {short(m.p.name)}</b><small>{m.from.name} → {m.to.name}</small><button className="v4-soft" onClick={() => d.flash('Перемещение создано')}>Создать перемещение</button></div>)}
            {d.signals.slice(0, 8).map((x, i) => <div key={i} className="v4-line"><span className={'v4-dot ' + x.st} /><div className="v4-tmain"><b>{x.s.name}</b><small>{short(x.p.name)} · {x.qty} шт</small></div></div>)}
          </>}
          {screen === 'stores' && stores.map((s) => <div key={s.id} className="v4-line"><div className="v4-tmain"><b>{s.name}</b><small>{s.manager}</small></div><b className="v4-n">{d.storeShip(s.id)}</b></div>)}
        </div>
      </div>
      {d.toast && <div className="toast">{d.toast}</div>}
    </div>
  )
}
