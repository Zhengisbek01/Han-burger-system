import { defineConfig, devices } from '@playwright/test'

// E2E идут против локального Supabase (npx supabase start) и собранного приложения.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173', locale: 'ru-RU', trace: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: 'npm run preview -- --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
})
