import { useState } from 'react'
import { rpc, supabase, must } from '@/shared/lib/supabase'
import { fmt, kzt, sum, formatDate, formatDateTime } from '@/shared/lib/format'
import { useI18n, type TKey } from '@/shared/i18n'
import { useAction } from '@/shared/hooks/useAction'
import { Alert, BarChart, Card, Empty, Field, Kpi, Modal, PageHead, QtyInput, StatusTag } from '@/shared/ui/components'
import { useCompany } from '@/features/company/context'
import type { Order, OrderStatus } from '@/shared/types/domain'
import { useDayLabels } from './planning'

const NEXT: Partial<Record<OrderStatus, [OrderStatus, TKey]>> = {
  new: ['confirmed', 'orders.confirm'],
  confirmed: ['assembling', 'orders.assemble'],
  assembling: ['transit', 'orders.send'],
  transit: ['delivered', 'orders.delivered'],
}
type Filter = 'active' | 'new' | 'transit' | 'delivered' | 'all'

export function OrdersPage() {
  const { t, locale } = useI18n()
  const { data, model: m, reload } = useCompany()
  const [filter, setFilter] = useState<Filter>('active')
  const [ship, setShip] = useState<Order | null>(null)
  const [run, busy] = useAction()
  const pName = (id: string) => data.products.find((p) => p.id === id)?.name ?? '—'
  const sName = (id: string) => data.stores.find((s) => s.id === id)?.name ?? '—'
  const list = data.orders.filter((o) =>
    filter === 'all'
      ? true
      : filter === 'active'
        ? !['delivered', 'cancelled'].includes(o.status)
        : o.status === filter,
  )
  const setStatus = (o: Order, status: OrderStatus, extra: { p_courier?: string; p_eta?: string } = {}) =>
    void run(
      () => rpc('set_order_status', { p_order: o.id, p_status: status, ...extra }),
      t('orders.changed', { n: o.number, status: t(`status.${status}`) }),
    ).then(reload)
  const tabs: [Filter, TKey][] = [
    ['active', 'orders.fActive'],
    ['new', 'orders.fNew'],
    ['transit', 'orders.fTransit'],
    ['delivered', 'orders.fDelivered'],
    ['all', 'orders.fAll'],
  ]

  return (
    <div className="page">
      <PageHead title={t('orders.title')} sub={t('orders.sub')} />
      <div className="tabs" role="tablist">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={filter === k}
            className={filter === k ? 'on' : ''}
            onClick={() => setFilter(k)}
          >
            {t(l)}
          </button>
        ))}
      </div>
      <div className="stack">
        {list.map((o) => {
          const status = o.status as OrderStatus
          const flags =
            status === 'new'
              ? o.items
                  .map((i) => ({
                    ...i,
                    need: Math.max(0, m.need(o.store_id, i.product_id) - m.stockOf(o.store_id, i.product_id)),
                  }))
                  .filter((i) => i.need > 0 && Math.abs(i.qty - i.need) / i.need > 0.35)
              : []
          const next = NEXT[status]
          return (
            <Card
              key={o.id}
              title={
                <span className="row">
                  {t('orders.num', { n: o.number })} · {sName(o.store_id)} <StatusTag status={status} />
                </span>
              }
              sub={[
                t('orders.created', { at: formatDateTime(o.created_at, locale) }),
                t('orders.for', { date: formatDate(o.delivery_date, locale) }) +
                  (o.delivery_slot ? `, ${o.delivery_slot}` : ''),
                kzt(sum(o.items.map((i) => i.qty * i.price))),
                o.comment ? `«${o.comment}»` : '',
              ]
                .filter(Boolean)
                .join(' · ')}
              right={
                <div className="row">
                  {['new', 'confirmed'].includes(status) && (
                    <button className="btn sm" disabled={busy} onClick={() => setStatus(o, 'cancelled')}>
                      {t('common.cancel')}
                    </button>
                  )}
                  {next && (
                    <button
                      className="btn pri sm"
                      disabled={busy}
                      onClick={() => (next[0] === 'transit' ? setShip(o) : setStatus(o, next[0]))}
                    >
                      {t(next[1])}
                    </button>
                  )}
                </div>
              }
            >
              <ul className="chips">
                {o.items.map((i) => (
                  <li key={i.product_id} className="tag gray">
                    {pName(i.product_id)}: <b className="num">{fmt(i.qty)}</b>
                  </li>
                ))}
              </ul>
              {flags.map((i) => (
                <Alert
                  key={i.product_id}
                  tone="amber"
                  icon="💡"
                  title={t('orders.flag', { product: pName(i.product_id), qty: fmt(i.qty), need: i.need })}
                >
                  {i.qty > i.need ? t('orders.flagMore') : t('orders.flagLess')}
                </Alert>
              ))}
              {o.courier && ['transit', 'delivered'].includes(status) && (
                <p className="muted">
                  🚚 {o.courier}
                  {o.eta ? `, ${t('orders.eta', { eta: o.eta })}` : ''}
                </p>
              )}
            </Card>
          )
        })}
        {list.length === 0 && (
          <div className="card">
            <Empty>{t('orders.none')}</Empty>
          </div>
        )}
      </div>
      {ship && (
        <ShipModal
          order={ship}
          onClose={() => setShip(null)}
          onSend={(c, e) => {
            setShip(null)
            setStatus(ship, 'transit', { p_courier: c || undefined, p_eta: e || undefined })
          }}
        />
      )}
    </div>
  )
}

