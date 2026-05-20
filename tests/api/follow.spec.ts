import { test, expect } from '../../src/fixtures';
import { userFactory } from '../../src/factories/user';

/**
 * Follow / unfollow — cross-user social interaction.
 *
 * Like comments, "user follows" is explicitly named in the brief's feature
 * list but wasn't covered by the original 6 tests. This closes that gap.
 *
 * Pattern is identical to the favorite test: the authedUser fixture supplies
 * one user; we register a second one via the anonymous `api` fixture to be
 * the target of the follow.
 */
test.describe('Profiles — API', () => {
  test('user A can follow and unfollow user B', async ({ authedUser, api }) => {
    // Target user: someone for our authedUser to follow.
    const target = await api.register(userFactory.build());

    // Before any follow, the profile should not be marked as followed.
    const before = await authedUser.api.getProfile(target.username);
    expect(before.username).toBe(target.username);
    expect(before.following).toBe(false);

    // FOLLOW.
    const followed = await authedUser.api.followUser(target.username);
    expect(followed.username).toBe(target.username);
    expect(followed.following).toBe(true);

    // A subsequent GET /profiles/<target> should still see following=true
    // — this exercises the read-side, not just the immediate POST response.
    const reread = await authedUser.api.getProfile(target.username);
    expect(reread.following).toBe(true);

    // UNFOLLOW.
    const unfollowed = await authedUser.api.unfollowUser(target.username);
    expect(unfollowed.following).toBe(false);

    const afterUnfollow = await authedUser.api.getProfile(target.username);
    expect(afterUnfollow.following).toBe(false);
  });
});
