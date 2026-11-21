import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { rpc, supabase, must } from '@/shared/lib/supabase'
import { phone, text, fieldErrors } from '@/shared/lib/validation'
import { formatDateTime } from '@/shared/lib/format'
import { useI18n } from '@/shared/i18n'
import { useAction } from '@/shared/hooks/useAction'
import { Alert, Card, Field, PageHead } from '@/shared/ui/components'
import { useAuth, useProfile } from '@/app/auth'
import { LanguageSelect } from '@/app/Layout'

const profileSchema = z.object({ full_name: text(120), phone })

export function AccountPage() {
  const { t, locale } = useI18n()
  const me = useProfile()
  const { reloadProfile } = useAuth()
  const [v, setV] = useState({ full_name: me.full_name ?? '', phone: me.phone ?? '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState('')
  const [run, busy] = useAction()
  const save = (e: FormEvent) => {
    e.preventDefault()
    const r = profileSchema.safeParse(v)
    if (!r.success) return setErrors(fieldErrors(r.error, t))
    setErrors({})
    void run(async () => must(await supabase.from('profiles').update(r.data).eq('id', me.id)), t('common.saved')).then(
      reloadProfile,
    )
  }
  const canDelete = me.role === 'store' || me.role === 'manager' || !me.company_id
  return (
    <div className="page narrow">
      <PageHead title={t('account.title')} sub={me.email ?? ''} />
      <div className="stack">
        <Card title={t('account.profile')}>
          <form onSubmit={save} noValidate>
            <div className="grid g2">
              <Field
                label={t('auth.name')}
                value={v.full_name}
                onChange={(e) => setV({ ...v, full_name: e.target.value })}
                error={errors.full_name}
                autoComplete="name"
              />
              <Field
                label={t('account.phone')}
                type="tel"
                inputMode="tel"
                value={v.phone}
                onChange={(e) => setV({ ...v, phone: e.target.value })}
                error={errors.phone}
                placeholder="+7 7__ ___ __ __"
                autoComplete="tel"
              />
              <div className="f">
                <span className="flabel">{t('common.language')}</span>
                <LanguageSelect />
              </div>
            </div>
            <button className="btn pri mt" disabled={busy}>
              {t('common.save')}
            </button>
          </form>
        </Card>
        <Card title={t('account.data')}>
          <p className="muted">
            {me.consent_at
              ? t('account.consentGiven', { at: formatDateTime(me.consent_at, locale), v: me.consent_version ?? '' })
              : '—'}{' '}
            <Link to="/privacy">{t('auth.privacyLink')}</Link>
          </p>
          {canDelete ? (
            <div className="stack">
              <Alert tone="red" title={t('account.deleteTitle')}>
                {t('account.deleteText')}
              </Alert>
              <Field label={t('account.deleteConfirm')} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              <button
                className="btn danger"
                disabled={busy || confirm.trim().toLowerCase() !== (me.email ?? '').toLowerCase()}
                onClick={() =>
                  void run(async () => {
                    await rpc('delete_my_account')
                    await supabase.auth.signOut()
                  })
                }
              >
                {t('account.delete')}
              </button>
            </div>
          ) : (
            <p className="faint">{t('account.ownerDelete')}</p>
          )}
        </Card>
      </div>
    </div>
  )
}
