import { createContext, useContext } from 'react'
import type { Model } from '@/features/forecast/model'
import type { CompanyData } from './useCompanyData'

export interface CompanyCtx {
  data: CompanyData
  model: Model
  reload: () => void
  activeStores: CompanyData['stores']
  activeProducts: CompanyData['products']
}
export const CompanyContext = createContext<CompanyCtx | null>(null)
export function useCompany(): CompanyCtx {
  const c = useContext(CompanyContext)
  if (!c) throw new Error('useCompany вне CompanyContext')
  return c
}
