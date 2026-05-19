import { BasePage } from './BasePage';

/**
 * /editor — article create / edit form.
 *
 * The form has four fields: Title, Description, Body (textarea), and Tags
 * (chip input — Enter to add). Submit button text is "Publish Article".
 */
export class EditorPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/editor');
  }

  async fillArticle(input: {
    title: string;
    description: string;
    body: string;
    tags?: string[];
  }): Promise<void> {
    await this.page.getByPlaceholder('Article Title').fill(input.title);
    await this.page.getByPlaceholder("What's this article about?").fill(input.description);
    await this.page.getByPlaceholder('Write your article (in markdown)').fill(input.body);
    if (input.tags?.length) {
      const tagInput = this.page.getByPlaceholder('Enter tags');
      for (const tag of input.tags) {
        await tagInput.fill(tag);
        await tagInput.press('Enter');
      }
    }
  }

  async publish(): Promise<void> {
    await this.page.getByRole('button', { name: 'Publish Article' }).click();
    // Wait for the navigation to /article/<slug>.
    await this.page.waitForURL(/\/article\//);
  }
}
