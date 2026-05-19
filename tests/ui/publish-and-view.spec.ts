import { test } from '../../src/fixtures';
import { LoginPage } from '../../src/pages/LoginPage';
import { EditorPage } from '../../src/pages/EditorPage';
import { ArticlePage } from '../../src/pages/ArticlePage';
import { HomePage } from '../../src/pages/HomePage';
import { articleFactory } from '../../src/factories/article';

/**
 * Cross-stack flow: register via API (fast), log in via UI, publish an article
 * through the editor, then verify it renders on the article page AND on the
 * global feed.
 *
 * Pattern: API setup, UI assert. The auth spec already covers the UI register
 * flow — repeating it here would waste time and obscure the part under test
 * (publish + view). This split is the recommended pattern in AGENTS.md.
 *
 * Cleanup: the article is created via the UI (not via authedUser.api), so
 * the framework's auto-tracking doesn't see it. We pass the slug to `track()`
 * and the `authedUser` fixture deletes it at end-of-test.
 */
test('a logged-in user can publish an article and see it on home', async ({
  authedUser,
  track,
  page,
}) => {
  const { user, password } = authedUser;

  // --- Log in via UI (so the React app stores the token in localStorage) ---
  const login = new LoginPage(page);
  await login.open();
  await login.login(user.email, password);
  await page.waitForURL((url) => url.pathname === '/');

  // --- Publish via the editor ----------------------------------------------
  const article = articleFactory.build({ tagList: ['ui-publish'] });
  const editor = new EditorPage(page);
  await editor.open();
  await editor.fillArticle({
    title: article.title,
    description: article.description,
    body: article.body,
    tags: article.tagList,
  });
  await editor.publish();

  // --- Verify on the article page ------------------------------------------
  const articlePage = new ArticlePage(page);
  await articlePage.assertTitle(article.title);
  await articlePage.assertBodyContains('Body for article');

  // Capture the slug so the authedUser fixture's teardown can clean it up.
  // Without this the article would leak into the global feed and pollute
  // subsequent runs.
  track(articlePage.currentSlug());

  // --- Verify on the global feed -------------------------------------------
  const home = new HomePage(page);
  await home.open();
  await home.assertArticleVisible(article.title);
});
