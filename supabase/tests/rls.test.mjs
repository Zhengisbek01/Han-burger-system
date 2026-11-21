import { PGlite } from '@electric-sql/pglite'
import fs from 'fs'
const dir = process.argv[2]
const db = new PGlite()
const ex = (q) => db.exec(q)
await ex(`
create role anon; create role authenticated;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;
`)
for (const f of fs.readdirSync(dir).sort()) {
  try {
    await ex(fs.readFileSync(dir + '/' + f, 'utf8'))
    console.log('applied', f)
  } catch (e) {
    console.log('FAIL', f, e.message, e.where)
    process.exit(1)
  }
}
await ex(`grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated; grant all on all sequences in schema public to authenticated;`)

const ids = {}
let n = 0
const user = async (email, meta = {}) => {
  const id = `00000000-0000-0000-0000-${String(++n).padStart(12, '0')}`
  await ex(
    `reset role; insert into auth.users (id, email, raw_user_meta_data) values ('${id}', '${email}', '${JSON.stringify(meta)}')`,
  )
  ids[email] = id
  return id
}
const as = async (email, q, params) => {
  await ex(
    `reset role; select set_config('request.jwt.claim.sub', '${ids[email] || ''}', false); set role authenticated;`,
  )
  const r = await db.query(q, params)
  await ex('reset role')
  return r.rows
}
let fails = 0
const ok = (cond, msg) => {
  console.log((cond ? '✓ ' : '✗ ') + msg)
  if (!cond) fails++
}
const throws = async (email, q, msg) => {
  try {
    await as(email, q)
    ok(false, msg + ' (не упало)')
  } catch (e) {
    await ex('reset role')
    ok(true, msg + ' → ' + e.message)
  }
}

// владелец 1 регистрируется и создаёт компанию, грузит демо
await user('owner@han.kz', { full_name: 'Женисбек' })
await as('owner@han.kz', `select create_company('HAN Burger', '210940012345', 'Астана')`)
const me = (await as('owner@han.kz', 'select * from profiles'))[0]
ok(me.role === 'owner' && me.company_id, 'create_company → owner')
await as('owner@han.kz', 'select load_demo_data()')
const st = await as('owner@han.kz', 'select * from stores order by name')
const pr = await as('owner@han.kz', 'select * from products order by sort')
ok(st.length === 5 && pr.length === 9, 'демо: 5 магазинов, 9 позиций')
ok((await as('owner@han.kz', 'select count(*)::int c from shift_items'))[0].c > 500, 'демо: история продаж')
await throws('owner@han.kz', `select load_demo_data()`, 'демо повторно запрещено')

// владелец 2 — чужая компания
await user('other@x.kz')
await as('other@x.kz', `select create_company('Самса Хаус')`)
ok((await as('other@x.kz', 'select * from stores')).length === 0, 'чужие магазины не видны')
ok((await as('other@x.kz', 'select * from shift_items')).length === 0, 'чужие продажи не видны')
ok((await as('other@x.kz', 'select * from companies')).length === 1, 'видна только своя компания')
await throws(
  'other@x.kz',
  `insert into products (company_id, name) values ('${me.company_id}', 'взлом')`,
  'нельзя писать в чужую компанию',
)
await throws('other@x.kz', `select close_shift('${st[0].id}', '[]')`, 'нельзя закрыть смену чужого магазина')
const upd = await as('other@x.kz', `update products set price = 1 where company_id = '${me.company_id}' returning id`)
ok(upd.length === 0, 'нельзя менять чужие цены')

// приглашение магазина
const shatyr = st.find((s) => s.name === 'Хан Шатыр')
const keruen = st.find((s) => s.name === 'Керуен')
await as('owner@han.kz', `select invite_employee('Shatyr@han.kz', 'Айгерим', 'store', '${shatyr.id}')`)
await user('shatyr@han.kz')
const sp = (await as('shatyr@han.kz', 'select * from profiles'))[0]
ok(sp.role === 'store' && sp.store_id === shatyr.id, 'приглашённый магазин привязан при регистрации')
ok((await as('shatyr@han.kz', 'select * from stores')).length === 1, 'магазин видит только себя')
ok((await as('shatyr@han.kz', 'select * from warehouse_stock')).length === 0, 'магазин не видит склад производителя')
ok(
  (await as('shatyr@han.kz', 'select distinct store_id from store_stock')).length === 1,
  'магазин видит только свои остатки',
)
await as('shatyr@han.kz', `update profiles set role = 'owner', store_id = null where id = auth.uid()`)
ok((await as('shatyr@han.kz', 'select role from profiles'))[0].role === 'store', 'сам себе роль не повысить')
await throws('shatyr@han.kz', `select close_shift('${keruen.id}', '[]')`, 'не может закрыть смену другого магазина')
const upk = await as('shatyr@han.kz', `update store_stock set qty = 999 where store_id = '${keruen.id}' returning *`)
ok(upk.length === 0, 'не может менять остатки другого магазина')

// смена
const p1 = pr[0]
const before = (
  await as('shatyr@han.kz', `select qty from store_stock where store_id = '${shatyr.id}' and product_id = '${p1.id}'`)
)[0].qty
await throws(
  'shatyr@han.kz',
  `select close_shift('${shatyr.id}', '[{"product_id":"${p1.id}","qty":3}]')`,
  'смена за сегодня уже закрыта (демо)',
)
await as(
  'shatyr@han.kz',
  `select close_shift('${shatyr.id}', '[{"product_id":"${p1.id}","qty":3}]', 'ok', current_date + 1)`,
)
const after = (
  await as('shatyr@han.kz', `select qty from store_stock where store_id = '${shatyr.id}' and product_id = '${p1.id}'`)
)[0].qty
ok(+after === Math.max(0, +before - 3), `смена списала остаток ${before} → ${after}`)

