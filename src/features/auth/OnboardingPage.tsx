import { useState, type FormEvent } from 'react'
import { rpc, supabase } from '@/shared/lib/supabase'
import { useI18n, translateError } from '@/shared/i18n'
import { fieldErrors } from '@/shared/lib/validation'
import { Field, Alert } from '@/shared/ui/components'
import { useAuth, useProfile } from '@/app/auth'
import { AuthShell } from './AuthPages'
import { companySchema } from './schemas'

export function OnboardingPage() {
  const { t } = useI18n()
  const profile = useProfile()
  const { reloadProfile } = useAuth()
  const [v, setV] = useState({ name: '', bin: '', city: 'Астана' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const r = companySchema.safeParse(v)
    if (!r.success) return setErrors(fieldErrors(r.error, t))
    setErrors({})
    setBusy(true)
    try {
      await rpc('create_company', { p_name: r.data.name, p_bin: r.data.bin ?? undefined, p_city: r.data.city })
      await reloadProfile()
    } catch (x) {
      setErr(translateError(t, x instanceof Error ? x.message : String(x)))
    } finally {
      setBusy(false)
    }
  }
  return (
    <AuthShell title={t('onboarding.title')}>
      <p className="muted">{t('onboarding.text')}</p>
      <form className="stack" onSubmit={submit} noValidate>
        <Field
          label={t('company.name')}
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
          error={errors.name}
          placeholder="HAN Burger"
        />
        <Field
          label={t('company.binOptional')}
          inputMode="numeric"
          maxLength={12}
          value={v.bin}
          onChange={(e) => setV({ ...v, bin: e.target.value.replace(/\D/g, '') })}
          error={errors.bin}
        />
        <Field
          label={t('company.city')}
          value={v.city}
          onChange={(e) => setV({ ...v, city: e.target.value })}
          error={errors.city}
        />
        {err && <Alert tone="red" title={err} />}
        <button className="btn pri block" disabled={busy}>
          {t('onboarding.create')}
        </button>
      </form>
      <Alert tone="blue" title={t('onboarding.employeeTitle')}>
        {t('onboarding.employeeText', { email: profile.email ?? '' })}
      </Alert>
      <div className="row between">
        <button type="button" className="link" onClick={() => void reloadProfile()}>
          {t('common.refresh')}
        </button>
        <button type="button" className="link" onClick={() => void supabase.auth.signOut()}>
          {t('common.logout')}
        </button>
      </div>
    </AuthShell>
  )
}
