import { useI18n } from '@/shared/i18n'

export function NotConfigured() {
  const { t } = useI18n()
  return (
    <div className="auth">
      <div className="card card-b stack" style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: 18 }}>{t('setup.title')}</h1>
        <p className="muted">{t('setup.text')}</p>
        <pre className="code">VITE_SUPABASE_URL=https://xxxx.supabase.co{'\n'}VITE_SUPABASE_ANON_KEY=…</pre>
      </div>
    </div>
  )
}
