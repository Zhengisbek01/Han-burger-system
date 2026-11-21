import { describe, expect, it } from 'vitest'
import { ru } from './ru'
import { kk } from './kk'
import { en } from './en'

type Tree = { [k: string]: string | Tree }

function flat(obj: Tree, prefix = ''): Record<string, string> {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k
    return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flat(v, key) }
  }, {})
}

const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
const base = flat(ru as unknown as Tree)

describe.each([
  ['kk', kk],
  ['en', en],
])('словарь %s', (_, dict) => {
  const d = flat(dict as unknown as Tree)
  it('содержит все ключи ru и не имеет лишних', () => {
    expect(Object.keys(d).sort()).toEqual(Object.keys(base).sort())
  })
  it('нет пустых строк', () => {
    expect(Object.entries(d).filter(([, v]) => !v.trim())).toEqual([])
  })
  it('те же плейсхолдеры {var}', () => {
    const bad = Object.keys(base).filter((k) => JSON.stringify(vars(base[k]!)) !== JSON.stringify(vars(d[k] ?? '')))
    expect(bad).toEqual([])
  })
})
