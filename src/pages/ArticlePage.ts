import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * /article/<slug> — single article view.
 */
export class ArticlePage extends BasePage {
  async assertTitle(title: string): Promise<void> {
    await expect(this.page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
  }

  async assertBodyContains(text: string): Promise<void> {
    await expect(this.page.locator('.article-content')).toContainText(text);
  }

  /**
   * Parse the slug out of the current URL. Useful for tests that publish
   * via the UI and need to delete via the API afterward.
   */
  currentSlug(): string {
    const url = this.page.url();
    const match = url.match(/\/article\/([^/?#]+)/);
    if (!match) {
      throw new Error(`Not on an article page: ${url}`);
    }
    return match[1];
  }
}
