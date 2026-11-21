import { describe, expect, it } from 'vitest'
import { DICTS, translate, translateError, type TFn } from './index'

const t: TFn = (k, v) => translate(DICTS.ru, k, v)

describe('i18n', () => {
  it('подставляет переменные', () => {
    expect(translate(DICTS.en, 'ship.created', { n: 3 })).toContain('3')
  })
  it('переводит известные ошибки сервера', () => {
    expect(translateError(t, 'Invalid login credentials')).toBe(DICTS.ru.errors.badLogin)
    expect(translateError(t, 'new row violates row-level security policy')).toBe(DICTS.ru.errors.forbidden)
  })
  it('неизвестную ошибку отдаёт как есть', () => {
    expect(translateError(t, 'boom')).toBe('boom')
  })
})
