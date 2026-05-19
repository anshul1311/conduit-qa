import { Page, expect } from '@playwright/test';

/**
 * Common navigation, waiting, and assertion helpers.
 *
 * AGENT RULE: When you find yourself writing `await this.page.goto(...)` or
 * `await this.page.waitForLoadState(...)` in a page object, extract it here.
 * Page objects should describe USER INTENT (`goToHome`, `publish`), not
 * mechanics (`waitForNetworkIdle`).
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Navigate to a path relative to the configured UI base URL. */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Header brand link — present on every page. Useful smoke check. */
  async assertHeaderVisible(): Promise<void> {
    await expect(this.page.getByRole('link', { name: 'conduit' })).toBeVisible();
  }

  /**
   * Username link in the header — only present when logged in.
   *
   * The Header component renders the link as:
   *   <Link><img alt={username} /> {username}</Link>
   * so the accessible name is roughly "<username> <username>" (alt + text).
   * That's why we use a substring match instead of an anchored exact match —
   * `name: username` would still match an accessible name like "alice alice".
   */
  async assertLoggedInAs(username: string): Promise<void> {
    await expect(
      this.page.getByRole('link', { name: username }).first(),
    ).toBeVisible();
  }

  async clickNav(linkName: 'Home' | 'Sign in' | 'Sign up' | 'New Post' | 'Settings'): Promise<void> {
    await this.page.getByRole('link', { name: linkName }).click();
  }
}
