import { BasePage } from './BasePage';

/**
 * /login — sign-in form.
 */
export class LoginPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.getByPlaceholder('Email').fill(email);
    await this.page.getByPlaceholder('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }
}
