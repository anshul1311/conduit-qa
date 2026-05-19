/**
 * Unique-seed helper for factories.
 *
 * WHY THIS EXISTS
 * ---------------
 * Two common failure modes when AI agents generate tests:
 *   (a) They hard-code values like `email: "test@test.com"` — parallel runs
 *       then collide on the user-uniqueness constraint.
 *   (b) They reach for `Math.random()` without a seed — flakes become
 *       impossible to reproduce.
 *
 * The fix: a worker-scoped + timestamp-derived token that guarantees uniqueness
 * across parallel workers and across runs, but stays printable so failures
 * tell you which token was in play.
 *
 * If TEST_SEED is set in env, the token uses it directly (deterministic across
 * runs as long as the worker index + call order match). Otherwise it derives
 * a fresh stamp per call, which is what you want for data-uniqueness in a
 * long-lived dev database.
 */

let counter = 0;

/**
 * Returns a short unique token suitable for embedding in usernames, emails,
 * article slugs, etc. Format: `<base36-ts>-<worker>-<counter>`.
 *
 * Example: `lrz3p9q-1-7`
 */
export function uniqueToken(): string {
  const envSeed = process.env.TEST_SEED;
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  counter += 1;
  const stamp = envSeed ? `${envSeed}` : Date.now().toString(36);
  return `${stamp}-${worker}-${counter}`;
}
