import { useState } from 'react'
import { plans, tenants } from './data.js'
import { fmt, kzt, sum } from './logic.js'
import { Kpi, Card, Head } from './ui.jsx'

const planOf = (id) => plans.find((p) => p.id === id)
const ST = { active: ['активна', 'green'], trial: ['пробный период', 'blue'], overdue: ['просрочена оплата', 'red'] }

export function AdminHome({ go }) {
  const paying = tenants.filter((t) => t.status === 'active')
  const mrr = sum(paying.map((t) => planOf(t.plan).price))
  return (
    <div className="page">
      <Head title="Платформа Qoima" sub="Все подключённые компании и состояние сервиса" right={<button className="btn pri" onClick={() => go('a-new')}>+ Подключить клиента</button>} />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kpi accent l="MRR" v={kzt(mrr)} s={`ARR ≈ ${fmt(mrr * 12 / 1e6)} млн ₸`} />
        <Kpi l="Компаний" v={tenants.length} s={`${paying.length} платят · ${tenants.filter((t) => t.status === 'trial').length} на пробном`} />
        <Kpi l="Магазинов на платформе" v={sum(tenants.map((t) => t.stores))} />
        <Kpi l="Пользователей" v={sum(tenants.map((t) => t.users))} />
      </div>
      <Card title="Компании" pad={false}><div className="tw"><table>
        <thead><tr><th>Компания</th><th>Город</th><th>Тариф</th><th className="r">Магазины</th><th className="r">Польз.</th><th>Оплачено до</th><th className="r">Активность</th><th>Статус</th></tr></thead>
        <tbody>{tenants.map((t) => <tr key={t.name}><td><b>{t.name}</b><div className="faint" style={{ fontSize: 12 }}>с {t.since}</div></td><td className="muted">{t.city}</td>
          <td>{planOf(t.plan).name}<div className="faint num" style={{ fontSize: 12 }}>{kzt(planOf(t.plan).price)}/мес</div></td>
          <td className="r num">{t.stores}</td><td className="r num">{t.users}</td><td className="num">{t.paidTill}</td>
          <td className="r"><div className="bar" style={{ width: 70, display: 'inline-block', verticalAlign: 'middle' }}><i style={{ width: t.activity + '%', background: t.activity < 40 ? 'var(--red)' : 'var(--green)' }} /></div> <span className="num">{t.activity}%</span></td>
          <td><span className={'tag ' + ST[t.status][1]}>{ST[t.status][0]}</span></td></tr>)}</tbody>
      </table></div></Card>
    </div>
  )
}

export function AdminPlans({ toast }) {
  return (
    <div className="page">
      <Head title="Тарифы и подписки" sub="Предварительная модель, цены в тенге за месяц. Нужно проверить на рынке." />
      <div className="grid g3" style={{ marginBottom: 16 }}>{plans.map((p) => {
        const n = tenants.filter((t) => t.plan === p.id).length
        return (
          <div key={p.id} className={'card plan-card' + (p.id === 'biz' ? ' hl' : '')}>
            <div className="row" style={{ justifyContent: 'space-between' }}><h2>{p.name}</h2>{p.id === 'biz' && <span className="tag amber">основной</span>}</div>
            <div className="price num">{kzt(p.price)}<span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> / мес</span></div>
            <div className="muted">{p.stores} · {p.users}</div>
            <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}><span className="faint">{n} компаний</span><button className="btn sm" onClick={() => toast('Редактор тарифа (демо)')}>Изменить</button></div>
          </div>)
      })}</div>
      <Card title="Ближайшие продления и проблемы">
        {tenants.filter((t) => t.status !== 'active').map((t) => (
          <div key={t.name} className={'alert ' + (t.status === 'overdue' ? 'red' : 'blue')}><div className="i">{t.status === 'overdue' ? '💳' : '⏳'}</div><div>
            <b>{t.name}: {t.status === 'overdue' ? 'оплата просрочена' : 'пробный период'} до {t.paidTill}</b>
            <span>{t.status === 'overdue' ? 'Доступ ограничится через 3 дня. Отправить счёт повторно?' : 'Позвонить и предложить тариф «' + planOf(t.plan).name + '»'}</span></div></div>))}
      </Card>
    </div>
  )
}

