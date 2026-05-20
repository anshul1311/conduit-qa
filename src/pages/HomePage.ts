import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * `/` — Home page (feed tabs + tags sidebar).
 *
 * Conduit's Home has two feed tabs:
 *   - "Your Feed"   — articles by users the current user follows (default
 *                     tab when logged in, but EMPTY for a fresh user with
 *                     zero follows).
 *   - "Global Feed" — every article in the system, newest first.
 *
 * Tests that publish an article and then want to see it must switch to
 * Global Feed first, otherwise they'll be looking at an empty Your Feed
 * and the assertion will time out for the wrong reason.
 */
export class HomePage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/');
  }

  /**
   * Click the "Global Feed" tab and wait for the article list to repopulate.
   * Required after publishing an article via the UI, since a fresh user's
   * "Your Feed" is empty by default.
   */
  async selectGlobalFeed(): Promise<void> {
    await this.page.getByRole('link', { name: 'Global Feed' }).click();
  }

  /** Asserts an article preview with the given title appears on the page. */
  async assertArticleVisible(title: string): Promise<void> {
    // Article previews render the title inside an <h1>. Use getByRole + text
    // rather than `.article-preview h1` so a CSS rename doesn't break us.
    await expect(this.page.getByRole('heading', { name: title })).toBeVisible();
  }
}
