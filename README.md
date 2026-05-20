# Conduit QA Framework

An **agentic-first** Playwright + TypeScript test framework for the
[Conduit](https://github.com/cirosantilli/node-express-sequelize-realworld-example-app)
RealWorld example app.

"Agentic-first" means the framework is designed so an AI coding agent
(Claude Code, Copilot, Cursor, etc.) can drop in a new test, factory, or page
object and have it land in the right shape on the first try. The conventions
that make that work are codified in [AGENTS.md](./AGENTS.md), enforced by
[`scripts/agent-check.ts`](./scripts/agent-check.ts), and shortcut by
[`scripts/scaffold-test.ts`](./scripts/scaffold-test.ts).

For the architecture rationale, see [DECISIONS.md](./DECISIONS.md). For how
AI was actually used to build this framework — including the eight mistakes
the AI made that I caught (one of which surfaced a real bug in the Conduit
backend) — see [AI_USAGE.md](./AI_USAGE.md).

---

## Prerequisites

- **Node 18.17+** (the framework uses Playwright 1.45).
- **macOS, Linux, or Windows** — the framework is OS-agnostic. All `npm`
  scripts use cross-platform syntax (`cross-env` for env vars, forward-slash
  paths, no shell-specific commands). Tests use Node's `path.join` /
  `fs` rather than `bash` invocations.
- The Conduit app cloned and running locally:

  ```bash
  git clone https://github.com/cirosantilli/node-express-sequelize-realworld-example-app
  cd node-express-sequelize-realworld-example-app
  npm install && npm start
  # UI:  http://localhost:4101
  # API: http://localhost:3000/api
  ```

  Leave that process running in a separate terminal. The tests connect to it
  over HTTP — they do not start or seed it.

---

## Install & run

```bash
# 1. Install JS deps
npm install

# 2. Install the Playwright browser (chromium only — multi-browser is out of scope)
npx playwright install chromium

# 3. (Optional) Override the default ports.
# The defaults already point at UI=4101 / API=3000, so you only need this
# if the SUT is running on different ports. Copy .env.example to .env and
# edit. Use whatever copy command your shell supports:
#   bash/zsh:    cp .env.example .env
#   PowerShell:  Copy-Item .env.example .env
#   cmd.exe:     copy .env.example .env

# 4. Run everything
npm test

# Or one slice at a time
npm run test:api
npm run test:ui
npm run test:headed     # open the browser

# Open the last HTML report
npm run report
```

If a test fails, the JSON report at `test-results/results.json` is the
machine-readable artifact an AI agent can read to diagnose. The HTML report
is at `playwright-report/`.

---

## What's included

Seven spec files / nine test cases covering the critical flows the assignment
brief explicitly lists (user registration + auth, articles, comments, follows,
favourites):

| Spec | Layer | What it proves |
| --- | --- | --- |
| `tests/ui/auth.spec.ts` | UI | New user can register and sign in via the form. Invalid login surfaces `.error-messages`. |
| `tests/ui/publish-and-view.spec.ts` | UI | Logged-in user publishes an article through the editor, sees it on the article page and on the Global Feed tab on home. |
| `tests/api/article-crud.spec.ts` | API | Full create → read → update → delete cycle (with a poll workaround for the Conduit tag-attach race — see AI_USAGE.md #7). Author filter on list endpoint. |
| `tests/api/favorite.spec.ts` | API | A second user favorites + unfavorites an article. `favoritesCount` updates from 0 → 1 → 0. |
| `tests/api/comments.spec.ts` | API | Post a comment on an article, see it in the list, delete it, confirm it's gone. |
| `tests/api/follow.spec.ts` | API | User A follows + unfollows User B. `Profile.following` flips on read. |
| `tests/api/authorization.spec.ts` | API | User B gets `403` when trying to edit or delete User A's article — negative-auth coverage. |

---

## Repo layout

```
src/
  api/          ConduitApi (typed REST wrapper) + shared types
  factories/    Unique-payload builders for users and articles
  fixtures/     Playwright test extend — auth, auto-cleanup
  pages/        Page objects (role/text selectors)
  support/      seed (uniqueness) + logger (structured JSON)
tests/
  api/          article-crud, favorite, comments, follow, authorization
  ui/           auth (register + sign in, invalid login), publish-and-view
scripts/
  scaffold-test.ts   `npm run agent:scaffold <name> <ui|api>`
  agent-check.ts     `npm run agent:check`  — anti-pattern linter
AGENTS.md       Canonical guide for AI contributors
CLAUDE.md       Pointer to AGENTS.md
DECISIONS.md    Architecture decisions + rejected alternatives
AI_USAGE.md     How AI was used to build this framework
```

---

## Adding a test

```bash
npm run agent:scaffold delete-comment api
# → tests/api/delete-comment.spec.ts (with fixtures + factories pre-wired)
```

Fill in the TODOs, then:

```bash
npx playwright test tests/api/delete-comment.spec.ts
npm run agent:check
```

See [AGENTS.md](./AGENTS.md) for the full contract.

---

## Out of scope (per the assignment brief)

- CI/CD pipeline — see DECISIONS.md for what I'd add.
- Multi-browser support.
- Performance / load testing.
- Modifying the app under test.
- Full coverage of every endpoint.

---

## License

MIT.