// заявка → доставка
const num = (
  await as('shatyr@han.kz', `select create_order('${shatyr.id}', '[{"product_id":"${p1.id}","qty":20}]', 'тест') n`)
)[0].n
const ord = (await as('owner@han.kz', `select * from orders where number = ${num}`))[0]
ok(ord && ord.status === 'new', 'производитель видит заявку магазина ' + num)
ok((await as('other@x.kz', `select * from orders`)).length === 0, 'чужая компания заявку не видит')
await throws('shatyr@han.kz', `select set_order_status('${ord.id}', 'confirmed')`, 'магазин не может подтверждать')
await throws('owner@han.kz', `select set_order_status('${ord.id}', 'transit')`, 'нельзя перепрыгнуть статус')
const wh0 = (await as('owner@han.kz', `select qty from warehouse_stock where product_id = '${p1.id}'`))[0].qty
for (const s of ['confirmed', 'assembling']) await as('owner@han.kz', `select set_order_status('${ord.id}', '${s}')`)
await as('owner@han.kz', `select set_order_status('${ord.id}', 'transit', 'Нурбол', '09:30')`)
const wh1 = (await as('owner@han.kz', `select qty from warehouse_stock where product_id = '${p1.id}'`))[0].qty
ok(+wh1 === Math.max(0, +wh0 - 20), `отправка списала склад ${wh0} → ${wh1}`)
const s0 = (
  await as('shatyr@han.kz', `select qty from store_stock where store_id = '${shatyr.id}' and product_id = '${p1.id}'`)
)[0].qty
await as('shatyr@han.kz', `select set_order_status('${ord.id}', 'delivered')`)
const s1 = (
  await as('shatyr@han.kz', `select qty from store_stock where store_id = '${shatyr.id}' and product_id = '${p1.id}'`)
)[0].qty
ok(+s1 === +s0 + 20, `магазин подтвердил получение, остаток ${s0} → ${s1}`)
ok(
  (await as('shatyr@han.kz', `select count(*)::int c from order_events where order_id = '${ord.id}'`))[0].c === 5,
  'история статусов 5 событий',
)

// производство
await as('owner@han.kz', `select add_production('[{"product_id":"${p1.id}","qty":100}]')`)
ok(
  +(await as('owner@han.kz', `select qty from warehouse_stock where product_id = '${p1.id}'`))[0].qty === +wh1 + 100,
  'выпуск добавил на склад',
)

// тарифы: владелец не может сменить тариф сам
await as('owner@han.kz', `update companies set plan_id = 'start', paid_till = '2099-01-01', name = 'HAN Burger KZ'`)
const c = (await as('owner@han.kz', 'select * from companies'))[0]
ok(c.plan_id === 'net' && c.name === 'HAN Burger KZ', 'владелец меняет название, но не тариф')

// суперадмин
await user('admin@qoima.kz')
await ex(
  `reset role; select set_config('request.jwt.claim.sub', '', false); update profiles set role = 'superadmin' where email = 'admin@qoima.kz'`,
)
ok((await as('admin@qoima.kz', 'select * from companies')).length === 2, 'суперадмин видит все компании')
await as('admin@qoima.kz', `select admin_create_company('Таза Ет', null, 'Астана', 'start', 'boss@tazaet.kz', 'Ерлан')`)
await user('boss@tazaet.kz')
ok(
  (await as('boss@tazaet.kz', 'select role from profiles'))[0].role === 'owner',
  'клиент от суперадмина получил роль владельца',
)
await as(
  'boss@tazaet.kz',
  `insert into stores (company_id, name) select my_company(), 'Т' || g from generate_series(1,3) g`,
)
await throws(
  'boss@tazaet.kz',
  `insert into stores (company_id, name) values (my_company(), 'четвёртый')`,
  'лимит магазинов по тарифу «Старт»',
)
await throws(
  'owner@han.kz',
  `select admin_create_company('x', null, 'x', 'start', 'a@b.c', 'x')`,
  'владелец не может подключать клиентов',
)

// согласие на обработку ПД и удаление аккаунта
await user('consent@han.kz', { consent_version: '2026-11', locale: 'kk' })
const cp = (await as('consent@han.kz', 'select consent_at, consent_version, locale from profiles'))[0]
ok(
  cp.consent_at && cp.consent_version === '2026-11' && cp.locale === 'kk',
  'согласие и язык сохраняются при регистрации',
)
await as('consent@han.kz', `update profiles set locale = 'en'`)
ok((await as('consent@han.kz', 'select locale from profiles'))[0].locale === 'en', 'пользователь меняет свой язык')
await throws('owner@han.kz', `select delete_my_account()`, 'владелец не может удалить себя сам')
await as('shatyr@han.kz', `select delete_my_account()`)
ok(
  (await as('owner@han.kz', `select count(*)::int c from profiles where email = 'shatyr@han.kz'`))[0].c === 0,
  'сотрудник удалил аккаунт (отзыв согласия)',
)
ok(
  (await as('owner@han.kz', `select count(*)::int c from orders where number = ${num}`))[0].c === 1,
  'заявки удалённого сотрудника сохранились',
)

// аноним
await ex(`reset role; select set_config('request.jwt.claim.sub', '', false); set role anon;`)
try {
  await db.query('select * from companies')
  ok(false, 'аноним')
} catch (e) {
  ok(true, 'аноним без доступа → ' + e.message)
}
await ex('reset role')
console.log(fails ? `\nПРОВАЛЕНО: ${fails}` : '\nВсе проверки прошли')
process.exit(fails ? 1 : 0)
