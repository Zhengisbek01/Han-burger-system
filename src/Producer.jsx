import { useState } from 'react'
import { products, stores, sales, days, DOW_NAMES, TOMORROW, employees, company } from './data.js'
import { fmt, kzt, sum, avg7, forecast, cover, stockState, plan, transfers, revenueByDay, storeRevenue, productUnits } from './logic.js'
import { Kpi, Card, Head, Status, Spark } from './ui.jsx'

const pName = (id) => products.find((p) => p.id === id)?.name
const sName = (id) => stores.find((s) => s.id === id)?.name
const tomorrowLabel = TOMORROW.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
const dayLabels = days.map((d) => `${d.getDate()} ${DOW_NAMES[d.getDay()]}`)

function SafetySlider({ safety, setSafety }) {
  return (
    <div className="slider">
      <span className="muted">Страховой запас</span>
      <input type="range" min="0" max="40" step="5" value={safety * 100} onChange={(e) => setSafety(+e.target.value / 100)} />
      <b className="num" style={{ width: 36 }}>{Math.round(safety * 100)}%</b>
    </div>
  )
}

// ——— Дашборд ———
export function Dashboard({ st, go }) {
  const { stock, warehouse, safety, setSafety, orders } = st
  const rows = plan(stock, warehouse, safety)
  const tr = transfers(stock, safety)
  const rev = revenueByDay()
  const week = sum(rev.slice(-7)), prevWeek = sum(rev.slice(0, 7))
  const delta = ((week - prevWeek) / prevWeek) * 100
  const toProduce = sum(rows.map((r) => r.produce))
  const toShip = sum(rows.map((r) => r.ship))
  const low = [], excess = []
  for (const s of stores) for (const p of products) {
    const k = stockState(s.id, p.id, stock)
    if (k === 'low') low.push({ s, p }); if (k === 'excess') excess.push({ s, p })
  }
  const newOrders = orders.filter((o) => o.status === 'new').length
  const ranking = stores.map((s) => ({ s, rev: storeRevenue(s.id), prev: storeRevenue(s.id, -14) - storeRevenue(s.id) })).sort((a, b) => b.rev - a.rev)
  const maxRev = ranking[0].rev

  return (
    <div className="page">
      <Head title="Доброе утро, Женисбек" sub={`План на завтра, ${tomorrowLabel}. Прогноз построен по продажам 5 магазинов за 7 дней.`}
        right={<><button className="btn" onClick={() => go('shipment')}>План отгрузки</button><button className="btn pri" onClick={() => go('production')}>Задание в цех →</button></>} />

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kpi accent l="Произвести на завтра" v={fmt(toProduce) + ' ед.'} s={`с учётом склада, запас ${Math.round(safety * 100)}%`} />
        <Kpi l="Отправить в магазины" v={fmt(toShip) + ' ед.'} s={`в ${stores.length} точек, ${newOrders} новых заявки`} />
        <Kpi l="Выручка за 7 дней" v={kzt(week)} s={`${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}% к прошлой неделе`} tone={delta >= 0 ? 'up' : 'down'} />
        <Kpi l="Риски по остаткам" v={`${low.length} / ${excess.length}`} s="заканчивается / излишки" tone="muted" />
      </div>

      <div className="grid g-main" style={{ marginBottom: 16 }}>
        <Card title="Сколько произвести завтра" sub="Прогноз × (1 + запас) − остаток в магазинах − склад" pad={false}
          right={<SafetySlider safety={safety} setSafety={setSafety} />}>
          <div className="tw"><table>
            <thead><tr><th>Продукция</th><th className="r">Прогноз продаж</th><th className="r">Отправить</th><th className="r">На складе</th><th className="r">Произвести</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.p.id}>
                <td>{r.p.name}<div className="faint" style={{ fontSize: 12 }}>{r.p.cat}</div></td>
                <td className="r num">{fmt(r.fc)}</td>
                <td className="r num">{fmt(r.ship)}</td>
                <td className="r num muted">{fmt(warehouse[r.p.id])}</td>
                <td className="r"><span className={'cell ' + (r.produce ? 'send' : 'ok')}>{r.produce ? fmt(r.produce) : '—'}</span></td>
              </tr>))}
            </tbody>
            <tfoot><tr><td>Итого</td><td className="r num">{fmt(sum(rows.map((r) => r.fc)))}</td><td className="r num">{fmt(toShip)}</td><td className="r num">{fmt(sum(Object.values(warehouse)))}</td><td className="r num">{fmt(toProduce)}</td></tr></tfoot>
          </table></div>
        </Card>

        <div className="grid" style={{ alignContent: 'start' }}>
          <Card title="Требует внимания">
            {low.slice(0, 3).map(({ s, p }) => (
              <div className="alert red" key={s.id + p.id}><div className="i">⛔</div><div><b>{s.name}: заканчивается «{p.name}»</b>
                <span>Остаток {stock[s.id][p.id]} {p.unit}, продают ~{Math.round(avg7(s.id, p.id))} в день</span></div></div>))}
            {low.length > 3 && <div className="faint" style={{ margin: '6px 0 4px', fontSize: 12 }}>и ещё {low.length - 3} позиций с низким остатком</div>}
            {excess.slice(0, 2).map(({ s, p }) => (
              <div className="alert amber" key={s.id + p.id}><div className="i">⚠️</div><div><b>{s.name}: излишек «{p.name}»</b>
                <span>Хватит на {cover(s.id, p.id, stock).toFixed(1)} дн., срок годности {p.shelf} дн.</span></div></div>))}
            <button className="btn ghost sm" style={{ marginTop: 8, paddingLeft: 0 }} onClick={() => go('stock')}>Все остатки →</button>
          </Card>
          <Card title="Перераспределить излишки" sub="Вместо списания — перевезти между магазинами">
            {tr.length === 0 && <div className="muted">Излишков нет</div>}
            {tr.slice(0, 4).map((t, i) => (
              <div className="alert blue" key={i}><div className="i">⇄</div><div>
                <b>{t.qty} {t.p.unit} «{t.p.name}»</b><span>{t.from.name} → {t.to.name}</span></div></div>))}
          </Card>
        </div>
      </div>

      <div className="grid g2">
        <Card title="Выручка по дням" sub="Все магазины, 14 дней">
          <Spark data={rev} labels={dayLabels} />
        </Card>
        <Card title="Кто сколько продаёт" sub="Выручка за 7 дней и динамика к прошлой неделе">
          <div className="bars">{ranking.map(({ s, rev, prev }) => {
            const d = ((rev - prev) / prev) * 100
            return (
              <div className="bar-row" key={s.id}>
                <div>{s.name}</div>
                <div className="bar"><i style={{ width: (rev / maxRev) * 100 + '%' }} /></div>
                <div className="r num" style={{ textAlign: 'right' }}>{fmt(rev / 1000)} тыс ₸ <span className={d >= 0 ? 'up' : 'down'} style={{ fontSize: 11 }}>{d >= 0 ? '+' : ''}{d.toFixed(0)}%</span></div>
              </div>)
          })}</div>
        </Card>
      </div>
    </div>
  )
}

