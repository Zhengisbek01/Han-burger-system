import { Link } from 'react-router-dom'
import { useI18n } from '@/shared/i18n'
import { CONSENT_VERSION } from '@/features/auth/schemas'

/** Политика обработки персональных данных. Шаблон: юрист должен проверить и дополнить реквизиты оператора. */
export function PrivacyPage() {
  const { t } = useI18n()
  const sections = ['who', 'what', 'why', 'where', 'who2', 'rights', 'keep'] as const
  return (
    <div className="auth">
      <main className="card card-b legal">
        <p>
          <Link to="/">← Qoima</Link>
        </p>
        <h1>{t('privacy.title')}</h1>
        <p className="faint">{t('privacy.version', { v: CONSENT_VERSION })}</p>
        {sections.map((s) => (
          <section key={s}>
            <h2>{t(`privacy.${s}.h`)}</h2>
            <p>{t(`privacy.${s}.p`)}</p>
          </section>
        ))}
        <p className="faint small">{t('privacy.note')}</p>
      </main>
    </div>
  )
}
