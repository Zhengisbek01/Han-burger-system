import { useState } from 'react'
import { Link } from 'react-router-dom'
import { rpc, supabase, must } from '@/shared/lib/supabase'
import { fmt, kzt, sum, formatDate } from '@/shared/lib/format'
import { useI18n } from '@/shared/i18n'
import { useAction } from '@/shared/hooks/useAction'
import { Alert, BarChart, Card, Kpi, PageHead, QtyInput } from '@/shared/ui/components'
import { useCompany } from '@/features/company/context'
import { useProfile } from '@/app/auth'

export const useDayLabels = () => {
  const { locale } = useI18n()
  return (days: string[]) => days.map((d) => formatDate(d, locale, { day: 'numeric', weekday: 'short' }))
}

function SafetySlider() {
  const { t } = useI18n()
  const { data, reload } = useCompany()
  const profile = useProfile()
  const [v, setV] = useState(data.company.safety_pct)
  const [run] = useAction()
  const save = () => {
    if (v !== data.company.safety_pct)
      void run(async () =>
        must(await supabase.from('companies').update({ safety_pct: v }).eq('id', data.company.id)),
      ).then(reload)
  }
  return (
    <div className="slider">
      <label htmlFor="safety" className="muted">
        {t('plan.safety')}
      </label>
      <input
        id="safety"
        type="range"
        min={0}
        max={50}
        step={5}
        value={v}
        disabled={profile.role !== 'owner'}
        onChange={(e) => setV(Number(e.target.value))}
        onPointerUp={save}
        onKeyUp={save}
        onBlur={save}
      />
      <b className="num" style={{ width: 40 }}>
        {v}%
      </b>
    </div>
  )
}

