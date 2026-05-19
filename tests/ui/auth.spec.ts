import { test, expect } from '../../src/fixtures';
import { RegisterPage } from '../../src/pages/RegisterPage';
import { LoginPage } from '../../src/pages/LoginPage';
import { HomePage } from '../../src/pages/HomePage';
import { userFactory } from '../../src/factories/user';

/**
 * UI auth flow: register a new user, then sign in with the same credentials.
 *
 * What this proves:
 *   - The registration form wires through to the API.
 *   - Session persistence works (login lands you on home with the username
 *     visible in the header).
 *
 * We do registration via the UI here (not via the `authedUser` fixture) on
 * purpose — this is the one test that should exercise the form itself.
 */
test.describe('Auth — UI', () => {
  test('a new user can register and then sign in', async ({ page }) => {
    const creds = userFactory.build();

    // --- Register via UI -----------------------------------------------------
    const registerPage = new RegisterPage(page);
    await registerPage.open();
    await registerPage.register(creds.username, creds.email, creds.password);

    // After register, Conduit redirects to "/" and the username appears in the nav.
    const home = new HomePage(page);
    await page.waitForURL((url) => url.pathname === '/');
    await home.assertLoggedInAs(creds.username);

    // --- Log out by clearing storage, then sign in via UI --------------------
    await page.context().clearCookies();
    await page.evaluate(() => window.localStorage.clear());

    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(creds.email, creds.password);

    await page.waitForURL((url) => url.pathname === '/');
    await home.assertLoggedInAs(creds.username);
  });

  test('register surfaces a validation error on a duplicate email', async ({ api, page }) => {
    // First user, registered via API so we know the email is taken.
    const existing = userFactory.build();
    await api.register(existing);

    // Now try to register through the UI with the SAME email but a different
    // username — the backend should return a validation error.
    const dup = { ...userFactory.build(), email: existing.email };

    const registerPage = new RegisterPage(page);
    await registerPage.open();
    await registerPage.register(dup.username, dup.email, dup.password);

    // The ListErrors component renders backend validation errors in a <ul>.
    // We don't assert on exact wording (that's a backend implementation
    // detail) — only that an error list appears and the URL did not change.
    await expect(page.locator('.error-messages')).toBeVisible({ timeout: 5_000 });
    expect(page.url()).toContain('/register');
  });
});
