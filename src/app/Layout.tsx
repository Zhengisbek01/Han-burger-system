import { NavLink, Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useI18n, LOCALES, type TKey } from '@/shared/i18n'
import { useAuth } from './auth'
import type { Locale } from '@/shared/types/domain'

export interface NavItem {
  to: string
  icon: string
  label: TKey
  badge?: number
  end?: boolean
}
export interface NavSection {
  title: TKey
  items: NavItem[]
}

export function LanguageSelect({ compact }: { compact?: boolean }) {
  const { locale, t } = useI18n()
  const { setLocale } = useAuth()
  return (
    <select
      className={`inp lang${compact ? ' compact' : ''}`}
      aria-label={t('common.language')}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
    >
      {LOCALES.map((l) => (
        <option key={l.id} value={l.id}>
          {l.label}
        </option>
      ))}
    </select>
  )
}

export function Layout({
  sections,
  subtitle,
  children,
}: {
  sections: NavSection[]
  subtitle: string
  children: ReactNode
}) {
  const { t } = useI18n()
  const { profile } = useAuth()
  return (
    <div className="app">
      <a className="skip" href="#main">
        {t('common.skip')}
      </a>
      <aside className="side">
        <div className="logo">
          <div className="logo-mark" aria-hidden="true">
            Q
          </div>
          <div>
            Qoima<small>{subtitle}</small>
          </div>
        </div>
        <nav aria-label={t('common.menu')}>
          {sections.map((sec) => (
            <div key={sec.title} className="nav-sec">
              <div className="side-sec">{t(sec.title)}</div>
              {sec.items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `nav${isActive ? ' on' : ''}`}>
                  <span className="ico" aria-hidden="true">
                    {i.icon}
                  </span>
                  {t(i.label)}
                  {!!i.badge && (
                    <span className="badge" aria-label={t('common.newCount', { n: i.badge })}>
                      {i.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          {profile?.full_name || profile?.email}
          <br />
          {profile?.role && t(`roles.${profile.role as 'owner'}`)}
        </div>
      </aside>
      <div className="main">
        <header className="top">
          <Link to="/account" className="user-chip">
            {profile?.email}
          </Link>
          <div className="spacer" />
          <LanguageSelect compact />
          <button type="button" className="btn sm" onClick={() => void supabase.auth.signOut()}>
            {t('common.logout')}
          </button>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}
