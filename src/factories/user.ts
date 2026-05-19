import { NewUser } from '../api/types';
import { uniqueToken } from '../support/seed';

/**
 * Build a fresh, unique NewUser payload.
 *
 * AGENT RULE
 * ----------
 * Tests should NEVER construct user objects inline (`{ username: 'alice' }`).
 * Always go through `userFactory.build()` — this guarantees:
 *   - Uniqueness across parallel workers (no duplicate-email 422s).
 *   - A consistent password (`Test1234!`) so failures don't blame the password.
 *   - Email/username naming that's traceable back to the run that created it
 *     (`qa-<token>@example.com`).
 */
export const userFactory = {
  build(overrides: Partial<NewUser> = {}): NewUser {
    const token = uniqueToken();
    return {
      username: `qa-${token}`,
      email: `qa-${token}@example.com`,
      password: 'Test1234!',
      ...overrides,
    };
  },
};
