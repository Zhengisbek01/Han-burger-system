import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, fetchAll, must } from '@/shared/lib/supabase'
import { addDays, isoDate } from '@/shared/lib/format'
import { buildModel, type Model } from '@/features/forecast/model'
import {
  isStaff,
  type Company,
  type Order,
  type Plan,
  type Product,
  type Sale,
  type Shift,
  type Store,
  type StoreStock,
  type WarehouseStock,
} from '@/shared/types/domain'

export const HISTORY_DAYS = 28

export interface CompanyData {
  company: Company & { plans: Plan | null }
  stores: Store[]
  products: Product[]
  storeStock: StoreStock[]
  warehouse: WarehouseStock[]
  sales: Sale[]
  shifts: Shift[]
  orders: Order[]
}

/** Все данные компании для кабинетов производителя и магазина. Лишнее отрезает RLS. */
export function useCompanyData(companyId: string, role: string | null) {
  const [data, setData] = useState<CompanyData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((x) => x + 1), [])
  const staff = isStaff(role)

  useEffect(() => {
    let alive = true
    const from = isoDate(addDays(new Date(), -HISTORY_DAYS + 1))
    ;(async () => {
      try {
        const [company, stores, products, storeStock, warehouse, sales, orders, shifts] = await Promise.all([
          supabase.from('companies').select('*, plans(*)').eq('id', companyId).single().then(must),
          supabase.from('stores').select('*').order('created_at').then(must),
          supabase.from('products').select('*').order('sort').order('name').then(must),
          fetchAll<StoreStock>(() =>
            supabase
              .from('store_stock')
              .select('store_id, product_id, qty, updated_at')
              .order('store_id')
              .order('product_id'),
          ),
          staff ? supabase.from('warehouse_stock').select('product_id, qty').then(must) : Promise.resolve([]),
          fetchAll<Sale>(() =>
            supabase
              .from('shift_items')
              .select('store_id, product_id, shift_date, qty, price')
              .gte('shift_date', from)
              .order('shift_date')
              .order('store_id')
              .order('product_id'),
          ),
          supabase
            .from('orders')
            .select('*, items:order_items(product_id, qty, price)')
            .order('created_at', { ascending: false })
            .limit(200)
            .then(must),
          supabase.from('shifts').select('id, store_id, shift_date, total, comment').gte('shift_date', from).then(must),
        ])
        if (!alive) return
        setData({ company, stores, products, storeStock, warehouse, sales, shifts, orders: orders as Order[] })
        setError(null)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      alive = false
    }
  }, [companyId, staff, tick])

  // живые обновления заявок и остатков (если Realtime включён в проекте Supabase)
  useEffect(() => {
    const ch = supabase
      .channel(`company-${companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_stock' }, reload)
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [companyId, reload])

  const model = useMemo<Model | null>(() => {
    if (!data) return null
    return buildModel({
      stores: data.stores.filter((s) => s.active),
      products: data.products.filter((p) => p.active),
      sales: data.sales,
      storeStock: data.storeStock,
      warehouse: data.warehouse,
      orders: data.orders,
      safety: data.company.safety_pct / 100,
      history: HISTORY_DAYS,
    })
  }, [data])

  return { data, model, error, reload }
}
