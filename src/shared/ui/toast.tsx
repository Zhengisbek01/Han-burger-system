import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Tone = 'ok' | 'error' | 'info'
const Ctx = createContext<(msg: string, tone?: Tone) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; tone: Tone } | null>(null)
  const timer = useRef<number>()
  const show = useCallback((text: string, tone: Tone = 'info') => {
    setMsg({ text, tone })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), tone === 'error' ? 6000 : 3500)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {msg && (
          <div className={`toast toast-${msg.tone}`} role={msg.tone === 'error' ? 'alert' : undefined}>
            {msg.text}
          </div>
        )}
      </div>
    </Ctx.Provider>
  )
}
export const useToast = () => useContext(Ctx)
