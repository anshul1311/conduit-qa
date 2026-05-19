import { BasePage } from './BasePage';

/**
 * /register — sign-up form.
 *
 * Selectors are role/placeholder based (resilient to CSS churn). The form has
 * three inputs (Username, Email, Password) and a "Sign up" submit button.
 */
export class RegisterPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/register');
  }

  async register(username: string, email: string, password: string): Promise<void> {
    await this.page.getByPlaceholder('Username').fill(username);
    await this.page.getByPlaceholder('Email').fill(email);
    await this.page.getByPlaceholder('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign up' }).click();
  }
}
