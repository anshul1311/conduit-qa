import { test, expect } from '../../src/fixtures';
import { articleFactory } from '../../src/factories/article';

/**
 * Full create-read-update-delete cycle against /api/articles.
 *
 * The `authedUser` fixture registers a fresh user, gives us an authed client,
 * and auto-deletes any article created via `api.createArticle`. We still
 * exercise the delete endpoint explicitly here — auto-cleanup is the safety
 * net, not the assertion under test.
 */
test.describe('Articles — API', () => {
  test('create → read → update → delete', async ({ authedUser }) => {
    const { api, user } = authedUser;

    // CREATE
    const draft = articleFactory.build({ tagList: ['crud-test', 'qa'] });
    const created = await api.createArticle(draft);
    expect(created.title).toBe(draft.title);
    expect(created.author.username).toBe(user.username);
    expect(created.tagList.sort()).toEqual(['crud-test', 'qa'].sort());

    // READ
    const fetched = await api.getArticle(created.slug);
    expect(fetched.slug).toBe(created.slug);
    expect(fetched.body).toBe(draft.body);

    // UPDATE
    const updated = await api.updateArticle(created.slug, {
      title: `${draft.title} (edited)`,
      description: 'Edited description',
    });
    expect(updated.title).toBe(`${draft.title} (edited)`);
    expect(updated.description).toBe('Edited description');
    // Body should be unchanged because we didn't pass it.
    expect(updated.body).toBe(draft.body);

    // The slug may or may not change depending on backend behavior; the
    // RealWorld spec leaves this ambiguous. We assert the slug is still
    // resolvable, not that it stayed the same.
    const reread = await api.getArticle(updated.slug);
    expect(reread.title).toBe(updated.title);

    // DELETE
    await api.deleteArticle(updated.slug);

    // After delete, GET should 404. We poke the raw context to avoid the
    // client's expect-OK guard.
    const after = await api.raw().get(`/api/articles/${updated.slug}`);
    expect(after.status()).toBe(404);
  });

  test('list filters by author', async ({ authedUser }) => {
    const { api, user } = authedUser;
    const mine = await api.createArticle(articleFactory.build());

    const list = await api.listArticles({ author: user.username, limit: 5 });
    const slugs = list.articles.map((a) => a.slug);
    expect(slugs).toContain(mine.slug);
    // Every article in the response should be by this user.
    for (const article of list.articles) {
      expect(article.author.username).toBe(user.username);
    }
  });
});
