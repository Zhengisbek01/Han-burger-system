import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useI18n, translateError } from '@/shared/i18n'
import { fieldErrors } from '@/shared/lib/validation'
import { Field, Alert } from '@/shared/ui/components'
import { LanguageSelect } from '@/app/Layout'
import { useAuth } from '@/app/auth'
import { CONSENT_VERSION, loginSchema, passwordSchema, resetSchema, signupSchema } from './schemas'

export function AuthShell({ children, title }: { children: ReactNode; title: string }) {
  const { t } = useI18n()
  return (
    <div className="auth">
      <main className="card card-b stack auth-card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="logo dark">
            <div className="logo-mark" aria-hidden="true">
              Q
            </div>
            <div>
              Qoima<small>{t('app.tagline')}</small>
            </div>
          </div>
          <LanguageSelect compact />
        </div>
        <h1 className="auth-title">{title}</h1>
        {children}
      </main>
    </div>
  )
}

function useForm<T extends Record<string, unknown>>(init: T) {
  const [v, setV] = useState(init)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof T>(k: K, val: T[K]) => setV((x) => ({ ...x, [k]: val }))
  return { v, set, errors, setErrors, msg, setMsg, busy, setBusy }
}

export function LoginPage() {
  const { t } = useI18n()
  const f = useForm({ email: '', password: '' })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const r = loginSchema.safeParse(f.v)
    if (!r.success) return f.setErrors(fieldErrors(r.error, t))
    f.setErrors({})
    f.setBusy(true)
    const { error } = await supabase.auth.signInWithPassword(r.data)
    f.setBusy(false)
    if (error) f.setMsg({ ok: false, text: translateError(t, error.message) })
  }
  return (
    <AuthShell title={t('auth.login')}>
      <form className="stack" onSubmit={submit} noValidate>
        <Field
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          value={f.v.email}
          onChange={(e) => f.set('email', e.target.value)}
          error={f.errors.email}
        />
        <Field
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          value={f.v.password}
          onChange={(e) => f.set('password', e.target.value)}
          error={f.errors.password}
        />
        {f.msg && <Alert tone={f.msg.ok ? 'green' : 'red'} title={f.msg.text} />}
        <button className="btn pri block" disabled={f.busy}>
          {t('auth.loginBtn')}
        </button>
      </form>
      <div className="row between">
        <Link to="/reset">{t('auth.forgot')}</Link>
        <Link to="/signup">{t('auth.toSignup')}</Link>
      </div>
    </AuthShell>
  )
}

export function SignupPage() {
  const { t, locale } = useI18n()
  const f = useForm({ name: '', email: '', password: '', consent: false })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const r = signupSchema.safeParse(f.v)
    if (!r.success) return f.setErrors(fieldErrors(r.error, t))
    f.setErrors({})
    f.setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: r.data.email,
      password: r.data.password,
      options: {
        data: { full_name: r.data.name, consent_version: CONSENT_VERSION, locale },
        emailRedirectTo: window.location.origin,
      },
    })
    f.setBusy(false)
    if (error) f.setMsg({ ok: false, text: translateError(t, error.message) })
    else if (!data.session) f.setMsg({ ok: true, text: t('auth.checkEmail', { email: r.data.email }) })
  }
  return (
    <AuthShell title={t('auth.signup')}>
      <form className="stack" onSubmit={submit} noValidate>
        <Field
          label={t('auth.name')}
          autoComplete="name"
          value={f.v.name}
          onChange={(e) => f.set('name', e.target.value)}
          error={f.errors.name}
        />
        <Field
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          value={f.v.email}
          onChange={(e) => f.set('email', e.target.value)}
          error={f.errors.email}
          hint={t('auth.inviteHint')}
        />
        <Field
          label={t('auth.password')}
          type="password"
          autoComplete="new-password"
          value={f.v.password}
          onChange={(e) => f.set('password', e.target.value)}
          error={f.errors.password}
          hint={t('v.password')}
        />
        <div className="f">
          <label className="check">
            <input
              type="checkbox"
              checked={f.v.consent}
              onChange={(e) => f.set('consent', e.target.checked)}
              aria-invalid={Boolean(f.errors.consent)}
              aria-describedby="consent-err"
            />
            <span>
              {t('auth.consent')}{' '}
              <Link to="/privacy" target="_blank">
                {t('auth.privacyLink')}
              </Link>
            </span>
          </label>
          {f.errors.consent && (
            <span id="consent-err" className="err">
              {f.errors.consent}
            </span>
          )}
        </div>
        {f.msg && <Alert tone={f.msg.ok ? 'green' : 'red'} title={f.msg.text} />}
        <button className="btn pri block" disabled={f.busy}>
          {t('auth.signupBtn')}
        </button>
      </form>
      <Link to="/login">{t('auth.toLogin')}</Link>
    </AuthShell>
  )
}

export function ResetPage() {
  const { t } = useI18n()
  const f = useForm({ email: '' })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const r = resetSchema.safeParse(f.v)
    if (!r.success) return f.setErrors(fieldErrors(r.error, t))
    f.setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(r.data.email, { redirectTo: window.location.origin })
    f.setBusy(false)
    f.setMsg(error ? { ok: false, text: translateError(t, error.message) } : { ok: true, text: t('auth.resetSent') })
  }
  return (
    <AuthShell title={t('auth.reset')}>
      <form className="stack" onSubmit={submit} noValidate>
        <Field
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          value={f.v.email}
          onChange={(e) => f.set('email', e.target.value)}
          error={f.errors.email}
        />
        {f.msg && <Alert tone={f.msg.ok ? 'green' : 'red'} title={f.msg.text} />}
        <button className="btn pri block" disabled={f.busy}>
          {t('auth.resetBtn')}
        </button>
      </form>
      <Link to="/login">{t('auth.toLogin')}</Link>
    </AuthShell>
  )
}

export function NewPasswordPage() {
  const { t } = useI18n()
  const { endRecovery } = useAuth()
  const f = useForm({ password: '' })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const r = passwordSchema.safeParse(f.v)
    if (!r.success) return f.setErrors(fieldErrors(r.error, t))
    f.setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: r.data.password })
    f.setBusy(false)
    if (error) f.setMsg({ ok: false, text: translateError(t, error.message) })
    else endRecovery()
  }
  return (
    <AuthShell title={t('auth.newPassword')}>
      <form className="stack" onSubmit={submit} noValidate>
        <Field
          label={t('auth.password')}
          type="password"
          autoComplete="new-password"
          value={f.v.password}
          onChange={(e) => f.set('password', e.target.value)}
          error={f.errors.password}
        />
        {f.msg && <Alert tone="red" title={f.msg.text} />}
        <button className="btn pri block" disabled={f.busy}>
          {t('common.save')}
        </button>
      </form>
    </AuthShell>
  )
}
