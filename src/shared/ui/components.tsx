import { useEffect, useId, useRef, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { useI18n } from '@/shared/i18n'
import { ORDER_FLOW, type OrderStatus } from '@/shared/types/domain'

export function Card({
  title,
  sub,
  right,
  children,
  flush,
  className = '',
}: {
  title?: ReactNode
  sub?: ReactNode
  right?: ReactNode
  children?: ReactNode
  flush?: boolean
  className?: string
}) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <header className="card-h">
          <div>
            {title && <h2>{title}</h2>}
            {sub && <p>{sub}</p>}
          </div>
          {right}
        </header>
      )}
      {flush ? children : <div className="card-b">{children}</div>}
    </section>
  )
}

export function Kpi({
  label,
  value,
  sub,
  accent,
  tone,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: boolean
  tone?: 'up' | 'down'
}) {
  return (
    <div className={`card kpi${accent ? ' accent' : ''}`}>
      <div className="l">{label}</div>
      <div className="v num">{value}</div>
      {sub && <div className={`s ${tone ?? 'muted'}`}>{sub}</div>}
    </div>
  )
}

export function PageHead({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  )
}

const TONE: Record<OrderStatus, string> = {
  new: 'blue',
  confirmed: 'violet',
  assembling: 'amber',
  transit: 'amber',
  delivered: 'green',
  cancelled: 'gray',
}
export function StatusTag({ status }: { status: OrderStatus }) {
  const { t } = useI18n()
  return <span className={`tag ${TONE[status]}`}>{t(`status.${status}`)}</span>
}

export function Steps({ status }: { status: OrderStatus }) {
  const { t } = useI18n()
  if (status === 'cancelled') return <p className="muted">{t('status.cancelledNote')}</p>
  const idx = ORDER_FLOW.indexOf(status)
  return (
    <ol className="steps" aria-label={t('status.progress')}>
      {ORDER_FLOW.map((k, i) => {
        const cls = i < idx || (i === idx && k === 'delivered') ? 'done' : i === idx ? 'cur' : ''
        return (
          <li key={k} className={`step ${cls}`} aria-current={i === idx ? 'step' : undefined}>
            {t(`status.${k}`)}
          </li>
        )
      })}
    </ol>
  )
}

/** Столбчатая диаграмма с текстовой альтернативой для скринридеров */
export function BarChart({
  data,
  labels,
  height = 140,
  format,
  title,
}: {
  data: number[]
  labels: string[]
  height?: number
  format: (n: number) => string
  title: string
}) {
  const max = Math.max(1, ...data) * 1.08
  return (
    <figure className="chart" aria-label={title}>
      <div className="bars-v" style={{ height: height + 20 }} aria-hidden="true">
        {data.map((v, i) => (
          <div key={i} className="bar-col" title={`${labels[i]}: ${format(v)}`}>
            <div className={`bar-v${i === data.length - 1 ? ' last' : ''}`} style={{ height: (v / max) * height }} />
            <span>{labels[i]}</span>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((v, i) => (
            <tr key={i}>
              <th scope="row">{labels[i]}</th>
              <td>{format(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not(.modal-x)')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [onClose])
  return (
    <div className="modal-bg" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className={`card modal${wide ? ' wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="card-h">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="btn ghost sm modal-x" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </header>
        <div className="card-b">{children}</div>
      </div>
    </div>
  )
}

type FieldProps = { label: string; error?: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>
export function Field({ label, error, hint, id, className = '', ...rest }: FieldProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className={`f ${className}`}>
      <label htmlFor={fid}>{label}</label>
      <input
        id={fid}
        className="inp"
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${fid}-d` : undefined}
        {...rest}
      />
      {(error || hint) && (
        <span id={`${fid}-d`} className={error ? 'err' : 'faint'}>
          {error ?? hint}
        </span>
      )}
    </div>
  )
}

type SelectProps = { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>
export function SelectField({ label, children, id, ...rest }: SelectProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className="f">
      <label htmlFor={fid}>{label}</label>
      <select id={fid} className="inp" {...rest}>
        {children}
      </select>
    </div>
  )
}

export function Loading() {
  const { t } = useI18n()
  return (
    <div className="page">
      <div className="card empty" aria-busy="true">
        {t('common.loading')}
      </div>
    </div>
  )
}

export function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="page">
      <div className="alert red" role="alert">
        <span className="i" aria-hidden="true">
          ⛔
        </span>
        <div>
          <b>{t('errors.loadFailed')}</b>
          <span>{text}</span>
          {onRetry && (
            <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={onRetry}>
              {t('common.retry')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export const Empty = ({ children }: { children: ReactNode }) => <div className="empty">{children}</div>

export function Alert({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'red' | 'amber' | 'blue' | 'green'
  icon?: string
  title: ReactNode
  children?: ReactNode
}) {
  return (
    <div className={`alert ${tone}`}>
      {icon && (
        <span className="i" aria-hidden="true">
          {icon}
        </span>
      )}
      <div>
        <b>{title}</b>
        {children && <span>{children}</span>}
      </div>
    </div>
  )
}

/** Числовое поле для таблиц: только цифры, крупная цель на телефоне */
export function QtyInput({
  value,
  onChange,
  label,
  highlight,
  decimal,
}: {
  value: number | string
  onChange: (v: number) => void
  label: string
  highlight?: boolean
  decimal?: boolean
}) {
  return (
    <input
      className={`inp qty num${highlight ? ' edited' : ''}`}
      inputMode={decimal ? 'decimal' : 'numeric'}
      aria-label={label}
      value={value}
      onChange={(e) => {
        const raw = e.target.value.replace(decimal ? /[^\d.]/g : /\D/g, '')
        onChange(raw === '' ? 0 : Number(raw))
      }}
      onFocus={(e) => e.target.select()}
    />
  )
}
