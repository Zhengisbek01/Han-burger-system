import { useState } from 'react'
import { products, stores } from './data.js'
import { fmt, kzt, sum, avg7, forecast, cover, stockState, toSend } from './logic.js'
import { Kpi, Card, Head, Status, Steps } from './ui.jsx'

const pName = (id) => products.find((p) => p.id === id)?.name

export function StoreHome({ st, sid, go }) {
  const s = stores.find((x) => x.id === sid)
  const low = products.filter((p) => stockState(sid, p.id, st.stock) === 'low')
  const my = st.orders.filter((o) => o.store === sid)
  const active = my.find((o) => o.status !== 'delivered')
  const shift = st.shifts[sid]
  return (
    <div className="page">
      <Head title={s.name} sub={`${s.addr} · смена: ${s.manager}`}
        right={<><button className="btn" onClick={() => go('s-shift')}>Закрыть смену</button><button className="btn pri" onClick={() => go('s-order')}>+ Новая заявка</button></>} />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kpi accent l="Продажи за смену" v={shift ? kzt(shift.total) : '—'} s={shift ? `${fmt(shift.units)} ед. · отчёт сдан` : 'отчёт ещё не сдан'} />
        <Kpi l="Позиций заканчивается" v={low.length} tone={low.length ? 'down' : 'up'} s={low.length ? 'нужна заявка' : 'всё в норме'} />
        <Kpi l="Активная доставка" v={active ? active.id : 'нет'} s={active ? <Status s={active.status} /> : ''} />
        <Kpi l="Заявок за неделю" v={my.length} />
      </div>
      <div className="grid g2">
        <Card title="Заканчивается">
          {low.length === 0 && <div className="muted">Все позиции в норме</div>}
          {low.map((p) => <div className="alert red" key={p.id}><div className="i">⛔</div><div><b>{p.name}</b><span>Осталось {st.stock[sid][p.id]} {p.unit}, продаётся ~{Math.round(avg7(sid, p.id))} в день</span></div></div>)}
        </Card>
        <Card title="Доставка" right={<button className="btn ghost sm" onClick={() => go('s-delivery')}>Все →</button>}>
          {active ? <><div className="row" style={{ justifyContent: 'space-between' }}><b>{active.id}</b><Status s={active.status} /></div><Steps status={active.status} />
            {active.courier && <div className="muted" style={{ marginTop: 8 }}>🚚 {active.courier}, прибытие ~{active.eta}</div>}</>
            : <div className="muted">Нет активных доставок</div>}
        </Card>
      </div>
    </div>
  )
}

export function StoreStock({ st, sid, toast }) {
  const [draft, setDraft] = useState({ ...st.stock[sid] })
  return (
    <div className="page">
      <Head title="Остатки" sub="Пересчитайте товар на полке и сохраните" right={<button className="btn pri" onClick={() => { st.setStoreStock(sid, draft); toast('Остатки сохранены, производитель видит их сразу') }}>Сохранить</button>} />
      <Card pad={false}><div className="tw"><table>
        <thead><tr><th>Продукция</th><th className="r">Факт</th><th className="r">Хватит на</th><th>Статус</th></tr></thead>
        <tbody>{products.map((p) => {
          const tmp = { [sid]: draft }; const k = stockState(sid, p.id, tmp)
          return <tr key={p.id}><td>{p.name}</td>
            <td className="r"><input className="inp qty num" value={draft[p.id]} onChange={(e) => setDraft({ ...draft, [p.id]: +e.target.value || 0 })} /> <span className="faint">{p.unit}</span></td>
            <td className="r num">{cover(sid, p.id, tmp).toFixed(1)} дн.</td>
            <td><span className={'tag ' + (k === 'low' ? 'red' : k === 'excess' ? 'amber' : 'green')}>{k === 'low' ? 'заканчивается' : k === 'excess' ? 'излишек' : 'норма'}</span></td></tr>
        })}</tbody></table></div></Card>
    </div>
  )
}

