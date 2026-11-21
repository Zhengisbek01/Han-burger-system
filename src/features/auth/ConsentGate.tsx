import { useState } from 'react'
import { Link } from 'react-router-dom'
import { rpc, supabase } from '@/shared/lib/supabase'
import { useI18n } from '@/shared/i18n'
import { useAuth } from '@/app/auth'
import { useAction } from '@/shared/hooks/useAction'
import { AuthShell } from './AuthPages'
import { CONSENT_VERSION } from './schemas'

/** Для пользователей без зафиксированного согласия на обработку персональных данных */
export function ConsentGate() {
  const { t } = useI18n()
  const { reloadProfile } = useAuth()
  const [ok, setOk] = useState(false)
  const [run, busy] = useAction()
  return (
    <AuthShell title={t('consent.title')}>
      <p className="muted">{t('consent.text')}</p>
      <label className="check">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>
          {t('auth.consent')}{' '}
          <Link to="/privacy" target="_blank">
            {t('auth.privacyLink')}
          </Link>
        </span>
      </label>
      <button
        className="btn pri block"
        disabled={!ok || busy}
        onClick={() =>
          void run(async () => {
            await rpc('give_consent', { p_version: CONSENT_VERSION })
            await reloadProfile()
          })
        }
      >
        {t('common.continue')}
      </button>
      <button type="button" className="link" onClick={() => void supabase.auth.signOut()}>
        {t('common.logout')}
      </button>
    </AuthShell>
  )
}