// ——— План отгрузки по магазинам ———
export function Shipment({ st, toast }) {
  const { stock, warehouse, safety, setSafety } = st
  const base = plan(stock, warehouse, safety)
  const [edit, setEdit] = useState({})
  const val = (pid, sid) => edit[pid + sid] ?? base.find((r) => r.p.id === pid).perStore[sid]
  return (
    <div className="page">
      <Head title="План отгрузки на завтра" sub="Сколько отправить в каждый магазин. Цифры можно поправить вручную."
        right={<><SafetySlider safety={safety} setSafety={setSafety} /><button className="btn pri" onClick={() => toast('Маршрутные листы сформированы и отправлены логисту')}>Сформировать отгрузку</button></>} />
      <div className="formula" style={{ marginBottom: 16 }}>
        <b>Отправить</b> = средние продажи за 7 дней × коэффициент дня ({DOW_NAMES[TOMORROW.getDay()]}: ×1,3) × (1 + {Math.round(safety * 100)}% запас) − остаток в магазине
      </div>
      <Card pad={false}>
        <div className="tw"><table>
          <thead><tr><th>Продукция</th>{stores.map((s) => <th key={s.id} className="c">{s.name}</th>)}<th className="r">Всего</th></tr></thead>
          <tbody>{base.map((r) => (
            <tr key={r.p.id}><td>{r.p.name}</td>
              {stores.map((s) => (
                <td key={s.id} className="c">
                  <input className="inp qty num" value={val(r.p.id, s.id)} onChange={(e) => setEdit({ ...edit, [r.p.id + s.id]: +e.target.value || 0 })} />
                  <div className="faint" style={{ fontSize: 11, marginTop: 2 }}>ост. {stock[s.id][r.p.id]} · прогн. {Math.round(forecast(s.id, r.p.id))}</div>
                </td>))}
              <td className="r num"><b>{fmt(sum(stores.map((s) => val(r.p.id, s.id))))}</b></td>
            </tr>))}
          </tbody>
          <tfoot><tr><td>Итого, ед.</td>{stores.map((s) => <td key={s.id} className="c num">{fmt(sum(products.map((p) => val(p.id, s.id))))}</td>)}
            <td className="r num">{fmt(sum(products.flatMap((p) => stores.map((s) => val(p.id, s.id)))))}</td></tr></tfoot>
        </table></div>
      </Card>
    </div>
  )
}

