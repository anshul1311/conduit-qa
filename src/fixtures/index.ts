import { test as base } from '@playwright/test';
import { ConduitApi } from '../api/client';
import { User } from '../api/types';
import { userFactory } from '../factories/user';
import { log } from '../support/logger';

/**
 * Framework-wide fixtures.
 *
 * AGENT CONTRACT
 * --------------
 * Tests import `test` and `expect` from THIS file, not from `@playwright/test`
 * directly. That's how they pick up the fixtures and the auto-cleanup.
 *
 *     import { test, expect } from '../../src/fixtures';
 *
 * Available fixtures:
 *   - api          : an anonymous ConduitApi (token-less)
 *   - authedUser   : { user, password, api } — a freshly registered user +
 *                    authed client. `password` is exposed so UI tests can
 *                    drive the login form with the same user. Every article
 *                    created via `authedUser.api.createArticle` AND every
 *                    slug passed to `track(slug)` is auto-deleted at
 *                    end-of-test.
 *   - track        : (slug) => void — mark any extra slug (e.g. one created
 *                    via the UI editor) for cleanup at end-of-test. Cleanup
 *                    is performed by the `authedUser` fixture, so any test
 *                    that uses `track` must also depend on `authedUser`.
 *
 * WHY THIS MATTERS FOR AGENTS
 * Without auto-cleanup, the SQLite DB fills with junk and tests that filter
 * by tag/author start returning stale data, which looks like a flake. Agents
 * very reliably forget cleanup blocks; baking it into the fixture removes the
 * footgun entirely.
 */

type TrackedResources = {
  slugs: string[];
};

type Fixtures = {
  api: ConduitApi;
  tracked: TrackedResources;
  track: (slug: string) => void;
  authedUser: { user: User; password: string; api: ConduitApi };
};

export const test = base.extend<Fixtures>({
  // Anonymous API client. Disposed at end-of-test.
  api: async ({}, use) => {
    const client = await ConduitApi.create();
    await use(client);
    await client.dispose();
  },

  // Shared cleanup ledger. Lives for the duration of one test.
  // eslint-disable-next-line no-empty-pattern
  tracked: async ({}, use) => {
    const tracked: TrackedResources = { slugs: [] };
    await use(tracked);
  },

  // Convenience wrapper that test code calls: `track(slug)`.
  track: async ({ tracked }, use) => {
    await use((slug: string) => {
      tracked.slugs.push(slug);
    });
  },

  // Registers a fresh user via the API, hands tests an authed client, and
  // cleans up every article that user created through this client.
  authedUser: async ({ tracked }, use) => {
    const anonymous = await ConduitApi.create();
    const payload = userFactory.build();
    const user = await anonymous.register(payload);
    await anonymous.dispose();

    const api = await ConduitApi.create(user.token);
    log.info('fixture.authedUser.registered', { username: user.username });

    // Wrap createArticle so every slug is tracked automatically. Tests don't
    // need to remember to clean up — the framework does it.
    const originalCreate = api.createArticle.bind(api);
    api.createArticle = async (article) => {
      const created = await originalCreate(article);
      tracked.slugs.push(created.slug);
      return created;
    };

    await use({ user, password: payload.password, api });

    // Cleanup pass. Failures here are logged but never fail the test — the
    // SUT may have already deleted some resources (e.g. via a UI delete
    // earlier in the test).
    for (const slug of tracked.slugs) {
      try {
        await api.deleteArticle(slug);
        log.info('fixture.cleanup.deleted', { slug });
      } catch (err) {
        log.warn('fixture.cleanup.failed', { slug, err: String(err) });
      }
    }
    await api.dispose();
  },
});

export { expect } from '@playwright/test';