export function AdminHealth() {
  const svc = [['API', '99,98%', 'green'], ['Веб-приложение', '100%', 'green'], ['Уведомления WhatsApp', '99,4%', 'green'], ['Интеграция 1С', 'деградация', 'amber'], ['Резервные копии', 'сегодня 03:00', 'green']]
  const events = [['22:31', 'Moloko Qazaq: 9 магазинов закрыли смену'], ['21:58', 'Таза Ет: добавлен магазин «Шымкент-1»'], ['20:40', 'HAN Burger: сформировано производственное задание'], ['19:12', 'Интеграция 1С: задержка синхронизации 4 мин'], ['18:05', 'Самса Хаус: начат пробный период']]
  return (
    <div className="page">
      <Head title="Состояние платформы" sub="Мониторинг сервисов и событий" />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kpi l="Аптайм 30 дней" v="99,96%" tone="up" s="SLA 99,5%" />
        <Kpi l="Отчётов смен сегодня" v="38" />
        <Kpi l="Заявок сегодня" v="61" />
        <Kpi l="Обращений в поддержку" v="3" s="1 открыто" />
      </div>
      <div className="grid g2">
        <Card title="Сервисы">{svc.map(([n, v, t]) => <div key={n} className="row" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}><span>{n}</span><span className={'tag ' + t}>{v}</span></div>)}</Card>
        <Card title="Лента событий">{events.map(([t, e]) => <div key={t} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', flexWrap: 'nowrap', alignItems: 'flex-start' }}><span className="faint num" style={{ width: 44, flex: 'none' }}>{t}</span><span>{e}</span></div>)}</Card>
      </div>
    </div>
  )
}

export function AdminNew({ toast, go }) {
  const [step, setStep] = useState(0)
  const [plan, setPlan] = useState('biz')
  const steps = ['Компания', 'Тариф', 'Владелец', 'Готово']
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <Head title="Подключить клиента" sub="Новый производитель получит свой кабинет и логины для магазинов" />
      <div className="steps" style={{ marginBottom: 20 }}>{steps.map((s, i) => <div key={s} className={'step ' + (i < step ? 'done' : i === step ? 'cur' : '')}>{s}</div>)}</div>
      <Card>
        {step === 0 && <div className="grid g2">
          <label className="f">Название компании<input className="inp" placeholder="ТОО «…»" /></label>
          <label className="f">БИН<input className="inp" placeholder="12 цифр" /></label>
          <label className="f">Город<select className="inp"><option>Астана</option><option>Алматы</option><option>Шымкент</option><option>Караганда</option></select></label>
          <label className="f">Сфера<select className="inp"><option>Фастфуд</option><option>Пекарня</option><option>Молочная продукция</option><option>Мясная продукция</option></select></label>
        </div>}
        {step === 1 && <div className="grid g3">{plans.map((p) => (
          <button key={p.id} className={'card plan-card' + (plan === p.id ? ' hl' : '')} style={{ textAlign: 'left' }} onClick={() => setPlan(p.id)}>
            <h2>{p.name}</h2><div className="num" style={{ fontWeight: 700 }}>{kzt(p.price)}</div><div className="muted" style={{ fontSize: 12 }}>{p.stores}</div></button>))}
          <label className="f" style={{ gridColumn: '1/-1' }}><span><input type="checkbox" defaultChecked /> 14 дней бесплатно</span></label>
        </div>}
        {step === 2 && <div className="grid g2">
          <label className="f">ФИО владельца<input className="inp" /></label>
          <label className="f">Телефон (WhatsApp)<input className="inp" placeholder="+7 7__ ___ __ __" /></label>
          <label className="f">Email<input className="inp" /></label>
          <label className="f">Язык интерфейса<select className="inp"><option>Русский</option><option>Қазақша</option><option>English</option></select></label>
        </div>}
        {step === 3 && <div className="empty"><div style={{ fontSize: 34 }}>✅</div><h2 style={{ marginTop: 8 }}>Кабинет создан</h2><p>Приглашение отправлено владельцу. Тариф «{planOf(plan).name}», пробный период 14 дней.</p></div>}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
          {step > 0 && step < 3 && <button className="btn" onClick={() => setStep(step - 1)}>Назад</button>}
          {step < 3 ? <button className="btn pri" onClick={() => setStep(step + 1)}>{step === 2 ? 'Создать кабинет' : 'Далее'}</button>
            : <button className="btn pri" onClick={() => { toast('Клиент добавлен'); go('a-home') }}>К списку компаний</button>}
        </div>
      </Card>
    </div>
  )
}