// ——— Задание в цех ———
export function Production({ st, toast }) {
  const rows = plan(st.stock, st.warehouse, st.safety)
  const totalCost = sum(rows.map((r) => r.produce * r.p.cost))
  const totalRev = sum(rows.map((r) => r.ship * r.p.price))
  return (
    <div className="page">
      <Head title="Производственное задание" sub={`На ${tomorrowLabel}. Сформировано автоматически из прогноза и остатков.`}
        right={<><button className="btn" onClick={() => toast('PDF задания скачан (демо)')}>Скачать PDF</button><button className="btn pri" onClick={() => toast('Задание отправлено технологу Галыму Оспанову')}>Отправить в цех</button></>} />
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <Kpi accent l="Всего произвести" v={fmt(sum(rows.map((r) => r.produce))) + ' ед.'} />
        <Kpi l="Себестоимость партии" v={kzt(totalCost)} />
        <Kpi l="Ожидаемая выручка" v={kzt(totalRev)} s={`маржа ~${Math.round((1 - totalCost / Math.max(totalRev, 1)) * 100)}%`} tone="up" />
      </div>
      <Card pad={false}><div className="tw"><table>
        <thead><tr><th>Продукция</th><th>Категория</th><th className="r">Нужно отгрузить</th><th className="r">Есть на складе</th><th className="r">Произвести</th><th className="r">Себестоимость</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.p.id}><td><b>{r.p.name}</b></td><td className="muted">{r.p.cat}</td><td className="r num">{fmt(r.ship)}</td><td className="r num">{fmt(st.warehouse[r.p.id])}</td>
            <td className="r"><span className={'cell ' + (r.produce ? 'send' : 'ok')}>{fmt(r.produce)} {r.p.unit}</span></td><td className="r num">{kzt(r.produce * r.p.cost)}</td></tr>))}
        </tbody></table></div></Card>
    </div>
  )
}

// ——— Заявки ———
export function Orders({ st, toast }) {
  const { orders, advance } = st
  const [f, setF] = useState('all')
  const list = orders.filter((o) => f === 'all' || o.status === f)
  const next = { new: 'Подтвердить', confirmed: 'Собрать', assembling: 'Отправить', transit: 'Доставлено' }
  return (
    <div className="page">
      <Head title="Заявки магазинов" sub="Заявки сверяются с прогнозом: если магазин просит сильно больше или меньше, система подсветит." />
      <div className="tabs">{[['all', 'Все'], ['new', 'Новые'], ['confirmed', 'Подтверждённые'], ['transit', 'В пути'], ['delivered', 'Доставленные']].map(([k, l]) => (
        <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l} <span className="faint">{k === 'all' ? orders.length : orders.filter((o) => o.status === k).length}</span></button>))}
      </div>
      <div className="stack">{list.map((o) => {
        const diffs = Object.entries(o.items).map(([pid, q]) => ({ pid, q, fc: Math.round(forecast(o.store, pid) * 1.15 - st.stock[o.store][pid]) }))
        const flags = diffs.filter((d) => o.status === 'new' && d.fc > 0 && Math.abs(d.q - d.fc) / d.fc > 0.35)
        return (
          <Card key={o.id} title={<span className="row">{o.id} · {sName(o.store)} <Status s={o.status} /></span>} sub={`Создана ${o.created}${o.comment ? ' · «' + o.comment + '»' : ''}`}
            right={next[o.status] && <button className="btn pri sm" onClick={() => { advance(o.id); toast(`Заявка ${o.id}: ${next[o.status].toLowerCase()}`) }}>{next[o.status]}</button>}>
            <div className="row" style={{ gap: 8 }}>{diffs.map((d) => (
              <span key={d.pid} className="tag gray">{pName(d.pid)}: <b className="num">{d.q}</b></span>))}
            </div>
            {flags.map((d) => (
              <div key={d.pid} className="alert amber" style={{ marginTop: 10 }}><div className="i">💡</div><div>
                <b>«{pName(d.pid)}»: просят {d.q}, по прогнозу нужно ~{Math.max(d.fc, 0)}</b>
                <span>{d.q > d.fc ? 'Риск излишка и списания' : 'Риск, что товар закончится'}</span></div></div>))}
            {o.status === 'transit' && <div className="muted" style={{ marginTop: 10 }}>🚚 {o.courier}, прибытие ~{o.eta}</div>}
          </Card>)
      })}{list.length === 0 && <div className="card empty">Заявок нет</div>}</div>
    </div>
  )
}

