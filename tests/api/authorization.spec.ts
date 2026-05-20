import { test, expect } from '../../src/fixtures';
import { articleFactory } from '../../src/factories/article';
import { userFactory } from '../../src/factories/user';
import { ConduitApi } from '../../src/api/client';

/**
 * Negative authorization paths.
 *
 * The other tests in this suite all exercise happy-path 2xx responses.
 * Real production bugs love to live on the 4xx side — "User A can edit/delete
 * an article that belongs to User B" is a classic Insecure Direct Object
 * Reference (IDOR) escape that's worth a regression test.
 *
 * Conduit returns 403 from PUT and DELETE on /api/articles/:slug when the
 * caller isn't the article's author (routes/api/articles.js lines ~192 and
 * ~212). We expect exactly that.
 *
 * The `raw()` escape hatch on ConduitApi is used here because the typed
 * methods (`updateArticle`, `deleteArticle`) assert toBeOK and we WANT to
 * see the non-OK status.
 */
test.describe('Authorization — API', () => {
  test('user B cannot edit or delete user A\'s article', async ({ authedUser, api }) => {
    // User A (the author) — owns an article via the authedUser fixture.
    const article = await authedUser.api.createArticle(articleFactory.build());

    // User B (the intruder) — separately registered.
    const intruder = await api.register(userFactory.build());
    const intruderApi = await ConduitApi.create(intruder.token);

    try {
      // ATTEMPT EDIT — must return 403.
      const editRes = await intruderApi.raw().put(`/api/articles/${article.slug}`, {
        data: { article: { title: 'Hacked!' } },
      });
      expect(
        editRes.status(),
        `Expected 403 when User B PUTs another author's article, got ${editRes.status()}`,
      ).toBe(403);

      // ATTEMPT DELETE — must return 403.
      const delRes = await intruderApi.raw().delete(`/api/articles/${article.slug}`);
      expect(
        delRes.status(),
        `Expected 403 when User B DELETEs another author's article, got ${delRes.status()}`,
      ).toBe(403);

      // SANITY: the article is still there and unchanged. (If the SUT had
      // been silently mutating despite the 403, this would catch it.)
      const stillThere = await authedUser.api.getArticle(article.slug);
      expect(stillThere.title).toBe(article.title);
      expect(stillThere.author.username).toBe(authedUser.user.username);
    } finally {
      await intruderApi.dispose();
    }
  });
});
