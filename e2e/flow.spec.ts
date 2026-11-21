import { execFileSync } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'

/**
 * Полный сценарий пилота: владелец → демо → приглашение магазина → заявка → отгрузка → получение → суперадмин.
 * Требует локальный Supabase (npx supabase start) и psql для назначения суперадмина.
 */
const DB_URL = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = (q: string) => execFileSync('psql', [DB_URL, '-tAc', q]).toString().trim()

const run = Date.now().toString(36)
const owner = `owner-${run}@e2e.qoima.kz`
const shop = `shop-${run}@e2e.qoima.kz`
const admin = `admin-${run}@e2e.qoima.kz`
const PASSWORD = 'secret-123'

async function signup(page: Page, email: string, name: string) {
  await page.goto('/signup')
  await page.getByLabel('Имя и фамилия').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Пароль').fill(PASSWORD)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
}

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Пароль').fill(PASSWORD)
  await page.getByRole('button', { name: 'Войти' }).click()
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Выйти' }).click()
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible()
}

const nav = (page: Page, name: string) => page.getByRole('navigation').getByRole('link', { name, exact: false }).click()
const toast = (page: Page) => page.locator('.toast').last()

test.describe.configure({ mode: 'serial' })

test('пилотный сценарий HAN Burger', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await test.step('владелец регистрируется и создаёт компанию', async () => {
    await signup(page, owner, 'Женисбек Қапан')
    await expect(page.getByRole('heading', { name: 'Создайте компанию' })).toBeVisible()
    await page.getByLabel('Название компании').fill('HAN Burger')
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.getByRole('button', { name: 'Загрузить демо HAN Burger' }).click()
    await expect(page.getByRole('heading', { name: 'Сколько произвести завтра' })).toBeVisible({ timeout: 20_000 })
  })

  await test.step('все страницы производителя открываются', async () => {
    for (const [link, heading] of [
      ['Задание в цех', 'Производственное задание'],
      ['План отгрузки', 'План отгрузки на завтра'],
      ['Заявки', 'Заявки магазинов'],
      ['Остатки', 'Остатки'],
      ['Продажи и отчёты', 'Продажи и отчёты'],
      ['Магазины', 'Магазины'],
      ['Продукция и цены', 'Продукция и цены'],
      ['Сотрудники', 'Сотрудники и доступы'],
    ] as const) {
      await nav(page, link)
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    }
  })

  await test.step('валидация формы и новая позиция', async () => {
    await nav(page, 'Продукция и цены')
    await page.getByRole('button', { name: /Новая позиция/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Сохранить' }).click()
    await expect(dialog.getByText('Заполните поле').first()).toBeVisible()
    await dialog.getByLabel('Название').fill('Картофель фри')
    await dialog.getByLabel('Категория').fill('Закуски')
    await dialog.getByLabel('Цена с НДС, ₸').fill('890')
    await dialog.getByLabel('Себестоимость, ₸').fill('250')
    await dialog.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByRole('cell', { name: 'Картофель фри' })).toBeVisible()
  })

  await test.step('приглашение управляющего магазином', async () => {
    await nav(page, 'Сотрудники')
    await page.getByRole('button', { name: /Пригласить/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Email').fill(shop)
    await dialog.getByLabel('Имя и фамилия').fill('Айгерим Нурланова')
    await dialog.getByLabel('Магазин').selectOption({ label: 'Хан Шатыр' })
    await dialog.getByRole('button', { name: 'Пригласить' }).click()
    await expect(page.getByText('приглашён')).toBeVisible()
    await logout(page)
  })

  await test.step('магазин: остатки и заявка', async () => {
    await signup(page, shop, 'Айгерим Нурланова')
    await expect(page.getByText('Продажи за сегодня')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('link', { name: 'Задание в цех' })).toHaveCount(0)
    await nav(page, 'Остатки')
    await page.getByLabel('Факт: Хан Классик').fill('5')
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await expect(toast(page)).toContainText('Остатки сохранены')
    await nav(page, 'Новая заявка')
    await page.getByRole('button', { name: 'Отправить заявку' }).click()
    await expect(toast(page)).toContainText('отправлена производителю')
    await logout(page)
  })

  await test.step('производитель подтверждает и отправляет', async () => {
    await login(page, owner)
    await nav(page, 'Заявки')
    const card = page.locator('section.card', { hasText: 'Хан Шатыр' }).first()
    await card.getByRole('button', { name: 'Подтвердить' }).click()
    await expect(card.getByRole('button', { name: 'Собрать' })).toBeVisible()
    await card.getByRole('button', { name: 'Собрать' }).click()
    await card.getByRole('button', { name: 'Отправить' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Курьер и машина').fill('Нурбол, 777 ABC 01')
    await dialog.getByLabel('Ожидаемое время прибытия').fill('09:30')
    await dialog.getByRole('button', { name: 'Отправить' }).click()
    await expect(dialog).toHaveCount(0)
    await logout(page)
  })

  await test.step('магазин принимает товар, остаток растёт', async () => {
    const stock = () =>
      Number(
        sql(
          `select coalesce(sum(ss.qty),0) from store_stock ss join stores s on s.id = ss.store_id
           join profiles p on p.store_id = s.id where p.email = '${shop}'`,
        ),
      )
    const before = stock()
    await login(page, shop)
    await nav(page, 'Доставка')
    await page.getByRole('button', { name: 'Товар получен' }).first().click()
    await expect(toast(page)).toContainText('остатки пополнены')
    expect(stock()).toBeGreaterThan(before)
    await logout(page)
  })

  await test.step('суперадмин видит компанию', async () => {
    await signup(page, admin, 'Админ Qoima')
    await expect(page.getByRole('heading', { name: 'Создайте компанию' })).toBeVisible()
    sql(`update profiles set role = 'superadmin' where email = '${admin}'`)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Компании на платформе' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('cell', { name: /HAN Burger/ }).first()).toBeVisible()
  })

  expect(errors).toEqual([])
})

test('без согласия на обработку ПД регистрация не проходит', async ({ page }) => {
  await page.goto('/signup')
  await page.getByLabel('Имя и фамилия').fill('Тест')
  await page.getByLabel('Email').fill(`noconsent-${run}@e2e.qoima.kz`)
  await page.getByLabel('Пароль').fill(PASSWORD)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await expect(page.getByText('Нужно согласие на обработку персональных данных')).toBeVisible()
})

test('мобильная версия без горизонтальной прокрутки, смена языка @mobile', async ({ page }) => {
  await page.goto('/login')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.getByRole('combobox', { name: 'Язык' }).selectOption('kk')
  await expect(page.locator('html')).toHaveAttribute('lang', 'kk')
  await page.getByRole('combobox').selectOption('en')
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible()
})
