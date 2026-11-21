import { Navigate, Route, Routes } from 'react-router-dom'
import { useMemo } from 'react'
import { Layout, type NavSection } from '@/app/Layout'
import { ErrorState, Loading } from '@/shared/ui/components'
import { useI18n } from '@/shared/i18n'
import type { Profile } from '@/shared/types/domain'
import { useCompanyData } from './useCompanyData'
import { CompanyContext } from './context'
import { DashboardPage, ProductionPage, ShipmentPage } from '@/features/producer/planning'
import { OrdersPage, StockPage, ReportsPage } from '@/features/producer/operations'
import { StoresPage, ProductsPage, StaffPage, SettingsPage } from '@/features/producer/directory'
import { StoreHomePage, StoreStockPage, ShiftPage, NewOrderPage, DeliveryPage } from '@/features/store/pages'
import { AccountPage } from '@/features/account/AccountPage'

export function CompanyApp({ profile }: { profile: Profile }) {
  const { t } = useI18n()
  const { data, model, error, reload } = useCompanyData(profile.company_id!, profile.role)
  const isStore = profile.role === 'store'
  const ctx = useMemo(
    () =>
      data && model
        ? {
            data,
            model,
            reload,
            activeStores: data.stores.filter((s) => s.active),
            activeProducts: data.products.filter((p) => p.active),
          }
        : null,
    [data, model, reload],
  )
  const newOrders = data?.orders.filter((o) => o.status === 'new').length ?? 0

  const sections: NavSection[] = isStore
    ? [
        {
          title: 'nav.store',
          items: [
            { to: '/s', icon: '◎', label: 'nav.summary', end: true },
            { to: '/s/stock', icon: '▦', label: 'nav.stock' },
            { to: '/s/shift', icon: '₸', label: 'nav.shift' },
            { to: '/s/order', icon: '+', label: 'nav.newOrder' },
            { to: '/s/delivery', icon: '⇢', label: 'nav.delivery' },
          ],
        },
      ]
    : [
        {
          title: 'nav.main',
          items: [
            { to: '/p', icon: '◎', label: 'nav.dashboard', end: true },
            { to: '/p/production', icon: '⚙', label: 'nav.production' },
            { to: '/p/shipment', icon: '⇢', label: 'nav.shipment' },
          ],
        },
        {
          title: 'nav.operations',
          items: [
            { to: '/p/orders', icon: '☰', label: 'nav.orders', badge: newOrders },
            { to: '/p/stock', icon: '▦', label: 'nav.stock' },
            { to: '/p/reports', icon: '↗', label: 'nav.reports' },
          ],
        },
        {
          title: 'nav.directory',
          items: [
            { to: '/p/stores', icon: '⌂', label: 'nav.stores' },
            { to: '/p/products', icon: '◫', label: 'nav.products' },
            { to: '/p/staff', icon: '☺', label: 'nav.staff' },
            { to: '/p/settings', icon: '⚑', label: 'nav.company' },
          ],
        },
      ]

  const store = data?.stores.find((s) => s.id === profile.store_id)
  const subtitle = data ? (isStore ? `${data.company.name} · ${store?.name ?? ''}` : data.company.name) : '…'
  let body
  if (error) body = <ErrorState text={error} onRetry={reload} />
  else if (!ctx) body = <Loading />
  else if (ctx.data.company.status === 'blocked') body = <ErrorState text={t('errors.blocked')} />
  else
    body = (
      <CompanyContext.Provider value={ctx}>
        <Routes>
          {isStore ? (
            <>
              <Route path="/s" element={<StoreHomePage />} />
              <Route path="/s/stock" element={<StoreStockPage />} />
              <Route path="/s/shift" element={<ShiftPage />} />
              <Route path="/s/order" element={<NewOrderPage />} />
              <Route path="/s/delivery" element={<DeliveryPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="*" element={<Navigate to="/s" replace />} />
            </>
          ) : (
            <>
              <Route path="/p" element={<DashboardPage />} />
              <Route path="/p/production" element={<ProductionPage />} />
              <Route path="/p/shipment" element={<ShipmentPage />} />
              <Route path="/p/orders" element={<OrdersPage />} />
              <Route path="/p/stock" element={<StockPage />} />
              <Route path="/p/reports" element={<ReportsPage />} />
              <Route path="/p/stores" element={<StoresPage />} />
              <Route path="/p/products" element={<ProductsPage />} />
              <Route path="/p/staff" element={<StaffPage />} />
              <Route path="/p/settings" element={<SettingsPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="*" element={<Navigate to="/p" replace />} />
            </>
          )}
        </Routes>
      </CompanyContext.Provider>
    )
  return (
    <Layout sections={sections} subtitle={subtitle}>
      {body}
    </Layout>
  )
}
