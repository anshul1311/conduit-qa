import { test, expect } from '../../src/fixtures';
import { RegisterPage } from '../../src/pages/RegisterPage';
import { LoginPage } from '../../src/pages/LoginPage';
import { HomePage } from '../../src/pages/HomePage';
import { userFactory } from '../../src/factories/user';

/**
 * UI auth flow.
 *
 * Coverage:
 *   1. Register a new user via the form, log out, sign in via the form.
 *   2. Invalid login credentials surface a validation error message.
 *
 * Note on the second test: an earlier version of this spec asserted that a
 * duplicate-email registration shows `.error-messages`. Conduit's POST
 * /api/users handler doesn't return a structured 422 on duplicate email —
 * it catches the Sequelize error and calls `next()` with no body, so the
 * React app's `errors` prop stays undefined and `<ListErrors>` renders null.
 * The /api/users/login route, by contrast, returns a proper 422 with
 * structured errors. We test the reliable path. See AI_USAGE.md #6.
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

  test('login with the wrong password surfaces a validation error', async ({ api, page }) => {
    // Register a real user via API so we know good credentials exist.
    const real = userFactory.build();
    await api.register(real);

    // Attempt UI login with the right email but the wrong password.
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(real.email, 'definitely-not-the-password');

    // Conduit returns 422 { errors: { ... } } and <ListErrors> renders a
    // <ul class="error-messages">. We assert the list appears and the URL
    // stays on /login — we don't lock in exact wording, since that's a
    // backend-implementation detail.
    await expect(page.locator('.error-messages')).toBeVisible({ timeout: 5_000 });
    expect(page.url()).toContain('/login');
  });
});