export function StoreShift({ st, sid, toast, go }) {
  const [q, setQ] = useState(Object.fromEntries(products.map((p) => [p.id, ''])))
  const total = sum(products.map((p) => (+q[p.id] || 0) * st.prices[p.id]))
  const units = sum(products.map((p) => +q[p.id] || 0))
  const submit = () => { st.closeShift(sid, q, total, units); toast('Смена закрыта, отчёт ушёл производителю'); go('s-home') }
  return (
    <div className="page">
      <Head title="Продажи за смену" sub="20 ноября, пятница. Укажите, сколько продано." />
      <div className="grid g-main">
        <Card pad={false}><div className="tw"><table>
          <thead><tr><th>Продукция</th><th className="r">Цена</th><th className="r">Продано</th><th className="r">Сумма</th></tr></thead>
          <tbody>{products.map((p) => <tr key={p.id}><td>{p.name}<div className="faint" style={{ fontSize: 12 }}>обычно ~{Math.round(avg7(sid, p.id))} {p.unit}</div></td>
            <td className="r num muted">{kzt(st.prices[p.id])}</td>
            <td className="r"><input className="inp qty num" placeholder="0" value={q[p.id]} onChange={(e) => setQ({ ...q, [p.id]: e.target.value.replace(/\D/g, '') })} /></td>
            <td className="r num">{kzt((+q[p.id] || 0) * st.prices[p.id])}</td></tr>)}</tbody>
        </table></div></Card>
        <Card title="Итог смены">
          <div className="stack">
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Продано единиц</span><b className="num">{fmt(units)}</b></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Выручка</span><b className="num" style={{ fontSize: 20 }}>{kzt(total)}</b></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">в т.ч. НДС 12%</span><span className="num">{kzt(total * 12 / 112)}</span></div>
            <label className="f">Комментарий<textarea className="inp" rows="3" placeholder="Например: списано 3 Хан Классик (брак)" /></label>
            <button className="btn pri" disabled={!units} style={{ justifyContent: 'center', opacity: units ? 1 : 0.5 }} onClick={submit}>Закрыть смену</button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function StoreOrder({ st, sid, toast, go }) {
  const suggested = Object.fromEntries(products.map((p) => [p.id, toSend(sid, p.id, st.stock, 0.15)]))
  const [q, setQ] = useState(suggested)
  const [comment, setComment] = useState('')
  const total = sum(products.map((p) => (q[p.id] || 0) * st.prices[p.id]))
  const submit = () => {
    const items = Object.fromEntries(Object.entries(q).filter(([, v]) => v > 0))
    const id = st.createOrder(sid, items, comment)
    toast(`Заявка ${id} отправлена производителю`); go('s-delivery')
  }
  return (
    <div className="page">
      <Head title="Новая заявка на завтра" sub="Количество уже подсказано системой по вашим продажам и остаткам. Поправьте, если нужно." />
      <div className="grid g-main">
        <Card pad={false}><div className="tw"><table>
          <thead><tr><th>Продукция</th><th className="r">Остаток</th><th className="r">Прогноз на завтра</th><th className="r">Подсказка</th><th className="r">Заказать</th></tr></thead>
          <tbody>{products.map((p) => <tr key={p.id}><td>{p.name}</td><td className="r num muted">{st.stock[sid][p.id]}</td><td className="r num">{Math.round(forecast(sid, p.id))}</td>
            <td className="r"><button className="btn sm" onClick={() => setQ({ ...q, [p.id]: suggested[p.id] })}>{suggested[p.id]}</button></td>
            <td className="r"><input className="inp qty num" value={q[p.id]} onChange={(e) => setQ({ ...q, [p.id]: +e.target.value.replace(/\D/g, '') || 0 })} /></td></tr>)}</tbody>
        </table></div></Card>
        <Card title="Заявка">
          <div className="stack">
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Позиций</span><b>{Object.values(q).filter((v) => v > 0).length}</b></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Единиц</span><b className="num">{fmt(sum(Object.values(q)))}</b></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Сумма</span><b className="num" style={{ fontSize: 20 }}>{kzt(total)}</b></div>
            <label className="f">Желаемое время доставки<select className="inp"><option>Завтра до 09:00</option><option>Завтра 09:00–11:00</option><option>Завтра 11:00–13:00</option></select></label>
            <label className="f">Комментарий<textarea className="inp" rows="2" value={comment} onChange={(e) => setComment(e.target.value)} /></label>
            <button className="btn pri" style={{ justifyContent: 'center' }} onClick={submit}>Отправить заявку</button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function StoreDelivery({ st, sid }) {
  const my = st.orders.filter((o) => o.store === sid)
  return (
    <div className="page">
      <Head title="Заявки и доставка" sub="Статус обновляется, когда производитель подтверждает и отправляет" />
      <div className="stack">{my.map((o) => (
        <Card key={o.id} title={<span className="row">{o.id} <Status s={o.status} /></span>} sub={`Создана ${o.created}`}>
          <Steps status={o.status} />
          <div className="row" style={{ gap: 8, marginTop: 12 }}>{Object.entries(o.items).map(([pid, q]) => <span key={pid} className="tag gray">{pName(pid)}: <b>{q}</b></span>)}</div>
          {o.courier && o.status === 'transit' && <div className="muted" style={{ marginTop: 10 }}>🚚 {o.courier}, прибытие ~{o.eta}</div>}
        </Card>))}
        {my.length === 0 && <div className="card empty">Заявок пока нет</div>}
      </div>
    </div>
  )
}
