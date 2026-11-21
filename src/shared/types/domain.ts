import type { Database } from './database'

type T = Database['public']['Tables']
export type Company = T['companies']['Row']
export type Plan = T['plans']['Row']
export type Store = T['stores']['Row']
export type Product = T['products']['Row']
export type Profile = T['profiles']['Row']
export type Invitation = T['invitations']['Row']
export type StoreStock = Pick<T['store_stock']['Row'], 'store_id' | 'product_id' | 'qty' | 'updated_at'>
export type WarehouseStock = Pick<T['warehouse_stock']['Row'], 'product_id' | 'qty'>
export type Shift = Pick<T['shifts']['Row'], 'id' | 'store_id' | 'shift_date' | 'total' | 'comment'>
export type Sale = Pick<T['shift_items']['Row'], 'store_id' | 'product_id' | 'shift_date' | 'qty' | 'price'>
export type OrderItem = Pick<T['order_items']['Row'], 'product_id' | 'qty' | 'price'>
export type Order = T['orders']['Row'] & { items: OrderItem[] }

export type Role = 'owner' | 'manager' | 'store' | 'superadmin'
export type OrderStatus = 'new' | 'confirmed' | 'assembling' | 'transit' | 'delivered' | 'cancelled'
export type CompanyStatus = 'trial' | 'active' | 'overdue' | 'blocked'
export type Locale = 'ru' | 'kk' | 'en'

export const ORDER_FLOW: OrderStatus[] = ['new', 'confirmed', 'assembling', 'transit', 'delivered']
export const isStaff = (role: string | null | undefined): boolean => role === 'owner' || role === 'manager'
