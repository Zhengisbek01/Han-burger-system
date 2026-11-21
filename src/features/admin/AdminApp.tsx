import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { rpc, supabase, must } from '@/shared/lib/supabase'
import { fmt, kzt, sum, isoDate, formatDate } from '@/shared/lib/format'
import { fieldErrors } from '@/shared/lib/validation'
import { useI18n } from '@/shared/i18n'
import { useAction } from '@/shared/hooks/useAction'
import { Card, Empty, ErrorState, Field, Kpi, Loading, Modal, PageHead, SelectField } from '@/shared/ui/components'
import { Layout, type NavSection } from '@/app/Layout'
import { AccountPage } from '@/features/account/AccountPage'
import type { Company, CompanyStatus, Plan } from '@/shared/types/domain'
import { newClientSchema } from './schemas'

interface AdminData {
  plans: Plan[]
  companies: Company[]
  stores: { company_id: string; active: boolean }[]
  profiles: { company_id: string | null; role: string | null; email: string | null }[]
  orders: { company_id: string }[]
}

function useAdminData() {
  const [data, setData] = useState<AdminData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    try {
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
      const [plans, companies, stores, profiles, orders] = await Promise.all([
        supabase.from('plans').select('*').order('sort').then(must),
        supabase.from('companies').select('*').order('created_at').then(must),
        supabase.from('stores').select('company_id, active').then(must),
        supabase.from('profiles').select('company_id, role, email').then(must),
        supabase.from('orders').select('company_id').gte('created_at', since).then(must),
      ])
      setData({ plans, companies, stores, profiles, orders })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  return { data, error, reload: load }
}

const STATUS_TONE: Record<CompanyStatus, string> = { active: 'green', trial: 'blue', overdue: 'red', blocked: 'gray' }

export function AdminApp() {
  const { t } = useI18n()
  const { data, error, reload } = useAdminData()
  const sections: NavSection[] = [
    {
      title: 'nav.platform',
      items: [
        { to: '/admin', icon: '◎', label: 'nav.companies', end: true },
        { to: '/admin/plans', icon: '₸', label: 'nav.plans' },
        { to: '/admin/new', icon: '+', label: 'nav.newClient' },
      ],
    },
  ]
  let body
  if (error) body = <ErrorState text={error} onRetry={reload} />
  else if (!data) body = <Loading />
  else
    body = (
      <Routes>
        <Route path="/admin" element={<Companies data={data} reload={reload} />} />
        <Route path="/admin/plans" element={<Plans data={data} reload={reload} />} />
        <Route path="/admin/new" element={<NewClient data={data} reload={reload} />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    )
  return (
    <Layout sections={sections} subtitle={t('roles.superadmin')}>
      {body}
    </Layout>
  )
}

type P = { data: AdminData; reload: () => Promise<void> }

function Companies({ data, reload }: P) {
  const { t, locale } = useI18n()
  const [edit, setEdit] = useState<Company | null>(null)
  const [run, busy] = useAction()
  const plan = (id: string) => data.plans.find((p) => p.id === id)
  const paying = data.companies.filter((c) => c.status === 'active')
  const mrr = sum(paying.map((c) => plan(c.plan_id)?.price))
  const count = (arr: { company_id: string | null }[], id: string) => arr.filter((x) => x.company_id === id).length
  const today = isoDate(new Date())
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!edit) return
    void run(
      async () =>
        must(
          await supabase
            .from('companies')
            .update({ plan_id: edit.plan_id, status: edit.status, paid_till: edit.paid_till })
            .eq('id', edit.id),
        ),
      t('common.saved'),
    ).then(() => {
      setEdit(null)
      void reload()
    })
  }
  return (
    <div className="page">
      <PageHead title={t('admin.title')} sub={t('admin.sub')} />
      <div className="grid g4 mb">
        <Kpi accent label="MRR" value={kzt(mrr)} sub={t('admin.arr', { n: fmt((mrr * 12) / 1e6) })} />
        <Kpi
          label={t('admin.companies')}
          value={data.companies.length}
          sub={t('admin.paying', {
            paying: paying.length,
            trial: data.companies.filter((c) => c.status === 'trial').length,
          })}
        />
        <Kpi label={t('nav.stores')} value={data.stores.filter((s) => s.active).length} />
        <Kpi label={t('admin.orders7')} value={data.orders.length} />
      </div>
      <Card flush>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th scope="col">{t('admin.company')}</th>
                <th scope="col">{t('company.city')}</th>
                <th scope="col">{t('admin.plan')}</th>
                <th scope="col" className="r">
                  {t('nav.stores')}
                </th>
                <th scope="col" className="r">
                  {t('admin.users')}
                </th>
                <th scope="col" className="r">
                  {t('admin.orders7')}
                </th>
                <th scope="col">{t('admin.paidTill')}</th>
                <th scope="col">{t('staff.status')}</th>
                <th scope="col">
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.companies.map((c) => {
                const owner = data.profiles.find((p) => p.company_id === c.id && p.role === 'owner')
                const st = c.status as CompanyStatus
                return (
                  <tr key={c.id}>
                    <th scope="row">
                      {c.name}
                      <div className="faint small">{owner?.email ?? t('admin.noOwner')}</div>
                    </th>
                    <td className="muted">{c.city}</td>
                    <td>
                      {plan(c.plan_id)?.name}
                      <div className="faint small num">
                        {kzt(plan(c.plan_id)?.price)} / {t('admin.month')}
                      </div>
                    </td>
                    <td className="r num">{count(data.stores, c.id)}</td>
                    <td className="r num">{count(data.profiles, c.id)}</td>
                    <td className="r num">{count(data.orders, c.id)}</td>
                    <td className={`num${c.paid_till < today ? ' down' : ''}`}>{formatDate(c.paid_till, locale)}</td>
                    <td>
                      <span className={`tag ${STATUS_TONE[st]}`}>{t(`companyStatus.${st}`)}</span>
                    </td>
                    <td className="r">
                      <button
                        className="btn sm"
                        onClick={() => setEdit({ ...c })}
                        aria-label={`${t('common.edit')}: ${c.name}`}
                      >
                        {t('common.edit')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {data.companies.length === 0 && <Empty>{t('admin.none')}</Empty>}
      </Card>
      {edit && (
        <Modal title={edit.name} onClose={() => setEdit(null)}>
          <form className="stack" onSubmit={save}>
            <SelectField
              label={t('admin.plan')}
              value={edit.plan_id}
              onChange={(e) => setEdit({ ...edit, plan_id: e.target.value })}
            >
              {data.plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {kzt(p.price)}
                </option>
              ))}
            </SelectField>
            <SelectField
              label={t('staff.status')}
              value={edit.status}
              onChange={(e) => setEdit({ ...edit, status: e.target.value })}
            >
              {(Object.keys(STATUS_TONE) as CompanyStatus[]).map((k) => (
                <option key={k} value={k}>
                  {t(`companyStatus.${k}`)}
                </option>
              ))}
            </SelectField>
            <Field
              label={t('admin.paidTill')}
              type="date"
              value={edit.paid_till}
              onChange={(e) => setEdit({ ...edit, paid_till: e.target.value })}
            />
            <button className="btn pri" disabled={busy}>
              {t('common.save')}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Plans({ data, reload }: P) {
  const { t } = useI18n()
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.plans.map((p) => [p.id, String(p.price)])),
  )
  const [run, busy] = useAction()
  const save = (p: Plan) =>
    void run(
      async () =>
        must(
          await supabase
            .from('plans')
            .update({ price: Number(prices[p.id]) })
            .eq('id', p.id),
        ),
      t('admin.priceSaved'),
    ).then(reload)
  return (
    <div className="page">
      <PageHead title={t('nav.plans')} sub={t('admin.plansSub')} />
      <div className="grid g3">
        {data.plans.map((p) => (
          <article key={p.id} className={`card plan-card${p.id === 'biz' ? ' hl' : ''}`}>
            <div className="row between">
              <h2>{p.name}</h2>
              <span className="faint">
                {t('admin.nCompanies', { n: data.companies.filter((c) => c.plan_id === p.id).length })}
              </span>
            </div>
            <Field
              label={t('admin.pricePerMonth')}
              inputMode="numeric"
              value={prices[p.id] ?? ''}
              onChange={(e) => setPrices({ ...prices, [p.id]: e.target.value.replace(/\D/g, '') })}
            />
            <p className="muted">{p.max_stores ? t('admin.maxStores', { n: p.max_stores }) : t('admin.unlimited')}</p>
            <ul>
              {(Array.isArray(p.features) ? (p.features as string[]) : []).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button className="btn sm" disabled={busy || Number(prices[p.id]) === p.price} onClick={() => save(p)}>
              {t('common.save')}
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}

function NewClient({ data, reload }: P) {
  const { t } = useI18n()
  const nav = useNavigate()
  const [v, setV] = useState({
    name: '',
    bin: '',
    city: 'Астана',
    plan: 'biz',
    ownerName: '',
    ownerEmail: '',
    trialDays: '14',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [run, busy] = useAction()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const r = newClientSchema.safeParse(v)
    if (!r.success) return setErrors(fieldErrors(r.error, t))
    setErrors({})
    void run(
      () =>
        rpc('admin_create_company', {
          p_name: r.data.name,
          p_bin: r.data.bin ?? '',
          p_city: r.data.city,
          p_plan: r.data.plan,
          p_owner_email: r.data.ownerEmail,
          p_owner_name: r.data.ownerName,
          p_trial_days: r.data.trialDays,
        }),
      t('admin.created'),
    ).then((id) => {
      if (id) {
        void reload()
        nav('/admin')
      }
    })
  }
  const F = (k: keyof typeof v, label: string, extra: object = {}) => (
    <Field
      label={label}
      value={v[k]}
      onChange={(e) => setV({ ...v, [k]: e.target.value })}
      error={errors[k]}
      {...extra}
    />
  )
  return (
    <div className="page narrow">
      <PageHead title={t('nav.newClient')} sub={t('admin.newSub')} />
      <Card>
        <form onSubmit={submit} noValidate>
          <div className="grid g2">
            {F('name', t('company.name'), { placeholder: 'ТОО «…»' })}
            {F('bin', t('company.binOptional'), { inputMode: 'numeric', maxLength: 12 })}
            {F('city', t('company.city'))}
            <SelectField label={t('admin.plan')} value={v.plan} onChange={(e) => setV({ ...v, plan: e.target.value })}>
              {data.plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {kzt(p.price)}
                </option>
              ))}
            </SelectField>
            {F('ownerName', t('admin.ownerName'))}
            {F('ownerEmail', t('admin.ownerEmail'), { type: 'email' })}
            {F('trialDays', t('admin.trialDays'), { inputMode: 'numeric' })}
          </div>
          <button className="btn pri mt" disabled={busy}>
            {t('admin.create')}
          </button>
        </form>
      </Card>
    </div>
  )
}
