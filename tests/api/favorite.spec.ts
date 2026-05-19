import { test, expect } from '../../src/fixtures';
import { articleFactory } from '../../src/factories/article';
import { ConduitApi } from '../../src/api/client';
import { userFactory } from '../../src/factories/user';

/**
 * Favorite / unfavorite — the simplest cross-user interaction in Conduit.
 *
 * We need TWO users here: an author who creates the article, and a reader
 * who favorites it. The reader is set up manually so we have explicit
 * control over which token does what.
 */
test.describe('Favorites — API', () => {
  test('a reader can favorite and unfavorite an article by another author', async ({ authedUser, api }) => {
    const author = authedUser;
    const article = await author.api.createArticle(articleFactory.build());
    expect(article.favoritesCount).toBe(0);
    expect(article.favorited).toBe(false);

    // Register a reader.
    const reader = await api.register(userFactory.build());
    const readerApi = await ConduitApi.create(reader.token);

    try {
      const favorited = await readerApi.favoriteArticle(article.slug);
      expect(favorited.favorited).toBe(true);
      expect(favorited.favoritesCount).toBe(1);

      const unfavorited = await readerApi.unfavoriteArticle(article.slug);
      expect(unfavorited.favorited).toBe(false);
      expect(unfavorited.favoritesCount).toBe(0);
    } finally {
      await readerApi.dispose();
    }
  });
});
