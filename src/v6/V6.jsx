import { useEffect, useRef } from 'react'
import Icon from '../Icon.jsx'
import { ME, ORDER_STATUS, short, fmt, kzt, itemsCount, stores, pById } from '../shared.js'
import './v6.css'

const EM = { low: '🔴', ok: '🟢', excess: '🟡' }
const Bot = ({ children, time = '23:10' }) => <div className="v6-msg bot">{children}<span className="v6-time">{time}</span></div>
const Me = ({ children }) => <div className="v6-msg me">{children}<span className="v6-time">23:10 ✓✓</span></div>
const Kb = ({ rows }) => <div className="v6-ikb">{rows.map((r, i) => <div key={i}>{r.map(([t, f, cls], j) => <button key={j} className={cls || ''} onClick={f}>{t}</button>)}</div>)}</div>
const pad = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n, ' '))

export default function V6({ d, role, setRole, screen, setScreen }) {
  const store = role === 'store'
  const ref = useRef()
  useEffect(() => { ref.current && (ref.current.scrollTop = 0) }, [screen, role])
  const keys = store
    ? [['📦 Остатки', 'stock'], ['💰 Смена', 'shift'], ['🛒 Заявка', 'order'], ['🚚 Доставка', 'delivery']]
    : [['📋 План', 'plan'], ['🔔 Сигналы', 'signals'], ['🏪 Магазины', 'stores'], ['🔄 Кабинет магазина', 'role']]
  const cmd = keys.find((k) => k[1] === screen)?.[0]
  const cartLines = d.myStock.filter((r) => d.cart[r.p.id])
  return (
    <div className="app v6">
      <header className="v6-head">
        <span className="v6-back">‹ Чаты</span>
        <div className="v6-title"><b>Qoima · {store ? ME.name : 'HAN Burger'}</b><small>бот</small></div>
        <button className="v6-ava" onClick={() => setRole(store ? 'producer' : 'store')}>Q</button>
      </header>
      <main className="scroll v6-chat" ref={ref}>
        <div className="v6-day">20 ноября</div>
        {cmd && <Me>{cmd}</Me>}
        {screen === 'stock' && <Bot>
          <b>Остатки · {ME.name}</b>
          <pre>{d.myStock.map((r) => `${EM[r.state]} ${pad(short(r.p.name), 17)}${String(r.qty).padStart(4)}`).join('\n')}</pre>
          <div>На исходе: <b>{d.myStock.filter((r) => r.state === 'low').length}</b>. Собрать заявку?</div>
          <Kb rows={[[['🛒 Собрать заявку', () => { d.fillSuggested(); setScreen('order') }]], [['🔄 Обновить', () => d.flash('Остатки обновлены')]]]} />
        </Bot>}
        {screen === 'shift' && <>
          <Bot>Сколько продали за смену? Жмите «+» по каждой позиции, потом «Закрыть смену».</Bot>
          <Bot>
            <Kb rows={[...d.myStock.map((r) => [[`${short(r.p.name)} · ${d.shift[r.p.id] || 0}`, null, 'lbl'], ['−1', () => d.addShift(r.p.id, -1), 'sm'], ['+1', () => d.addShift(r.p.id, 1), 'sm'], ['+5', () => d.addShift(r.p.id, 5), 'sm']]),
              [[`✅ Закрыть смену · ${kzt(d.totals.shiftSum)}`, d.closeShift, 'go']]]} />
          </Bot>
        </>}
        {screen === 'order' && <>
          <Bot>Завтра суббота, обычно продажи <b>+30%</b>. Могу посчитать заявку по продажам за 7 дней.
            <Kb rows={[[['✨ Заполнить по прогнозу', d.fillSuggested]]]} />
          </Bot>
          {cartLines.length > 0 && <Bot>
            <b>Черновик заявки</b>
            <pre>{cartLines.map((r) => `${pad(short(r.p.name), 18)}${String(d.cart[r.p.id]).padStart(4)} ${r.p.unit}`).join('\n')}</pre>
            <div>Итого {d.totals.cartUnits} шт на {kzt(d.totals.cartSum)}</div>
            <Kb rows={[[['✅ Отправить', d.submitOrder, 'go']], [['➖5 Классик', () => d.addCart('p1', -5)], ['➕5 Классик', () => d.addCart('p1', 5)]]]} />
          </Bot>}
        </>}
        {screen === 'delivery' && d.myOrders.slice(0, 3).map((o) => (
          <Bot key={o.id}>
            <b>Заявка {o.id}</b> · {ORDER_STATUS[o.status].label}{'\n'}
            <div className="v6-sub">{itemsCount(o)} шт · {Object.entries(o.items).map(([pid, q]) => `${short(pById[pid].name)} ${q}`).join(', ')}</div>
            {o.courier && o.status !== 'delivered' && <div>🚚 {o.courier}, ожидается {o.eta}</div>}
            {o.status === 'transit' && <Kb rows={[[['📦 Принять поставку', () => d.advance(o.id), 'go']], [['⚠️ Недовоз', () => d.flash('Акт расхождения создан')]]]} />}
          </Bot>))}
        {screen === 'plan' && <Bot>
          <b>План на субботу, 21.11</b>
          <pre>{'Продукт           Отгр Произв\n' + d.planRows.map((r) => `${pad(short(r.p.name), 17)}${String(r.ship).padStart(5)}${String(r.produce).padStart(7)}`).join('\n') + `\n${'─'.repeat(29)}\n${pad('Итого', 17)}${String(d.totals.ship).padStart(5)}${String(d.totals.produce).padStart(7)}`}</pre>
          <div>Страховой запас: {d.safety * 100}%</div>
          <Kb rows={[[0, 0.1, 0.2].map((x) => [(d.safety === x ? '• ' : '') + x * 100 + '%', () => d.setSafety(x)]), [['📄 Накладные', () => d.flash('Накладные отправлены в магазины')], ['🏭 В цех', () => d.flash('Задание отправлено в цех')]]]} />
        </Bot>}
        {screen === 'signals' && <>
          <Bot><b>Сигналы на 23:10</b>
            <pre>{d.signals.slice(0, 10).map((x) => `${EM[x.st]} ${pad(x.s.name, 12)} ${pad(short(x.p.name), 12)}${String(x.qty).padStart(3)}`).join('\n')}</pre>
          </Bot>
          {d.moves.length > 0 && <Bot>Можно перебросить излишки:{'\n'}{d.moves.map((m, i) => <div key={i}>• {m.qty} × {short(m.p.name)}: {m.from.name} → {m.to.name}</div>)}
            <Kb rows={[[['✅ Создать перемещения', () => d.flash('Перемещения созданы'), 'go']]]} /></Bot>}
        </>}
        {screen === 'stores' && <Bot><b>Магазины · отгрузка завтра</b>
          <pre>{stores.map((s) => `${pad(s.name, 16)}${String(d.storeShip(s.id)).padStart(5)} шт`).join('\n')}</pre>
          <Kb rows={stores.slice(0, 4).map((s) => [[`💬 ${s.manager.split(' ')[0]} (${s.name})`, () => d.flash('Сообщение отправлено')]])} />
        </Bot>}
      </main>
      {d.toast && <div className="toast v6-toast">{d.toast}</div>}
      <div className="v6-input"><Icon n="plus" s={22} /><div>Сообщение</div><Icon n="send" s={20} /></div>
      <div className="v6-kb">{keys.map(([t, id]) => <button key={id} className={screen === id ? 'on' : ''} onClick={() => id === 'role' ? setRole('store') : setScreen(id)}>{t}</button>)}
        {store && <button className="wide" onClick={() => setRole('producer')}>🔄 Кабинет производителя</button>}</div>
    </div>
  )
}