function ShipModal({
  order,
  onClose,
  onSend,
}: {
  order: Order
  onClose: () => void
  onSend: (courier: string, eta: string) => void
}) {
  const { t } = useI18n()
  const [c, setC] = useState('')
  const [e, setE] = useState('')
  return (
    <Modal title={t('orders.shipTitle', { n: order.number })} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(x) => {
          x.preventDefault()
          onSend(c.trim(), e.trim())
        }}
      >
        <Field
          label={t('orders.courier')}
          value={c}
          onChange={(x) => setC(x.target.value)}
          placeholder="Нурбол, 777 ABC 01"
          maxLength={120}
        />
        <Field
          label={t('orders.etaLabel')}
          value={e}
          onChange={(x) => setE(x.target.value)}
          placeholder="09:30"
          maxLength={20}
        />
        <p className="faint small">{t('orders.shipNote')}</p>
        <button className="btn pri">{t('orders.send')}</button>
      </form>
    </Modal>
  )
}

export function StockPage() {
  const { t, locale } = useI18n()
  const { data, model: m, reload, activeStores: stores, activeProducts: products } = useCompany()
  const [wh, setWh] = useState<Record<string, number> | null>(null)
  const [run, busy] = useAction()
  const save = () =>
    void run(async () => {
      if (!wh) return
      must(
        await supabase
          .from('warehouse_stock')
          .upsert(products.map((p) => ({ company_id: data.company.id, product_id: p.id, qty: wh[p.id] ?? 0 }))),
      )
    }, t('stock.whSaved')).then(() => {
      setWh(null)
      reload()
    })
  const last = data.storeStock.reduce((a, r) => (r.updated_at > a ? r.updated_at : a), '')
  return (
    <div className="page">
      <PageHead
        title={t('nav.stock')}
        sub={last ? t('stock.updated', { at: formatDateTime(last, locale) }) : t('stock.never')}
        actions={
          wh ? (
            <>
              <button className="btn" onClick={() => setWh(null)}>
                {t('common.cancel')}
              </button>
              <button className="btn pri" disabled={busy} onClick={save}>
                {t('stock.saveWh')}
              </button>
            </>
          ) : (
            <button
              className="btn"
              onClick={() => setWh(Object.fromEntries(products.map((p) => [p.id, m.warehouseOf(p.id)])))}
            >
              {t('stock.inventory')}
            </button>
          )
        }
      />
      <ul className="legend">
        <li>
          <span className="cell low">12</span> {t('stock.low')}
        </li>
        <li>
          <span className="cell ok">12</span> {t('stock.ok')}
        </li>
        <li>
          <span className="cell excess">12</span> {t('stock.excess')}
        </li>
      </ul>
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
                  {t('stock.warehouse')}
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{p.name}</th>
                  {stores.map((s) => {
                    const st = m.state(s.id, p.id)
                    const label = st === 'none' ? '' : t(`stock.${st}`)
                    return (
                      <td key={s.id} className="c">
                        <span className={`cell ${st === 'none' ? '' : st}`} title={label}>
                          {fmt(m.stockOf(s.id, p.id))}
                        </span>
                        <span className="sr-only">{label}</span>
                        <div className="faint tiny">
                          {m.avg7(s.id, p.id)
                            ? t('stock.days', { n: m.cover(s.id, p.id).toFixed(1) })
                            : t('stock.noSales')}
                        </div>
                      </td>
                    )
                  })}
                  <td className="r">
                    {wh ? (
                      <QtyInput
                        decimal
                        label={`${t('stock.warehouse')}: ${p.name}`}
                        value={wh[p.id] ?? 0}
                        onChange={(v) => setWh({ ...wh, [p.id]: v })}
                      />
                    ) : (
                      <span className="num">{fmt(m.warehouseOf(p.id))}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

type ReportTab = 'stores' | 'products' | 'matrix'
export function ReportsPage() {
  const { t } = useI18n()
  const { data, model: m, activeStores: stores, activeProducts: products } = useCompany()
  const labels = useDayLabels()
  const [tab, setTab] = useState<ReportTab>('stores')
  const rows = products
    .map((p) => {
      const u = m.units(m.last7, p.id)
      const prev = m.units(m.prev7, p.id)
      const rev = sum(
        data.sales.filter((r) => r.product_id === p.id && m.last7.has(r.shift_date)).map((r) => r.qty * r.price),
      )
      return { p, u, rev, margin: rev - u * p.cost, d: prev ? ((u - prev) / prev) * 100 : null }
    })
    .sort((a, b) => b.rev - a.rev)
  const week = m.revenue(m.last7)
  const margin = sum(rows.map((r) => r.margin))
  const exportCsv = () => {
    const head = [
      t('report.csvDate'),
      t('report.csvStore'),
      t('common.product'),
      t('report.csvQty'),
      t('report.csvPrice'),
      t('report.csvSum'),
    ]
    const esc = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`
    const lines = [head.map(esc).join(';')]
    for (const r of data.sales)
      lines.push(
        [
          r.shift_date,
          data.stores.find((s) => s.id === r.store_id)?.name,
          data.products.find((p) => p.id === r.product_id)?.name,
          r.qty,
          r.price,
          r.qty * r.price,
        ]
          .map(esc)
          .join(';'),
      )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }))
    a.download = `qoima-sales-${m.days[0]}-${m.days.at(-1)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const Dyn = ({ v }: { v: number | null }) =>
    v === null ? (
      <span className="faint">—</span>
    ) : (
      <span className={v >= 0 ? 'up' : 'down'}>
        {v >= 0 ? '+' : ''}
        {v.toFixed(1)}%
      </span>
    )
  const tabs: [ReportTab, TKey][] = [
    ['stores', 'report.byStore'],
    ['products', 'report.byProduct'],
    ['matrix', 'report.matrix'],
  ]
  return (
    <div className="page">
      <PageHead
        title={t('nav.reports')}
        sub={t('report.sub')}
        actions={
          <button className="btn" onClick={exportCsv}>
            {t('report.export')}
          </button>
        }
      />
      <div className="grid g4 mb">
        <Kpi label={t('dash.revenue7')} value={kzt(week)} />
        <Kpi label={t('report.perDay')} value={kzt(week / 7)} />
        <Kpi
          label={t('report.margin')}
          value={kzt(margin)}
          tone="up"
          sub={week ? t('report.marginPct', { n: Math.round((margin / week) * 100) }) : undefined}
        />
        <Kpi label={t('report.units')} value={fmt(sum(rows.map((r) => r.u)))} />
      </div>
      <Card title={t('dash.byDay')} sub={t('report.days28')} className="mb">
        <BarChart title={t('dash.byDay')} data={m.revenueByDay} labels={labels(m.days)} format={kzt} height={170} />
      </Card>
      <div className="tabs" role="tablist">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? 'on' : ''}
            onClick={() => setTab(k)}
          >
            {t(l)}
          </button>
        ))}
      </div>
      <Card flush>
        <div className="tw">
          {tab === 'stores' && (
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('report.csvStore')}</th>
                  <th scope="col" className="r">
                    {t('dash.revenue7')}
                  </th>
                  <th scope="col" className="r">
                    {t('report.prevWeek')}
                  </th>
                  <th scope="col" className="r">
                    {t('report.dyn')}
                  </th>
                  <th scope="col" className="r">
                    {t('report.shifts')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => {
                  const r = m.revenue(m.last7, s.id)
                  const p = m.revenue(m.prev7, s.id)
                  return (
                    <tr key={s.id}>
                      <th scope="row">{s.name}</th>
                      <td className="r num">{kzt(r)}</td>
                      <td className="r num muted">{kzt(p)}</td>
                      <td className="r num">
                        <Dyn v={p ? ((r - p) / p) * 100 : null} />
                      </td>
                      <td className="r num">{data.shifts.filter((x) => x.store_id === s.id).length}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {tab === 'products' && (
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('common.product')}</th>
                  <th scope="col" className="r">
                    {t('report.sold')}
                  </th>
                  <th scope="col" className="r">
                    {t('report.revenue')}
                  </th>
                  <th scope="col" className="r">
                    {t('report.margin')}
                  </th>
                  <th scope="col" className="r">
                    {t('report.dyn')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.p.id}>
                    <th scope="row">{r.p.name}</th>
                    <td className="r num">
                      {fmt(r.u)} {r.p.unit}
                    </td>
                    <td className="r num">{kzt(r.rev)}</td>
                    <td className="r num">{kzt(r.margin)}</td>
                    <td className="r num">
                      <Dyn v={r.d} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === 'matrix' && (
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('report.sold7')}</th>
                  {stores.map((s) => (
                    <th scope="col" key={s.id} className="r">
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">{p.name}</th>
                    {stores.map((s) => (
                      <td key={s.id} className="r num">
                        {fmt(m.units(m.last7, p.id, s.id))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
