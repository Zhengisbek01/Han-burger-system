import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { rpc, supabase, must } from '@/shared/lib/supabase'
import { kzt } from '@/shared/lib/format'
import { fieldErrors } from '@/shared/lib/validation'
import { useI18n, translateError } from '@/shared/i18n'
import { useAction } from '@/shared/hooks/useAction'
import { useToast } from '@/shared/ui/toast'
import { Card, Empty, Field, Loading, Modal, PageHead, SelectField } from '@/shared/ui/components'
import { useCompany } from '@/features/company/context'
import { useProfile } from '@/app/auth'
import type { Invitation, Product, Profile, Store } from '@/shared/types/domain'
import { inviteSchema, productSchema, settingsSchema, storeSchema } from './schemas'

// ——— Магазины ———
export function StoresPage() {
  const { t } = useI18n()
  const { data, model: m, reload, activeProducts } = useCompany()
  const [form, setForm] = useState<Partial<Store> | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [run, busy] = useAction()
  const lim = data.company.plans?.max_stores
  const open = (s: Partial<Store>) => {
    setErrors({})
    setForm(s)
  }
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    const r = storeSchema.safeParse({
      name: form.name ?? '',
      address: form.address ?? null,
      active: form.active ?? true,
    })
    if (!r.success) return setErrors(fieldErrors(r.error, t))
    void run(async () => {
      must(
        form.id
          ? await supabase.from('stores').update(r.data).eq('id', form.id)
          : await supabase.from('stores').insert({ ...r.data, company_id: data.company.id }),
      )
    }, t('common.saved')).then(() => {
      setForm(null)
      reload()
    })
  }
  return (
    <div className="page">
      <PageHead
        title={t('nav.stores')}
        sub={
          t('stores.sub', { n: data.stores.filter((s) => s.active).length }) +
          (lim ? ' ' + t('stores.limit', { lim, plan: data.company.plans?.name ?? '' }) : '')
        }
        actions={
          <button className="btn pri" onClick={() => open({ name: '', address: '', active: true })}>
            + {t('stores.add')}
          </button>
        }
      />
      {data.stores.length === 0 && (
        <div className="card">
          <Empty>{t('stores.none')}</Empty>
        </div>
      )}
      <div className="grid g3">
        {data.stores.map((s) => {
          const low = activeProducts.filter((p) => m.state(s.id, p.id) === 'low').length
          return (
            <article className={`card card-b${s.active ? '' : ' dim'}`} key={s.id}>
              <div className="row between">
                <h2>{s.name}</h2>
                {!s.active ? (
                  <span className="tag gray">{t('stores.closed')}</span>
                ) : low ? (
                  <span className="tag red">{t('stores.low', { n: low })}</span>
                ) : (
                  <span className="tag green">{t('stores.ok')}</span>
                )}
              </div>
              <p className="muted">{s.address || t('stores.noAddress')}</p>
              <div className="faint small">{t('dash.revenue7')}</div>
              <b className="num">{kzt(m.revenue(m.last7, s.id))}</b>
              <div>
                <button className="btn sm" style={{ marginTop: 12 }} onClick={() => open(s)}>
                  {t('common.edit')}
                </button>
              </div>
            </article>
          )
        })}
      </div>
      {form && (
        <Modal title={form.id ? t('stores.edit') : t('stores.add')} onClose={() => setForm(null)}>
          <form className="stack" onSubmit={save} noValidate>
            <Field
              label={t('common.name')}
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
              placeholder="Хан Шатыр"
            />
            <Field
              label={t('stores.address')}
              value={form.address ?? ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              error={errors.address}
            />
            {form.id && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.active ?? true}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />{' '}
                {t('stores.active')}
              </label>
            )}
            <button className="btn pri" disabled={busy}>
              {t('common.save')}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ——— Продукция ———
type ProductForm = {
  id?: string
  name: string
  category: string
  unit: string
  price: string
  cost: string
  shelf_days: string
  active: boolean
}
const toForm = (p?: Product): ProductForm => ({
  id: p?.id,
  name: p?.name ?? '',
  category: p?.category ?? '',
  unit: p?.unit ?? 'шт',
  price: String(p?.price ?? ''),
  cost: String(p?.cost ?? ''),
  shelf_days: String(p?.shelf_days ?? 1),
  active: p?.active ?? true,
})

export function ProductsPage() {
  const { t } = useI18n()
  const { data, reload } = useCompany()
  const [form, setForm] = useState<ProductForm | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [run, busy] = useAction()
  const open = (p?: Product) => {
    setErrors({})
    setForm(toForm(p))
  }
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    const r = productSchema.safeParse(form)
    if (!r.success) return setErrors(fieldErrors(r.error, t))
    void run(async () => {
      must(
        form.id
          ? await supabase.from('products').update(r.data).eq('id', form.id)
          : await supabase
              .from('products')
              .insert({ ...r.data, company_id: data.company.id, sort: data.products.length + 1 }),
      )
    }, t('common.saved')).then(() => {
      setForm(null)
      reload()
    })
  }
  const F = (k: keyof Omit<ProductForm, 'id' | 'active'>, label: string, extra: object = {}) => (
    <Field
      label={label}
      value={form?.[k] ?? ''}
      onChange={(e) => form && setForm({ ...form, [k]: e.target.value })}
      error={errors[k]}
      {...extra}
    />
  )
  return (
    <div className="page">
      <PageHead
        title={t('nav.products')}
        sub={t('products.sub')}
        actions={
          <button className="btn pri" onClick={() => open()}>
            + {t('products.add')}
          </button>
        }
      />
      <Card flush>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th scope="col">{t('common.name')}</th>
                <th scope="col">{t('common.category')}</th>
                <th scope="col" className="r">
                  {t('products.cost')}
                </th>
                <th scope="col" className="r">
                  {t('products.price')}
                </th>
                <th scope="col" className="r">
                  {t('products.margin')}
                </th>
                <th scope="col" className="r">
                  {t('products.shelf')}
                </th>
                <th scope="col">
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.id} className={p.active ? '' : 'dim'}>
                  <th scope="row">
                    {p.name}
                    {!p.active && <span className="tag gray ml">{t('products.hidden')}</span>}
                  </th>
                  <td className="muted">{p.category}</td>
                  <td className="r num">{kzt(p.cost)}</td>
                  <td className="r num">{kzt(p.price)}</td>
                  <td className="r num">{p.price ? `${Math.round((1 - p.cost / p.price) * 100)}%` : '—'}</td>
                  <td className="r muted">{t('products.days', { n: p.shelf_days })}</td>
                  <td className="r">
                    <button className="btn sm" onClick={() => open(p)} aria-label={`${t('common.edit')}: ${p.name}`}>
                      {t('common.edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.products.length === 0 && <Empty>{t('products.none')}</Empty>}
      </Card>
      {form && (
        <Modal title={form.id ? t('products.edit') : t('products.add')} onClose={() => setForm(null)}>
          <form onSubmit={save} noValidate>
            <div className="grid g2">
              <div className="span2">{F('name', t('common.name'))}</div>
              {F('category', t('common.category'), { placeholder: 'Бургеры' })}
              {F('unit', t('products.unit'))}
              {F('price', t('products.priceVat'), { inputMode: 'decimal' })}
              {F('cost', t('products.cost'), { inputMode: 'decimal' })}
              {F('shelf_days', t('products.shelfDays'), { inputMode: 'numeric' })}
              {form.id && (
                <label className="check self-end">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />{' '}
                  {t('products.onSale')}
                </label>
              )}
            </div>
            <button className="btn pri block mt" disabled={busy}>
              {t('common.save')}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ——— Сотрудники ———
export function StaffPage() {
  const { t } = useI18n()
  const toast = useToast()
  const { data, activeStores } = useCompany()
  const me = useProfile()
  const owner = me.role === 'owner'
  const [list, setList] = useState<Profile[] | null>(null)
  const [inv, setInv] = useState<Invitation[]>([])
  const [form, setForm] = useState<{
    email: string
    name: string
    role: 'store' | 'manager'
    store: string | null
  } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [run, busy] = useAction()

  const load = useCallback(async () => {
    try {
      setList(must(await supabase.from('profiles').select('*').eq('company_id', data.company.id).order('created_at')))
      if (owner)
        setInv(
          must(
            await supabase
              .from('invitations')
              .select('*')
              .eq('company_id', data.company.id)
              .is('accepted_at', null)
              .order('created_at'),
          ),
        )
    } catch (e) {
      toast(translateError(t, e instanceof Error ? e.message : String(e)), 'error')
    }
  }, [data.company.id, owner, t, toast])
  useEffect(() => {
    void load()
  }, [load])

  const invite = (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    const r = inviteSchema.safeParse(form)
    if (!r.success) return setErrors(fieldErrors(r.error, t))
    void run(
      () =>
        rpc('invite_employee', {
          p_email: r.data.email,
          p_name: r.data.name,
          p_role: r.data.role,
          p_store: r.data.role === 'store' ? (r.data.store ?? undefined) : undefined,
        }),
      (res) => (res === 'linked' ? t('staff.linked') : t('staff.invited')),
    ).then(() => {
      setForm(null)
      void load()
    })
  }
  const toggle = (p: Profile) =>
    void run(
      async () => must(await supabase.from('profiles').update({ active: !p.active }).eq('id', p.id)),
      t('common.saved'),
    ).then(load)
  const revoke = (i: Invitation) =>
    void run(async () => must(await supabase.from('invitations').delete().eq('id', i.id)), t('staff.revoked')).then(
      load,
    )
  const sName = (id: string | null) => data.stores.find((s) => s.id === id)?.name ?? '—'
  const roleName = (r: string | null) => (r ? t(`roles.${r as 'owner'}`) : '—')

  if (!list) return <Loading />
  return (
    <div className="page">
      <PageHead
        title={t('staff.title')}
        sub={t('staff.sub')}
        actions={
          owner && (
            <button
              className="btn pri"
              onClick={() => {
                setErrors({})
                setForm({ email: '', name: '', role: 'store', store: activeStores[0]?.id ?? null })
              }}
            >
              + {t('staff.invite')}
            </button>
          )
        }
      />
      <Card flush>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th scope="col">{t('staff.person')}</th>
                <th scope="col">{t('staff.role')}</th>
                <th scope="col">{t('staff.store')}</th>
                <th scope="col">{t('staff.status')}</th>
                <th scope="col">
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <th scope="row">
                    {p.full_name || '—'}
                    <div className="faint small">{p.email}</div>
                  </th>
                  <td>{roleName(p.role)}</td>
                  <td className="muted">{sName(p.store_id)}</td>
                  <td>
                    {p.active ? (
                      <span className="tag green">{t('staff.active')}</span>
                    ) : (
                      <span className="tag gray">{t('staff.disabled')}</span>
                    )}
                  </td>
                  <td className="r">
                    {owner && p.id !== me.id && (
                      <button className="btn sm" disabled={busy} onClick={() => toggle(p)}>
                        {p.active ? t('staff.disable') : t('staff.enable')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {inv.map((i) => (
                <tr key={i.id}>
                  <th scope="row">
                    {i.full_name || '—'}
                    <div className="faint small">{i.email}</div>
                  </th>
                  <td>{roleName(i.role)}</td>
                  <td className="muted">{sName(i.store_id)}</td>
                  <td>
                    <span className="tag blue">{t('staff.pending')}</span>
                  </td>
                  <td className="r">
                    <button className="btn sm" disabled={busy} onClick={() => revoke(i)}>
                      {t('staff.revoke')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {form && (
        <Modal title={t('staff.inviteTitle')} onClose={() => setForm(null)}>
          <form className="stack" onSubmit={invite} noValidate>
            <Field
              label={t('auth.email')}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />
            <Field
              label={t('auth.name')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
            />
            <SelectField
              label={t('staff.role')}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as 'store' | 'manager' })}
            >
              <option value="store">{t('staff.roleStore')}</option>
              <option value="manager">{t('roles.manager')}</option>
            </SelectField>
            {form.role === 'store' && (
              <SelectField
                label={t('staff.store')}
                value={form.store ?? ''}
                onChange={(e) => setForm({ ...form, store: e.target.value || null })}
              >
                {activeStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectField>
            )}
            {errors.store && <span className="err">{errors.store}</span>}
            <p className="faint small">{t('staff.inviteNote')}</p>
            <button className="btn pri" disabled={busy}>
              {t('staff.invite')}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ——— Компания ———
export function SettingsPage() {
  const { t, locale } = useI18n()
  const { data, reload } = useCompany()
  const me = useProfile()
  const owner = me.role === 'owner'
  const c = data.company
  const [v, setV] = useState({ name: c.name, city: c.city ?? '', safety_pct: String(c.safety_pct) })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [run, busy] = useAction()
  const save = (e: FormEvent) => {
    e.preventDefault()
    const r = settingsSchema.safeParse(v)
    if (!r.success) return setErrors(fieldErrors(r.error, t))
    setErrors({})
    void run(async () => must(await supabase.from('companies').update(r.data).eq('id', c.id)), t('common.saved')).then(
      reload,
    )
  }
  const statusKey = `companyStatus.${c.status as 'trial'}` as const
  return (
    <div className="page narrow">
      <PageHead
        title={t('nav.company')}
        sub={t('settings.plan', {
          plan: c.plans?.name ?? '',
          status: t(statusKey),
          till: new Date(c.paid_till).toLocaleDateString(locale === 'en' ? 'en-GB' : 'ru-RU'),
        })}
      />
      <Card>
        <form onSubmit={save} noValidate>
          <fieldset disabled={!owner} className="grid g2 plain">
            <Field
              label={t('company.name')}
              value={v.name}
              onChange={(e) => setV({ ...v, name: e.target.value })}
              error={errors.name}
            />
            <Field label={t('company.bin')} value={c.bin ?? '—'} readOnly hint={t('settings.binHint')} />
            <Field
              label={t('company.city')}
              value={v.city}
              onChange={(e) => setV({ ...v, city: e.target.value })}
              error={errors.city}
            />
            <Field
              label={t('settings.safety')}
              inputMode="numeric"
              value={v.safety_pct}
              onChange={(e) => setV({ ...v, safety_pct: e.target.value })}
              error={errors.safety_pct}
              hint={t('settings.safetyHint')}
            />
          </fieldset>
          {owner && (
            <button className="btn pri mt" disabled={busy}>
              {t('common.save')}
            </button>
          )}
        </form>
      </Card>
    </div>
  )
}
