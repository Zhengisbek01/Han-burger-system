import { ORDER_STATUS, STATUS_FLOW } from './data.js'

export const Kpi = ({ l, v, s, accent, tone }) => (
  <div className={'card kpi' + (accent ? ' accent' : '')}>
    <div className="l">{l}</div>
    <div className="v num">{v}</div>
    {s && <div className={'s ' + (tone || 'muted')}>{s}</div>}
  </div>
)

export const Card = ({ title, sub, right, children, pad = true, style }) => (
  <div className="card" style={style}>
    {(title || right) && (
      <div className="card-h">
        <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
        {right}
      </div>
    )}
    {pad ? <div className="card-b">{children}</div> : children}
  </div>
)

export const Head = ({ title, sub, right }) => (
  <div className="head">
    <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
    {right && <div className="row">{right}</div>}
  </div>
)

export const Status = ({ s }) => <span className={'tag ' + ORDER_STATUS[s].tone}>{ORDER_STATUS[s].label}</span>

export const Steps = ({ status }) => {
  const idx = STATUS_FLOW.indexOf(status)
  return (
    <div className="steps">
      {STATUS_FLOW.map((k, i) => (
        <div key={k} className={'step ' + (i < idx ? 'done' : i === idx ? (k === 'delivered' ? 'done' : 'cur') : '')}>
          {ORDER_STATUS[k].label}
        </div>
      ))}
    </div>
  )
}

export function Spark({ data, h = 140, labels }) {
  const max = Math.max(...data) * 1.08
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: h + 20 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <div title={`${labels?.[i]}: ${Math.round(v).toLocaleString('ru-RU')} ₸`}
            style={{ width: '70%', height: (v / max) * h, borderRadius: 4, background: i === data.length - 1 ? 'var(--brand)' : '#ecc8b2' }} />
          {labels && <div style={{ fontSize: 10.5, color: 'var(--faint)', whiteSpace: 'nowrap' }}>{labels[i]}</div>}
        </div>
      ))}
    </div>
  )
}

export const Toast = ({ msg }) => (msg ? <div className="toast">{msg}</div> : null)
