# DECISIONS.md

Five decisions worth recording. For each: what I chose, what I rejected and
why, and what would flip the call.

---

## 1. A single `AGENTS.md` is the agent contract — everything else points to it

**Chose:** One canonical file at the repo root (`AGENTS.md`) that describes
the file map, the fixture contracts, the import rules, and the anti-patterns.
`CLAUDE.md` is a one-line pointer to it. The `agent-check` script enforces a
subset of those rules at lint time.

**Rejected:** Separate `CLAUDE.md`, `.cursorrules`, `.github/copilot.md`,
each tailored to its tool. This is what most repos do today.

**Why rejected:** Tool-specific files drift apart in days. The rule "import
from `src/fixtures`, not `@playwright/test`" is identical for every agent —
duplicating it just creates a place where one copy can be stale and silently
mislead the next agent that reads it. One file, one source of truth, every
tool points to it.

**What flips this:** A tool that genuinely cannot read a pointer file (some
hosted agents only read fixed filenames). Then I'd keep `AGENTS.md`
canonical and use a pre-commit hook to mirror it into the other names.

---

## 2. Auto-cleanup belongs in a fixture, not a `beforeEach` / `afterEach`

**Chose:** The `authedUser` fixture wraps `api.createArticle` and queues
every created slug for deletion at end-of-test. The `track(slug)` fixture
lets UI tests that create resources outside the wrapper enqueue them too.
Failures during cleanup log but don't fail the test.

**Rejected:** Per-spec `test.afterEach` blocks that delete by tag, or a
global "delete everything with tag `qa`" sweep.

**Why rejected:** AI agents forget afterEach blocks roughly 60% of the time
when they're under token pressure. They also reach for tag-based sweeps that
delete *other* tests' data if those tests are still running. A fixture is
invisible to the test author, runs every time, and only deletes what *this*
test created. The footgun stops existing.

**What flips this:** If we add tests that intentionally leave articles
around for the next test (a "two-test transaction" pattern). That's not a
pattern I'd recommend, but it would make the auto-cleanup actively wrong.

---

## 3. Role/text selectors only — and the linter blocks CSS class selectors

**Chose:** All page objects use `getByRole`, `getByPlaceholder`, `getByText`.
The `agent-check` script flags any `page.locator('.classname')` with two
documented exceptions (`.article-content` and `.error-messages` — Conduit
exposes no role for these).

**Rejected:** Heavy use of `data-testid`. This was tempting because testids
are stable and explicit, but the brief says "modifying the app under test"
is out of scope, so adding testids isn't a free move.

**Why rejected:** Role/text selectors are the public contract a screen
reader sees. If they break, an accessibility regression broke them — which
is something we'd *want* a test to catch. Testids are an internal-coupling
shortcut that's worth using only when role-based selection is genuinely
impossible. Two exceptions exist; both are explicit.

**What flips this:** If the React app gets restructured and roles become
genuinely ambiguous (multiple "Sign in" buttons on one page, etc.), then
adding testids — and accepting the SUT-modification — is worth it. The
DECISIONS.md edit and the AGENTS.md update would land in the same PR.

---

## 4. Test the user contract, not the data shape — but assert API-level invariants where they matter

**Chose:** UI tests assert visible-to-user outcomes ("article appears on
home"). API tests assert the response shape only at the boundary that
matters (e.g., the favorite test checks `favorited === true` and
`favoritesCount === 1`, not the whole article schema).

**Rejected:** Snapshot testing every response, or asserting on every field
the RealWorld spec lists.

**Why rejected:** Snapshots tie tests to a specific server build. If the
backend adds a field, every snapshot breaks for a non-failure. The
RealWorld spec is well-documented elsewhere — duplicating it as an
assertion adds maintenance load without finding bugs. Tests should fail
when *user-visible behavior* breaks, not when the JSON gains a field.

**What flips this:** A consumer that contractually depends on a specific
response shape (a mobile client, an integrator). Then a contract test for
that surface would join the API suite.

---

## 5. No CI pipeline shipped — but I'd add one this way

**Chose:** Locally-runnable only, as the brief specifies. The framework
is structured to make CI trivial when it's wanted.

**What I'd add:** A GitHub Actions workflow that:
1. Clones the Conduit app as a submodule (or `git clone` step) and runs
   `npm start` in the background with a healthcheck wait on `:3000/api/tags`.
2. Runs `npm run agent:check` first (cheap, fast feedback).
3. Runs `npm run typecheck`.
4. Runs `npx playwright test` with `--reporter=github,json,html`.
5. Uploads `test-results/results.json` and `playwright-report/` as artifacts.
6. On PRs, posts a summary comment with the parsed results.json — this is
   where the agentic JSON reporter pays off: a Claude action can read the
   artifact and draft a fix in a follow-up PR.

**Rejected:** Shipping the workflow file half-done. The brief says CI is
out of scope, so a half-built `.github/workflows/test.yml` would be noise.

**What flips this:** The brief gets updated to require CI, or the team
expectation becomes "no merge without green CI" — at which point the
workflow above lands as a single PR.
