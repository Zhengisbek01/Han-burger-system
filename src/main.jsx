import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useDemo } from './shared.js'
import V1 from './v1/V1.jsx'
import V2 from './v2/V2.jsx'
import V3 from './v3/V3.jsx'
import V4 from './v4/V4.jsx'
import V5 from './v5/V5.jsx'
import V6 from './v6/V6.jsx'
import './shell.css'

export const VARIANTS = [
  { C: V1, name: 'Классика', note: 'Светлый, нижние вкладки, карточки. Привычно как в банковских приложениях.' },
  { C: V2, name: 'Тёмный цех', note: 'Тёмная тема, крупные цифры и кнопки. Для кухни, перчаток и яркого света.' },
  { C: V3, name: 'Бренд HAN', note: 'Яркий фирменный стиль, большая центральная кнопка «Заявка».' },
  { C: V4, name: 'Задачи дня', note: 'Главный экран = список дел на сегодня. Без вкладок, всё через задачи.' },
  { C: V5, name: 'Таблица', note: 'Плотная таблица как в Excel, меню-бургер. Максимум данных на экране.' },
  { C: V6, name: 'Чат-бот', note: 'Диалог как в Telegram: бот спрашивает, сотрудник жмёт кнопки.' },
]

const q = new URLSearchParams(location.search)
const shot = q.has('shot')

function App() {
  const [v, setV] = useState(Math.min(5, Math.max(0, (+q.get('v') || 1) - 1)))
  const [role, setRoleRaw] = useState(q.get('role') === 'producer' ? 'producer' : 'store')
  const [screen, setScreen] = useState(q.get('screen') || (role === 'store' ? 'stock' : 'plan'))
  const setRole = (r) => { setRoleRaw(r); setScreen(r === 'store' ? 'stock' : 'plan') }
  const d = useDemo()
  const { C } = VARIANTS[v]
  const phone = <C key={v} d={d} role={role} setRole={setRole} screen={screen} setScreen={setScreen} />

  if (shot) return <div className="shot">{phone}</div>
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Qoima <span>мобильная версия</span></div>
        <p className="lead">6 вариантов дизайна на демо-данных HAN Burger. Кликайте внутри телефона: вносите продажи, собирайте заявку, смотрите план отгрузки.</p>
        {VARIANTS.map((x, i) => (
          <button key={i} className={'vbtn' + (i === v ? ' on' : '')} onClick={() => setV(i)}>
            <b>{i + 1}. {x.name}</b><small>{x.note}</small>
          </button>
        ))}
        <div className="roles">
          <button className={role === 'store' ? 'on' : ''} onClick={() => setRole('store')}>Магазин</button>
          <button className={role === 'producer' ? 'on' : ''} onClick={() => setRole('producer')}>Производитель</button>
        </div>
      </aside>
      <div className="stage">
        <div className="mpick">
          {VARIANTS.map((x, i) => <button key={i} className={i === v ? 'on' : ''} onClick={() => setV(i)}>{i + 1}</button>)}
        </div>
        <div className="frame">{phone}</div>
      </div>
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
