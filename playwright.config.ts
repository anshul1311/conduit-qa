import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Single source of truth for environment URLs.
 * - UI: React frontend on :4101
 * - API: Express backend on :3000 (the /api prefix lives in the client wrapper)
 *
 * Agents: do NOT hardcode these in tests. Always pull from process.env via the
 * fixtures / API client.
 */
export const UI_BASE_URL = process.env.UI_BASE_URL ?? 'http://localhost:4101';
export const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  // Out-of-scope per brief: multi-browser. We target chromium only.
  // Out-of-scope per brief: parallel sharding for CI. Local parallel is fine.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  // Reporters: list for humans, json for AI agents to parse failure traces.
  // The JSON reporter is the agentic hook — it lets a follow-up agent read
  // structured failure data without scraping terminal output.
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    baseURL: UI_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
