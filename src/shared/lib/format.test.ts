import { describe, expect, it } from 'vitest'
import { fmt, kzt, vatIncluded, isValidBin, normalizePhone, isoDate, sum } from './format'

describe('format', () => {
  it('группирует разряды неразрывным пробелом', () => {
    expect(fmt(1234567.4)).toBe('1 234 567')
    expect(kzt(2490)).toBe('2 490 ₸')
    expect(fmt(null)).toBe('0')
  })
  it('считает НДС 12% внутри суммы', () => {
    expect(vatIncluded(1120)).toBe(120)
    expect(vatIncluded(2490)).toBeCloseTo(266.79, 2)
  })
  it('суммирует с пропусками', () => expect(sum([1, null, '2' as unknown as number, undefined])).toBe(3))
  it('isoDate берёт локальную дату', () => expect(isoDate(new Date(2026, 10, 21, 0, 30))).toBe('2026-11-21'))
})

describe('БИН/ИИН', () => {
  it('принимает корректный', () => {
    expect(isValidBin('000740001307')).toBe(true) // Kaspi Bank, публичный БИН
    expect(isValidBin('940740000911')).toBe(true) // Halyk Bank, публичный БИН
  })
  it('отклоняет неверный разряд и формат', () => {
    expect(isValidBin('000740001308')).toBe(false)
    expect(isValidBin('12345')).toBe(false)
  })
})

describe('телефон', () => {
  it('нормализует казахстанский номер', () => {
    expect(normalizePhone('8 (701) 123-45-67')).toBe('+77011234567')
    expect(normalizePhone('+7 747 000 11 22')).toBe('+77470001122')
    expect(normalizePhone('+7 495 123 45 67')).toBeNull()
  })
})
