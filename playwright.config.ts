import { defineConfig, devices } from '@playwright/test';
import { VIEWPORTS } from './e2e/viewports';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5199',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /responsive-layout-audit\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    ...VIEWPORTS.map((vp) => ({
      name: `audit-${vp.name}`,
      testMatch: /responsive-layout-audit\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: vp.width, height: vp.height },
      },
    })),
  ],
  webServer: {
    command: 'pnpm dev --port 5199 --host 127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
    env: {
      VITE_ADMIN_DEV_BYPASS: 'true',
    },
  },
});
