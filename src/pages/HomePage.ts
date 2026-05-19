import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * `/` — Home page (global feed + tags).
 */
export class HomePage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/');
  }

  /** Asserts an article preview with the given title appears on the page. */
  async assertArticleVisible(title: string): Promise<void> {
    // Article previews render the title inside an <h1>. Use getByRole + text
    // rather than `.article-preview h1` so a CSS rename doesn't break us.
    await expect(this.page.getByRole('heading', { name: title })).toBeVisible();
  }
}