function EmptyCompany() {
  const { t } = useI18n()
  const { data, reload } = useCompany()
  const profile = useProfile()
  const [run, busy] = useAction()
  const canDemo = profile.role === 'owner' && data.stores.length === 0 && data.products.length === 0
  return (
    <div className="page narrow">
      <PageHead title={t('empty.title', { name: data.company.name })} sub={t('empty.text')} />
      <div className="grid g2">
        <Card title={t('empty.step1')}>
          <div className="stack">
            <Link className="btn" to="/p/stores">
              {t('empty.addStores', { n: data.stores.length })}
            </Link>
            <Link className="btn" to="/p/products">
              {t('empty.addProducts', { n: data.products.length })}
            </Link>
            <Link className="btn" to="/p/staff">
              {t('empty.invite')}
            </Link>
          </div>
        </Card>
        {canDemo && (
          <Card title={t('empty.demoTitle')}>
            <p className="muted" style={{ marginTop: 0 }}>
              {t('empty.demoText')}
            </p>
            <button
              className="btn pri"
              disabled={busy}
              onClick={() => void run(() => rpc('load_demo_data'), t('empty.demoDone')).then(reload)}
            >
              {t('empty.demoBtn')}
            </button>
          </Card>
        )}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { t, locale } = useI18n()
  const { data, model: m, activeStores: stores, activeProducts: products } = useCompany()
  const profile = useProfile()
  const labels = useDayLabels()
  if (!stores.length || !products.length) return <EmptyCompany />

  const toProduce = sum(m.plan.map((r) => r.produce))
  const toShip = sum(m.plan.map((r) => r.ship))
  const week = m.revenue(m.last7)
  const prevWeek = m.revenue(m.prev7)
  const delta = prevWeek ? ((week - prevWeek) / prevWeek) * 100 : null
  const low: { s: (typeof stores)[number]; p: (typeof products)[number] }[] = []
  const excess: typeof low = []
  for (const s of stores)
    for (const p of products) {
      const k = m.state(s.id, p.id)
      if (k === 'low') low.push({ s, p })
      if (k === 'excess') excess.push({ s, p })
    }
  const ranking = stores
    .map((s) => ({ s, rev: m.revenue(m.last7, s.id), prev: m.revenue(m.prev7, s.id) }))
    .sort((a, b) => b.rev - a.rev)
  const maxRev = ranking[0]?.rev || 1
  const first = (profile.full_name ?? '').split(' ')[0]
  const tomorrow = formatDate(m.tomorrow, locale, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="page">
      <PageHead
        title={first ? t('dash.hello', { name: first }) : data.company.name}
        sub={t('dash.sub', { date: tomorrow }) + (m.dowK !== 1 ? ' ' + t('dash.dow', { k: m.dowK.toFixed(2) }) : '')}
        actions={
          <>
            <Link className="btn" to="/p/shipment">
              {t('nav.shipment')}
            </Link>
            <Link className="btn pri" to="/p/production">
              {t('nav.production')} →
            </Link>
          </>
        }
      />
      {m.daysWithData < 7 && (
        <Alert tone="amber" icon="ℹ️" title={t('dash.fewData')}>
          {t('dash.fewDataText', { n: m.daysWithData })}
        </Alert>
      )}

      <div className="grid g4 mb">
        <Kpi
          accent
          label={t('dash.produce')}
          value={`${fmt(toProduce)} ${t('common.units')}`}
          sub={t('dash.produceSub', { n: data.company.safety_pct })}
        />
        <Kpi
          label={t('dash.ship')}
          value={`${fmt(toShip)} ${t('common.units')}`}
          sub={t('dash.shipSub', { stores: stores.length, n: data.orders.filter((o) => o.status === 'new').length })}
        />
        <Kpi
          label={t('dash.revenue7')}
          value={kzt(week)}
          tone={delta === null ? undefined : delta >= 0 ? 'up' : 'down'}
          sub={
            delta === null
              ? t('dash.noPrev')
              : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}% ${t('dash.vsPrev')}`
          }
        />
        <Kpi label={t('dash.risks')} value={`${low.length} / ${excess.length}`} sub={t('dash.risksSub')} />
      </div>

      <div className="grid g-main mb">
        <Card title={t('dash.planTitle')} sub={t('dash.planSub')} flush right={<SafetySlider />}>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('common.product')}</th>
                  <th scope="col" className="r">
                    {t('dash.colForecast')}
                  </th>
                  <th scope="col" className="r">
                    {t('dash.colShip')}
                  </th>
                  <th scope="col" className="r">
                    {t('dash.colWarehouse')}
                  </th>
                  <th scope="col" className="r">
                    {t('dash.colProduce')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {m.plan.map((r) => (
                  <tr key={r.product.id}>
                    <th scope="row">
                      {r.product.name}
                      <div className="faint small">{r.product.category}</div>
                    </th>
                    <td className="r num">{fmt(r.forecast)}</td>
                    <td className="r num">{fmt(r.ship)}</td>
                    <td className="r num muted">{fmt(r.warehouse)}</td>
                    <td className="r">
                      <span className={`cell ${r.produce ? 'send' : 'ok'}`}>{r.produce ? fmt(r.produce) : '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">{t('common.total')}</th>
                  <td className="r num">{fmt(sum(m.plan.map((r) => r.forecast)))}</td>
                  <td className="r num">{fmt(toShip)}</td>
                  <td className="r num">{fmt(sum(m.plan.map((r) => r.warehouse)))}</td>
                  <td className="r num">{fmt(toProduce)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
        <div className="grid start">
          <Card title={t('dash.attention')}>
            {!low.length && !excess.length && <p className="muted">{t('dash.allOk')}</p>}
            <div className="stack-sm">
              {low.slice(0, 3).map(({ s, p }) => (
                <Alert
                  key={s.id + p.id}
                  tone="red"
                  icon="⛔"
                  title={t('dash.lowTitle', { store: s.name, product: p.name })}
                >
                  {t('dash.lowText', { stock: fmt(m.stockOf(s.id, p.id)), unit: p.unit, avg: fmt(m.avg7(s.id, p.id)) })}
                </Alert>
              ))}
              {low.length > 3 && <p className="faint small">{t('dash.moreLow', { n: low.length - 3 })}</p>}
              {excess.slice(0, 2).map(({ s, p }) => (
                <Alert
                  key={s.id + p.id}
                  tone="amber"
                  icon="⚠️"
                  title={t('dash.excessTitle', { store: s.name, product: p.name })}
                >
                  {t('dash.excessText', { days: m.cover(s.id, p.id).toFixed(1), shelf: p.shelf_days })}
                </Alert>
              ))}
            </div>
            <Link className="btn ghost sm" to="/p/stock">
              {t('dash.allStock')} →
            </Link>
          </Card>
          <Card title={t('dash.transfers')} sub={t('dash.transfersSub')}>
            {m.transfers.length === 0 && <p className="muted">{t('dash.noTransfers')}</p>}
            <div className="stack-sm">
              {m.transfers.slice(0, 4).map((x, i) => (
                <Alert key={i} tone="blue" icon="⇄" title={`${fmt(x.qty)} ${x.product.unit} «${x.product.name}»`}>
                  {x.from.name} → {x.to.name}
                </Alert>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid g2">
        <Card title={t('dash.byDay')} sub={t('dash.byDaySub')}>
          <BarChart
            title={t('dash.byDay')}
            data={m.revenueByDay.slice(-14)}
            labels={labels(m.days.slice(-14))}
            format={kzt}
          />
        </Card>
        <Card title={t('dash.ranking')} sub={t('dash.rankingSub')}>
          <ul className="bars" aria-label={t('dash.ranking')}>
            {ranking.map(({ s, rev, prev }) => {
              const d = prev ? ((rev - prev) / prev) * 100 : null
              return (
                <li className="bar-row" key={s.id}>
                  <span>{s.name}</span>
                  <span className="bar" aria-hidden="true">
                    <i style={{ width: `${(rev / maxRev) * 100}%` }} />
                  </span>
                  <span className="num r">
                    {fmt(rev / 1000)} {t('common.thousandKzt')}{' '}
                    {d !== null && (
                      <span className={`small ${d >= 0 ? 'up' : 'down'}`}>
                        {d >= 0 ? '+' : ''}
                        {d.toFixed(0)}%
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
    </div>
  )
}

export function ProductionPage() {
  const { t, locale } = useI18n()
  const { model: m, reload } = useCompany()
  const [edit, setEdit] = useState<Record<string, number>>({})
  const [run, busy] = useAction()
  const val = (pid: string, auto: number) => edit[pid] ?? auto
  const rows = m.plan.map((r) => ({ ...r, qty: val(r.product.id, r.produce) }))
  const cost = sum(rows.map((r) => r.qty * r.product.cost))
  const revenue = sum(rows.map((r) => r.ship * r.product.price))
  const release = () =>
    void run(
      () => rpc('add_production', { p_items: rows.map((r) => ({ product_id: r.product.id, qty: r.qty })) }),
      t('prod.released'),
    ).then(() => {
      setEdit({})
      reload()
    })
  return (
    <div className="page">
      <PageHead
        title={t('prod.title')}
        sub={t('prod.sub', {
          date: formatDate(m.tomorrow, locale, { weekday: 'long', day: 'numeric', month: 'long' }),
        })}
        actions={
          <>
            <button className="btn" onClick={() => window.print()}>
              {t('common.print')}
            </button>
            <button className="btn pri" disabled={busy} onClick={release}>
              {t('prod.release')}
            </button>
          </>
        }
      />
      <div className="grid g3 mb">
        <Kpi accent label={t('prod.total')} value={`${fmt(sum(rows.map((r) => r.qty)))} ${t('common.units')}`} />
        <Kpi label={t('prod.cost')} value={kzt(cost)} />
        <Kpi
          label={t('prod.revenue')}
          value={kzt(revenue)}
          tone="up"
          sub={revenue ? t('prod.margin', { n: Math.round((1 - cost / revenue) * 100) }) : undefined}
        />
      </div>
      <Card flush>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th scope="col">{t('common.product')}</th>
                <th scope="col">{t('common.category')}</th>
                <th scope="col" className="r">
                  {t('prod.toShip')}
                </th>
                <th scope="col" className="r">
                  {t('dash.colWarehouse')}
                </th>
                <th scope="col" className="r">
                  {t('dash.colProduce')}
                </th>
                <th scope="col" className="r">
                  {t('prod.cost')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.product.id}>
                  <th scope="row">{r.product.name}</th>
                  <td className="muted">{r.product.category}</td>
                  <td className="r num">{fmt(r.ship)}</td>
                  <td className="r num">{fmt(r.warehouse)}</td>
                  <td className="r nowrap">
                    <QtyInput
                      label={`${t('dash.colProduce')}: ${r.product.name}`}
                      value={r.qty}
                      highlight={r.product.id in edit && r.qty !== r.produce}
                      onChange={(v) => setEdit({ ...edit, [r.product.id]: v })}
                    />{' '}
                    <span className="faint">{r.product.unit}</span>
                  </td>
                  <td className="r num">{kzt(r.qty * r.product.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="faint small">{t('prod.note')}</p>
    </div>
  )
}

export function ShipmentPage() {
  const { t, locale } = useI18n()
  const { data, model: m, reload, activeStores: stores, activeProducts: products } = useCompany()
  const [edit, setEdit] = useState<Record<string, number>>({})
  const [run, busy] = useAction()
  const key = (pid: string, sid: string) => `${pid}|${sid}`
  const val = (pid: string, sid: string) => edit[key(pid, sid)] ?? m.toSend(sid, pid)
  const create = () =>
    void run(
      async () => {
        let n = 0
        for (const s of stores) {
          const items = products.map((p) => ({ product_id: p.id, qty: val(p.id, s.id) })).filter((x) => x.qty > 0)
          if (!items.length) continue
          const num = await rpc('create_order', { p_store: s.id, p_items: items, p_comment: t('ship.comment') })
          const res = await supabase.from('orders').select('id').eq('number', num).single()
          if (res.error) throw new Error(res.error.message)
          await rpc('set_order_status', { p_order: res.data.id, p_status: 'confirmed' })
          n++
        }
        return n
      },
      (n) => t('ship.created', { n }),
    ).then(() => {
      setEdit({})
      reload()
    })
  const dow = formatDate(m.tomorrow, locale, { weekday: 'short' })
  return (
    <div className="page">
      <PageHead
        title={t('ship.title')}
        sub={t('ship.sub')}
        actions={
          <>
            <SafetySlider />
            <button className="btn pri" disabled={busy} onClick={create}>
              {t('ship.create')}
            </button>
          </>
        }
      />
      <p className="formula">{t('ship.formula', { dow, k: m.dowK.toFixed(2), safety: data.company.safety_pct })}</p>
      <Card flush>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th scope="col">{t('common.product')}</th>
                {stores.map((s) => (
                  <th scope="col" key={s.id} className="c">
                    {s.name}
                  </th>
                ))}
                <th scope="col" className="r">
                  {t('common.total')}
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{p.name}</th>
                  {stores.map((s) => {
                    const auto = m.toSend(s.id, p.id)
                    const k = key(p.id, s.id)
                    const edited = k in edit && edit[k] !== auto
                    const pend = m.pendingOf(s.id, p.id)
                    return (
                      <td key={s.id} className="c">
                        <QtyInput
                          label={`${p.name}, ${s.name}`}
                          value={val(p.id, s.id)}
                          highlight={edited}
                          onChange={(v) => setEdit({ ...edit, [k]: v })}
                        />
                        <div className="faint tiny">
                          {t('ship.hint', { need: m.need(s.id, p.id), stock: fmt(m.stockOf(s.id, p.id)) })}
                          {pend ? ` ${t('ship.hintPending', { n: fmt(pend) })}` : ''}
                        </div>
                        {edited && (
                          <button
                            className="btn ghost tiny"
                            onClick={() => {
                              const n = { ...edit }
                              delete n[k]
                              setEdit(n)
                            }}
                          >
                            {t('ship.reset', { n: auto })}
                          </button>
                        )}
                      </td>
                    )
                  })}
                  <td className="r num">
                    <b>{fmt(sum(stores.map((s) => val(p.id, s.id))))}</b>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{t('common.total')}</th>
                {stores.map((s) => (
                  <td key={s.id} className="c num">
                    {fmt(sum(products.map((p) => val(p.id, s.id))))}
                  </td>
                ))}
                <td className="r num">{fmt(sum(products.flatMap((p) => stores.map((s) => val(p.id, s.id)))))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}
