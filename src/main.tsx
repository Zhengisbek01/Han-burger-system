import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@/shared/ui/styles.css'
import { I18nProvider } from '@/shared/i18n'
import { ToastProvider } from '@/shared/ui/toast'
import { AuthProvider } from '@/app/auth'
import { App } from '@/app/App'
import { isConfigured } from '@/shared/lib/supabase'
import { NotConfigured } from '@/app/NotConfigured'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ToastProvider>
        {isConfigured ? (
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        ) : (
          <NotConfigured />
        )}
      </ToastProvider>
    </I18nProvider>
  </StrictMode>,
)
