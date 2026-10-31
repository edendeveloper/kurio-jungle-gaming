import { defineConfig, devices } from '@playwright/test'

const previewPort = process.env.KURIO_PREVIEW_PORT ?? '4377'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: [
    'foundation.spec.ts',
    'anonymous.spec.ts',
    'accounts.spec.ts',
    'checkout.spec.ts',
    'realtime.spec.ts',
    'visual-audit.spec.ts',
  ],
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium', viewport: { width: 390, height: 844 } } },
  ],
  use: { baseURL: `http://127.0.0.1:${previewPort}` },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: `http://127.0.0.1:${previewPort}`,
    reuseExistingServer: process.env.KURIO_PREVIEW_REUSE === 'true',
  },
})
