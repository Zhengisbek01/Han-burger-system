import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && key)
// Если переменные не заданы, приложение покажет экран настройки и не будет обращаться к клиенту
export const supabase = createClient<Database>(url ?? 'http://localhost', key ?? 'missing')

type Fns = Database['public']['Functions']

/** Типизированный вызов серверной функции с пробросом ошибки */
export async function rpc<N extends keyof Fns>(
  fn: N,
  ...args: Fns[N]['Args'] extends never ? [] : [Fns[N]['Args']]
): Promise<Fns[N]['Returns']> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(fn, args[0])
  if (error) throw new Error(error.message)
  return data as Fns[N]['Returns']
}

export function must<D>(res: { data: D | null; error: { message: string } | null }): D {
  if (res.error) throw new Error(res.error.message)
  return res.data as D
}

/** PostgREST отдаёт максимум 1000 строк за запрос — забираем постранично */
export async function fetchAll<R>(
  build: () => {
    range: (a: number, b: number) => PromiseLike<{ data: R[] | null; error: { message: string } | null }>
  },
  page = 1000,
): Promise<R[]> {
  const out: R[] = []
  for (let from = 0; ; from += page) {
    const rows = must(await build().range(from, from + page - 1))
    out.push(...rows)
    if (rows.length < page) return out
  }
}
