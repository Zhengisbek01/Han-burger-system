import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/shared/lib/supabase'
import { useI18n } from '@/shared/i18n'
import type { Locale, Profile } from '@/shared/types/domain'

interface AuthState {
  session: Session | null | undefined // undefined — ещё загружается
  profile: Profile | null | undefined
  profileError: string | null
  recovery: boolean
  endRecovery: () => void
  reloadProfile: () => Promise<void>
  setLocale: (l: Locale) => void
}
const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const i18n = useI18n()
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  const reloadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfileError(error?.message ?? (data ? null : 'profile_missing'))
    setProfile(data)
  }, [userId])

  useEffect(() => {
    setProfile(undefined)
    void reloadProfile()
  }, [reloadProfile])

  // язык из профиля имеет приоритет после входа
  const profileLocale = profile?.locale as Locale | undefined
  const { setLocale: setUiLocale } = i18n
  useEffect(() => {
    if (profileLocale) setUiLocale(profileLocale)
  }, [profileLocale, setUiLocale])

  const setLocale = useCallback(
    (l: Locale) => {
      setUiLocale(l)
      if (userId) void supabase.from('profiles').update({ locale: l }).eq('id', userId)
    },
    [setUiLocale, userId],
  )

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        profileError,
        recovery,
        endRecovery: () => setRecovery(false),
        reloadProfile,
        setLocale,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const c = useContext(AuthContext)
  if (!c) throw new Error('useAuth вне AuthProvider')
  return c
}

/** Для страниц внутри кабинета: профиль гарантированно загружен */
export function useProfile(): Profile {
  const { profile } = useAuth()
  if (!profile) throw new Error('Профиль не загружен')
  return profile
}
