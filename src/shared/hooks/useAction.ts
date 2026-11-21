import { useCallback, useRef, useState } from 'react'
import { useI18n, translateError } from '@/shared/i18n'
import { useToast } from '@/shared/ui/toast'

/** Выполняет асинхронное действие: блокирует повторный запуск, показывает ошибку или успех */
export function useAction() {
  const { t } = useI18n()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const run = useCallback(
    async <R>(fn: () => Promise<R>, ok?: string | ((r: R) => string)): Promise<R | undefined> => {
      if (lock.current) return undefined
      lock.current = true
      setBusy(true)
      try {
        const r = await fn()
        if (ok) toast(typeof ok === 'function' ? ok(r) : ok, 'ok')
        return r
      } catch (e) {
        toast(translateError(t, e instanceof Error ? e.message : String(e)), 'error')
        return undefined
      } finally {
        lock.current = false
        setBusy(false)
      }
    },
    [t, toast],
  )
  return [run, busy] as const
}