// ——— Остатки ———
export function Stock({ st }) {
  const { stock } = st
  return (
    <div className="page">
      <Head title="Остатки в магазинах" sub="На конец смены 20 ноября. Цвет показывает, на сколько дней хватит товара." />
      <div className="row" style={{ marginBottom: 12, gap: 14 }}>
        <span className="row" style={{ gap: 6 }}><span className="cell low">12</span> меньше полдня продаж</span>
        <span className="row" style={{ gap: 6 }}><span className="cell ok">12</span> норма</span>
        <span className="row" style={{ gap: 6 }}><span className="cell excess">12</span> излишек (риск списания)</span>
      </div>
      <Card pad={false}><div className="tw"><table>
        <thead><tr><th>Продукция</th>{stores.map((s) => <th key={s.id} className="c">{s.name}</th>)}<th className="r">Склад</th></tr></thead>
        <tbody>{products.map((p) => (
          <tr key={p.id}><td>{p.name}</td>
            {stores.map((s) => (
              <td key={s.id} className="c" title={`Хватит на ${cover(s.id, p.id, stock).toFixed(1)} дн.`}>
                <span className={'cell ' + stockState(s.id, p.id, stock)}>{stock[s.id][p.id]}</span>
                <div className="faint" style={{ fontSize: 11, marginTop: 2 }}>{cover(s.id, p.id, stock).toFixed(1)} дн.</div>
              </td>))}
            <td className="r num">{st.warehouse[p.id]}</td></tr>))}
        </tbody></table></div></Card>
    </div>
  )
}

