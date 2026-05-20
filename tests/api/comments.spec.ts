import { test, expect } from '../../src/fixtures';
import { articleFactory } from '../../src/factories/article';

/**
 * Comment lifecycle — create, list, delete.
 *
 * Comments are explicitly named in the assignment brief's feature list but
 * weren't exercised by the original 6 tests. This is the gap-fill.
 *
 * The authedUser fixture's auto-cleanup deletes the article at end-of-test;
 * the comments attached to it get destroyed with it (Conduit's destroy
 * cascade). Even so, the test exercises the explicit DELETE endpoint so we
 * cover the full lifecycle, not just an implicit cascade.
 */
test.describe('Comments — API', () => {
  test('post → list → delete a comment on your own article', async ({ authedUser }) => {
    const { api, user } = authedUser;

    // Set up: an article to comment on.
    const article = await api.createArticle(articleFactory.build());

    // POST: create a comment.
    const posted = await api.createComment(article.slug, {
      body: 'First! Looking forward to more.',
    });
    expect(posted.body).toBe('First! Looking forward to more.');
    expect(posted.author.username).toBe(user.username);
    expect(posted.id).toBeTruthy();

    // LIST: the comment shows up.
    const listed = await api.listComments(article.slug);
    const ids = listed.map((c) => c.id);
    expect(ids).toContain(posted.id);

    // DELETE: remove it, then list again — it should be gone.
    await api.deleteComment(article.slug, posted.id);

    const afterDelete = await api.listComments(article.slug);
    const idsAfter = afterDelete.map((c) => c.id);
    expect(idsAfter).not.toContain(posted.id);
  });
});
