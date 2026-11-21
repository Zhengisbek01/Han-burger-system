import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import { useI18n } from '@/shared/i18n'
import { ErrorState, Loading } from '@/shared/ui/components'
import { LoginPage, SignupPage, ResetPage, NewPasswordPage } from '@/features/auth/AuthPages'
import { OnboardingPage } from '@/features/auth/OnboardingPage'
import { ConsentGate } from '@/features/auth/ConsentGate'
import { PrivacyPage } from '@/features/legal/PrivacyPage'

// Кабинеты грузим по требованию: магазину не нужен код суперадмина и наоборот
const CompanyApp = lazy(() => import('@/features/company/CompanyApp').then((m) => ({ default: m.CompanyApp })))
const AdminApp = lazy(() => import('@/features/admin/AdminApp').then((m) => ({ default: m.AdminApp })))

function Private() {
  const { session, profile, profileError, recovery } = useAuth()
  const { t } = useI18n()
  if (session === undefined) return <Loading />
  if (!session) return <Navigate to="/login" replace />
  if (recovery) return <NewPasswordPage />
  if (profile === undefined) return <Loading />
  if (!profile)
    return <ErrorState text={profileError === 'profile_missing' ? t('errors.profileMissing') : (profileError ?? '')} />
  if (!profile.active) return <ErrorState text={t('errors.disabled')} />
  if (!profile.consent_at) return <ConsentGate />
  if (!profile.company_id && profile.role !== 'superadmin') return <OnboardingPage />
  return (
    <Suspense fallback={<Loading />}>
      {profile.role === 'superadmin' ? <AdminApp /> : <CompanyApp key={profile.company_id} profile={profile} />}
    </Suspense>
  )
}

export function App() {
  const { session } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={session ? <Navigate to="/" replace /> : <SignupPage />} />
      <Route path="/reset" element={<ResetPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/*" element={<Private />} />
    </Routes>
  )
}
