import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { rpc, supabase, must } from '@/shared/lib/supabase'
import { fmt, kzt, sum, isoDate, vatIncluded, formatDateTime } from '@/shared/lib/format'
import { useI18n } from '@/shared/i18n'
import { useAction } from '@/shared/hooks/useAction'
import {
  Alert,
  Card,
  Empty,
  ErrorState,
  Field,
  Kpi,
  PageHead,
  QtyInput,
  SelectField,
  StatusTag,
  Steps,
} from '@/shared/ui/components'
import { useCompany } from '@/features/company/context'
import { useProfile } from '@/app/auth'
import type { OrderStatus } from '@/shared/types/domain'

const useStoreId = () => useProfile().store_id ?? ''

export function StoreHomePage() {
  const { t } = useI18n()
  const { data, model: m, activeProducts } = useCompany()
  const sid = useStoreId()
  const s = data.stores.find((x) => x.id === sid)
  if (!s || !s.active) return <ErrorState text={t('store.closed')} />
  const low = activeProducts.filter((p) => m.state(sid, p.id) === 'low')
  const mine = data.orders.filter((o) => o.store_id === sid)
  const act = mine.find((o) => !['delivered', 'cancelled'].includes(o.status))
  const shift = data.shifts.find((x) => x.store_id === sid && x.shift_date === isoDate(new Date()))
  return (
    <div className="page">
      <PageHead
        title={s.name}
        sub={s.address ?? undefined}
        actions={
          <>
            <Link className="btn" to="/s/shift">
              {t('store.closeShift')}
            </Link>
            <Link className="btn pri" to="/s/order">
              + {t('nav.newOrder')}
            </Link>
          </>
        }
      />
      <div className="grid g4 mb">
        <Kpi
          accent
          label={t('store.today')}
          value={shift ? kzt(shift.total) : '—'}
          sub={shift ? t('store.shiftClosed') : t('store.shiftOpen')}
        />
        <Kpi
          label={t('store.lowCount')}
          value={low.length}
          tone={low.length ? 'down' : 'up'}
          sub={low.length ? t('store.needOrder') : t('dash.allOk')}
        />
        <Kpi
          label={t('store.activeDelivery')}
          value={act ? t('orders.num', { n: act.number }) : t('common.no')}
          sub={act ? <StatusTag status={act.status as OrderStatus} /> : undefined}
        />
        <Kpi label={t('dash.revenue7')} value={kzt(m.revenue(m.last7, sid))} />
      </div>
      <div className="grid g2">
        <Card title={t('store.lowTitle')}>
          {low.length === 0 && <p className="muted">{t('dash.allOk')}</p>}
          <div className="stack-sm">
            {low.map((p) => (
              <Alert key={p.id} tone="red" icon="⛔" title={p.name}>
                {t('dash.lowText', { stock: fmt(m.stockOf(sid, p.id)), unit: p.unit, avg: fmt(m.avg7(sid, p.id)) })}
              </Alert>
            ))}
          </div>
        </Card>
        <Card
          title={t('nav.delivery')}
          right={
            <Link className="btn ghost sm" to="/s/delivery">
              {t('common.all')} →
            </Link>
          }
        >
          {act ? (
            <>
              <div className="row between">
                <b>{t('orders.num', { n: act.number })}</b>
                <StatusTag status={act.status as OrderStatus} />
              </div>
              <Steps status={act.status as OrderStatus} />
              {act.courier && (
                <p className="muted">
                  🚚 {act.courier}
                  {act.eta ? `, ${t('orders.eta', { eta: act.eta })}` : ''}
                </p>
              )}
            </>
          ) : (
            <p className="muted">{t('store.noDelivery')}</p>
          )}
        </Card>
      </div>
    </div>
  )
}

