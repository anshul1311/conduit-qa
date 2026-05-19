# AGENTS.md — contributing tests as an AI agent

This file is the canonical guide for AI coding agents (Claude Code, Copilot,
Cursor, etc.) contributing to this framework. Humans should read it too. It is
the single source of truth — `CLAUDE.md`, `.cursorrules`, and any other
agent-specific config files all point here.

If you change anything load-bearing about the framework, update this file in
the same PR. A stale AGENTS.md is worse than no AGENTS.md.

---

## 30-second map of the repo

```
src/
  api/          ConduitApi — typed REST wrapper. All API access goes through here.
  factories/    user/article — build fresh, unique payloads. Never inline data.
  fixtures/     Playwright `test` extend — auth + auto-cleanup live here.
  pages/        Page objects. Role/text selectors, one method per user intent.
  support/      seed (uniqueness helper) + logger (structured JSON output).
tests/
  api/          API-only tests. Fast. Use them for setup, edge cases, contracts.
  ui/           Browser tests. Slower. Reserve for things only the UI can prove.
scripts/
  scaffold-test.ts   `npm run agent:scaffold` — generates a new spec from template.
  agent-check.ts     `npm run agent:check`   — flags common AI-generated anti-patterns.
```

---

## The five rules

1. **Import `test` and `expect` from `src/fixtures`, never from `@playwright/test`.**
   That's how you pick up the auto-cleanup, the API client, and the authed-user
   fixture. A test that imports from `@playwright/test` directly will leak data.

2. **Never inline test data. Always go through a factory.**
   `userFactory.build()` and `articleFactory.build()` produce unique values per
   call. Hard-coded `email: "alice@test.com"` will collide with parallel
   workers and with leftover data from previous runs.

3. **Setup via API, assert via UI.**
   If a UI test needs an existing user, register them through `api.register()` —
   don't drive the registration form unless registration is what you're testing.
   This makes tests faster and pins failure to the specific behavior under test.

4. **Use role/text-based selectors. No CSS classnames, no XPath.**
   `page.getByRole('button', { name: 'Sign in' })` is robust. `.btn.btn-primary`
   is one Bootstrap upgrade away from breaking. The page objects already follow
   this — keep doing it.

5. **Every assertion failure should print *what was wrong*, not just *that
   something was wrong*.**
   `expect(res, 'POST /users failed: ...').toBeOK()` beats `expect(res.ok()).toBe(true)`.
   When an agent later reads the failure, the message is half the debugging.

---

## What the fixtures give you

```ts
import { test, expect } from '../../src/fixtures';

test('example', async ({ api, authedUser, track, page }) => {
  // api          — anonymous ConduitApi (no token)
  // authedUser   — { user, password, api } where api is authenticated and any
  //                article created via api.createArticle() is auto-deleted at
  //                end of test. `password` is exposed so UI tests can log in
  //                via the form with the same user.
  // track(slug)  — manually queue a slug for cleanup. Use this when you publish
  //                an article through the UI editor. Cleanup actually runs in
  //                the `authedUser` teardown, so any test that uses `track`
  //                MUST also depend on `authedUser` — otherwise the queued
  //                slugs never get drained.
  // page         — standard Playwright Page.
});
```

---

## Adding a new test

Run `npm run agent:scaffold <name> <ui|api>`. It will produce a spec file in
the right folder with the right imports, the right fixture, and a TODO body
you fill in.

```
npm run agent:scaffold delete-comment api
# → tests/api/delete-comment.spec.ts
```

---

## Adding a new API endpoint

1. Add request/response types to `src/api/types.ts`.
2. Add the method to `src/api/client.ts`. It must:
   - Return the *unwrapped* domain object (Article, not { article }).
   - Assert success with `expect(res, "<descriptive msg>").toBeOK()`.
   - Use the `Authorization: Token <jwt>` header — Bearer silently 401s.

---

## Adding a new page object

1. Extend `BasePage`. Get the `Page` injected via the constructor.
2. Selectors must be `getByRole`, `getByPlaceholder`, `getByLabel`, or
   `getByText`. If the React component doesn't expose a stable role, add a
   `data-testid` to the React file — yes, that touches the SUT, but a stable
   selector is worth a one-line change and is documented in DECISIONS.md.
3. Method names describe user intent: `register(...)`, `publish()`,
   `assertArticleVisible(...)`. Not `clickButton()`, `getTitle()`.

---

## Anti-patterns the `agent:check` script will reject

These are the mistakes AI agents make most often. The check script runs in
pre-commit (mention to add a hook).

- `import .* from '@playwright/test'` inside `tests/` (bypasses fixtures).
- `Math.random()` for test data (use `uniqueToken()`).
- Hardcoded credentials like `email: "test@`, `password: "password"`.
- `waitForTimeout(` (flake source — use `waitFor`).
- `page.locator('.` (CSS class selector — use role/text). The two intentional
  exceptions (`.article-content` and `.error-messages`) are allow-listed in
  the rule itself.
- `Bearer ` in any auth header (RealWorld uses `Token <jwt>`).

Run `npm run agent:check` before you push.

---

## When in doubt

Read an existing test. The four shipped tests (`auth.spec.ts`,
`article-crud.spec.ts`, `favorite.spec.ts`, `publish-and-view.spec.ts`) are
the reference implementations for the patterns above. Mimic them, don't
invent new patterns without a reason.