// ——— Продажи и отчёты ———
export function Reports() {
  const rev = revenueByDay()
  const [tab, setTab] = useState('stores')
  const prodRows = products.map((p) => {
    const u = productUnits(p.id), prev = productUnits(p.id, -14) - u
    return { p, u, rev: u * p.price, margin: u * (p.price - p.cost), d: ((u - prev) / prev) * 100 }
  }).sort((a, b) => b.rev - a.rev)
  return (
    <div className="page">
      <Head title="Продажи и отчёты" sub="Данные из отчётов смен магазинов" right={<button className="btn">Экспорт в Excel</button>} />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kpi l="Выручка, 7 дней" v={kzt(sum(rev.slice(-7)))} />
        <Kpi l="Выручка в день" v={kzt(sum(rev.slice(-7)) / 7)} s="на всю сеть" />
        <Kpi l="Валовая маржа" v={kzt(sum(prodRows.map((r) => r.margin)))} tone="up" s={`${Math.round(sum(prodRows.map((r) => r.margin)) / sum(prodRows.map((r) => r.rev)) * 100)}% от выручки`} />
        <Kpi l="Продано единиц" v={fmt(sum(prodRows.map((r) => r.u)))} />
      </div>
      <Card title="Выручка по дням" sub="14 дней, все магазины" style={{ marginBottom: 16 }}><Spark data={rev} labels={dayLabels} h={170} /></Card>
      <div className="tabs">{[['stores', 'По магазинам'], ['products', 'По продукции'], ['matrix', 'Магазин × продукт']].map(([k, l]) =>
        <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <Card pad={false}><div className="tw">
        {tab === 'stores' && <table>
          <thead><tr><th>Магазин</th><th className="r">Выручка 7 дн.</th><th className="r">Прошлая неделя</th><th className="r">Динамика</th><th className="r">В среднем в день</th></tr></thead>
          <tbody>{stores.map((s) => { const r = storeRevenue(s.id), p = storeRevenue(s.id, -14) - r, d = (r - p) / p * 100
            return <tr key={s.id}><td>{s.name}</td><td className="r num">{kzt(r)}</td><td className="r num muted">{kzt(p)}</td><td className={'r num ' + (d >= 0 ? 'up' : 'down')}>{d >= 0 ? '+' : ''}{d.toFixed(1)}%</td><td className="r num">{kzt(r / 7)}</td></tr> })}</tbody>
        </table>}
        {tab === 'products' && <table>
          <thead><tr><th>Продукция</th><th className="r">Продано</th><th className="r">Выручка</th><th className="r">Маржа</th><th className="r">Динамика</th></tr></thead>
          <tbody>{prodRows.map((r) => <tr key={r.p.id}><td>{r.p.name}</td><td className="r num">{fmt(r.u)} {r.p.unit}</td><td className="r num">{kzt(r.rev)}</td><td className="r num">{kzt(r.margin)}</td><td className={'r num ' + (r.d >= 0 ? 'up' : 'down')}>{r.d >= 0 ? '+' : ''}{r.d.toFixed(1)}%</td></tr>)}</tbody>
        </table>}
        {tab === 'matrix' && <table>
          <thead><tr><th>Продукция, шт за 7 дн.</th>{stores.map((s) => <th key={s.id} className="r">{s.name}</th>)}</tr></thead>
          <tbody>{products.map((p) => <tr key={p.id}><td>{p.name}</td>{stores.map((s) => <td key={s.id} className="r num">{sum(sales[s.id][p.id].slice(-7))}</td>)}</tr>)}</tbody>
        </table>}
      </div></Card>
    </div>
  )
}

// ——— Магазины ———
export function Stores({ st, toast }) {
  return (
    <div className="page">
      <Head title="Магазины" sub={`${stores.length} точек в Астане. У каждой свой логин.`} right={<button className="btn pri" onClick={() => toast('Форма добавления магазина (демо)')}>+ Добавить магазин</button>} />
      <div className="grid g3">{stores.map((s) => {
        const low = products.filter((p) => stockState(s.id, p.id, st.stock) === 'low').length
        return (
          <div className="card card-b" key={s.id}>
            <div className="row" style={{ justifyContent: 'space-between' }}><h2>{s.name}</h2>{low ? <span className="tag red">{low} мало</span> : <span className="tag green">в норме</span>}</div>
            <div className="muted" style={{ marginTop: 4 }}>{s.addr}</div>
            <div className="grid g2" style={{ marginTop: 14, gap: 8 }}>
              <div><div className="faint" style={{ fontSize: 12 }}>Выручка 7 дн.</div><b className="num">{kzt(storeRevenue(s.id))}</b></div>
              <div><div className="faint" style={{ fontSize: 12 }}>Управляющий</div><b>{s.manager}</b></div>
            </div>
            <div className="faint" style={{ marginTop: 12, fontSize: 12 }}>Логин: {s.login}@han</div>
          </div>)
      })}</div>
    </div>
  )
}

// ——— Продукция и цены ———
export function Products({ st, toast }) {
  const { prices, setPrices } = st
  return (
    <div className="page">
      <Head title="Продукция и цены" sub="Цены для магазинов в тенге, НДС 12% включён" right={<button className="btn pri" onClick={() => toast('Форма новой позиции (демо)')}>+ Новая позиция</button>} />
      <Card pad={false}><div className="tw"><table>
        <thead><tr><th>Наименование</th><th>Категория</th><th className="r">Себестоимость</th><th className="r">Цена</th><th className="r">Маржа</th><th className="r">Срок годности</th></tr></thead>
        <tbody>{products.map((p) => {
          const pr = prices[p.id]
          return <tr key={p.id}><td><b>{p.name}</b></td><td className="muted">{p.cat}</td><td className="r num">{kzt(p.cost)}</td>
            <td className="r"><input className="inp qty num" style={{ width: 96 }} value={pr} onChange={(e) => setPrices({ ...prices, [p.id]: +e.target.value || 0 })} onBlur={() => toast('Цена обновлена для всех магазинов')} /></td>
            <td className="r num">{Math.round((1 - p.cost / Math.max(pr, 1)) * 100)}%</td><td className="r muted">{p.shelf} дн.</td></tr>
        })}</tbody></table></div></Card>
    </div>
  )
}

// ——— Сотрудники ———
export function Staff({ toast }) {
  return (
    <div className="page">
      <Head title="Сотрудники и доступы" sub={company.name} right={<button className="btn pri" onClick={() => toast('Приглашение отправлено в WhatsApp (демо)')}>+ Пригласить</button>} />
      <Card pad={false}><div className="tw"><table>
        <thead><tr><th>Сотрудник</th><th>Роль</th><th>Доступ</th><th>Телефон</th><th>Статус</th></tr></thead>
        <tbody>{employees.map((e) => <tr key={e.name}><td><b>{e.name}</b></td><td>{e.role}</td><td className="muted">{e.scope}</td><td className="muted num">{e.phone}</td>
          <td>{e.active ? <span className="tag green">активен</span> : <span className="tag gray">приглашён</span>}</td></tr>)}</tbody>
      </table></div></Card>
    </div>
  )
}