export function StoreStockPage() {
  const { t } = useI18n()
  const { data, model: m, reload, activeProducts } = useCompany()
  const sid = useStoreId()
  const [draft, setDraft] = useState<Record<string, number>>(() =>
    Object.fromEntries(activeProducts.map((p) => [p.id, m.stockOf(sid, p.id)])),
  )
  const [run, busy] = useAction()
  const save = () =>
    void run(async () => {
      must(
        await supabase.from('store_stock').upsert(
          activeProducts.map((p) => ({
            company_id: data.company.id,
            store_id: sid,
            product_id: p.id,
            qty: draft[p.id] ?? 0,
          })),
        ),
      )
    }, t('store.stockSaved')).then(reload)
  return (
    <div className="page">
      <PageHead
        title={t('nav.stock')}
        sub={t('store.stockSub')}
        actions={
          <button className="btn pri" disabled={busy} onClick={save}>
            {t('common.save')}
          </button>
        }
      />
      <Card flush>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th scope="col">{t('common.product')}</th>
                <th scope="col" className="r">
                  {t('store.was')}
                </th>
                <th scope="col" className="r">
                  {t('store.fact')}
                </th>
                <th scope="col" className="r">
                  {t('store.perDay')}
                </th>
              </tr>
            </thead>
            <tbody>
              {activeProducts.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{p.name}</th>
                  <td className="r num muted">{fmt(m.stockOf(sid, p.id))}</td>
                  <td className="r nowrap">
                    <QtyInput
                      decimal
                      label={`${t('store.fact')}: ${p.name}`}
                      value={draft[p.id] ?? 0}
                      onChange={(v) => setDraft({ ...draft, [p.id]: v })}
                    />{' '}
                    <span className="faint">{p.unit}</span>
                  </td>
                  <td className="r num">~{fmt(m.avg7(sid, p.id))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export function ShiftPage() {
  const { t } = useI18n()
  const { data, model: m, reload, activeProducts } = useCompany()
  const sid = useStoreId()
  const nav = useNavigate()
  const today = isoDate(new Date())
  const [date, setDate] = useState(today)
  const [q, setQ] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')
  const [run, busy] = useAction()
  const closed = data.shifts.find((x) => x.store_id === sid && x.shift_date === date)
  const total = sum(activeProducts.map((p) => (q[p.id] ?? 0) * p.price))
  const units = sum(activeProducts.map((p) => q[p.id] ?? 0))
  const submit = () =>
    void run(
      () =>
        rpc('close_shift', {
          p_store: sid,
          p_items: activeProducts.map((p) => ({ product_id: p.id, qty: q[p.id] ?? 0 })),
          p_comment: comment.trim() || undefined,
          p_date: date,
        }),
      t('store.shiftDone'),
    ).then((r) => {
      if (r !== undefined) {
        reload()
        nav('/s')
      }
    })
  return (
    <div className="page">
      <PageHead title={t('nav.shift')} sub={t('store.shiftSub')} />
      <div className="grid g-side">
        <Card flush>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('common.product')}</th>
                  <th scope="col" className="r">
                    {t('products.price')}
                  </th>
                  <th scope="col" className="r">
                    {t('store.sold')}
                  </th>
                  <th scope="col" className="r">
                    {t('report.csvSum')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeProducts.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">
                      {p.name}
                      <div className="faint small">
                        {t('store.usually', {
                          n: fmt(m.avg7(sid, p.id)),
                          unit: p.unit,
                          stock: fmt(m.stockOf(sid, p.id)),
                        })}
                      </div>
                    </th>
                    <td className="r num muted">{kzt(p.price)}</td>
                    <td className="r">
                      <QtyInput
                        label={`${t('store.sold')}: ${p.name}`}
                        value={q[p.id] ?? ''}
                        onChange={(v) => setQ({ ...q, [p.id]: v })}
                      />
                    </td>
                    <td className="r num">{kzt((q[p.id] ?? 0) * p.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title={t('store.shiftTotal')} className="sticky">
          <div className="stack">
            <Field
              label={t('store.shiftDate')}
              type="date"
              max={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {closed && (
              <Alert tone="amber" icon="⚠️" title={t('errors.shiftClosed')}>
                {kzt(closed.total)}
              </Alert>
            )}
            <dl className="totals">
              <div>
                <dt>{t('store.unitsSold')}</dt>
                <dd className="num">{fmt(units)}</dd>
              </div>
              <div>
                <dt>{t('report.revenue')}</dt>
                <dd className="num big">{kzt(total)}</dd>
              </div>
              <div>
                <dt>{t('store.vat')}</dt>
                <dd className="num">{kzt(vatIncluded(total))}</dd>
              </div>
            </dl>
            <div className="f">
              <label htmlFor="shift-comment">{t('common.comment')}</label>
              <textarea
                id="shift-comment"
                className="inp"
                rows={3}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('store.commentHint')}
              />
            </div>
            <button className="btn pri block" disabled={busy || !units || Boolean(closed)} onClick={submit}>
              {t('store.closeShift')}
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function NewOrderPage() {
  const { t } = useI18n()
  const { model: m, reload, activeProducts } = useCompany()
  const sid = useStoreId()
  const nav = useNavigate()
  const suggested = Object.fromEntries(activeProducts.map((p) => [p.id, m.toSend(sid, p.id)]))
  const [q, setQ] = useState<Record<string, number>>(suggested)
  const [comment, setComment] = useState('')
  const [slot, setSlot] = useState('до 09:00')
  const [run, busy] = useAction()
  const total = sum(activeProducts.map((p) => (q[p.id] ?? 0) * p.price))
  const count = sum(Object.values(q))
  const submit = () =>
    void run(
      () =>
        rpc('create_order', {
          p_store: sid,
          p_items: activeProducts.map((p) => ({ product_id: p.id, qty: q[p.id] ?? 0 })),
          p_comment: comment.trim() || undefined,
          p_slot: slot,
        }),
      (n) => t('store.orderSent', { n }),
    ).then((n) => {
      if (n !== undefined) {
        reload()
        nav('/s/delivery')
      }
    })
  return (
    <div className="page">
      <PageHead title={t('store.orderTitle')} sub={t('store.orderSub')} />
      <div className="grid g-side">
        <Card flush>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('common.product')}</th>
                  <th scope="col" className="r">
                    {t('store.stock')}
                  </th>
                  <th scope="col" className="r">
                    {t('store.ordered')}
                  </th>
                  <th scope="col" className="r">
                    {t('dash.colForecast')}
                  </th>
                  <th scope="col" className="r">
                    {t('store.order')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeProducts.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">{p.name}</th>
                    <td className="r num muted">{fmt(m.stockOf(sid, p.id))}</td>
                    <td className="r num muted">{fmt(m.pendingOf(sid, p.id))}</td>
                    <td className="r num">{fmt(m.forecast(sid, p.id))}</td>
                    <td className="r nowrap">
                      <QtyInput
                        label={`${t('store.order')}: ${p.name}`}
                        value={q[p.id] ?? 0}
                        highlight={(q[p.id] ?? 0) !== suggested[p.id]}
                        onChange={(v) => setQ({ ...q, [p.id]: v })}
                      />
                      {(q[p.id] ?? 0) !== suggested[p.id] && (
                        <button className="btn ghost tiny" onClick={() => setQ({ ...q, [p.id]: suggested[p.id] ?? 0 })}>
                          {t('ship.reset', { n: suggested[p.id] ?? 0 })}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title={t('store.orderCard')} className="sticky">
          <div className="stack">
            <dl className="totals">
              <div>
                <dt>{t('store.positions')}</dt>
                <dd>{Object.values(q).filter((v) => v > 0).length}</dd>
              </div>
              <div>
                <dt>{t('store.unitsSold')}</dt>
                <dd className="num">{fmt(count)}</dd>
              </div>
              <div>
                <dt>{t('report.csvSum')}</dt>
                <dd className="num big">{kzt(total)}</dd>
              </div>
            </dl>
            <SelectField label={t('store.slot')} value={slot} onChange={(e) => setSlot(e.target.value)}>
              <option value="до 09:00">{t('store.slot1')}</option>
              <option value="09:00–11:00">09:00–11:00</option>
              <option value="11:00–13:00">11:00–13:00</option>
            </SelectField>
            <div className="f">
              <label htmlFor="order-comment">{t('common.comment')}</label>
              <textarea
                id="order-comment"
                className="inp"
                rows={2}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            <button className="btn pri block" disabled={busy || !count} onClick={submit}>
              {t('store.sendOrder')}
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function DeliveryPage() {
  const { t, locale } = useI18n()
  const { data, reload } = useCompany()
  const sid = useStoreId()
  const [run, busy] = useAction()
  const mine = data.orders.filter((o) => o.store_id === sid)
  const pName = (id: string) => data.products.find((p) => p.id === id)?.name ?? '—'
  const set = (id: string, st: OrderStatus, msg: string) =>
    void run(() => rpc('set_order_status', { p_order: id, p_status: st }), msg).then(reload)
  return (
    <div className="page">
      <PageHead title={t('store.deliveryTitle')} sub={t('store.deliverySub')} />
      <div className="stack">
        {mine.map((o) => {
          const st = o.status as OrderStatus
          return (
            <Card
              key={o.id}
              title={
                <span className="row">
                  {t('orders.num', { n: o.number })} <StatusTag status={st} />
                </span>
              }
              sub={`${t('orders.created', { at: formatDateTime(o.created_at, locale) })} · ${kzt(sum(o.items.map((i) => i.qty * i.price)))}`}
              right={
                <div className="row">
                  {st === 'new' && (
                    <button
                      className="btn sm"
                      disabled={busy}
                      onClick={() => set(o.id, 'cancelled', t('store.cancelled'))}
                    >
                      {t('common.cancel')}
                    </button>
                  )}
                  {st === 'transit' && (
                    <button
                      className="btn pri sm"
                      disabled={busy}
                      onClick={() => set(o.id, 'delivered', t('store.received'))}
                    >
                      {t('store.receive')}
                    </button>
                  )}
                </div>
              }
            >
              <Steps status={st} />
              <ul className="chips">
                {o.items.map((i) => (
                  <li key={i.product_id} className="tag gray">
                    {pName(i.product_id)}: <b>{fmt(i.qty)}</b>
                  </li>
                ))}
              </ul>
              {o.courier && st === 'transit' && (
                <p className="muted">
                  🚚 {o.courier}
                  {o.eta ? `, ${t('orders.eta', { eta: o.eta })}` : ''}
                </p>
              )}
            </Card>
          )
        })}
        {mine.length === 0 && (
          <div className="card">
            <Empty>{t('orders.none')}</Empty>
          </div>
        )}
      </div>
    </div>
  )
}
