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
AI was actually used to build this framework — including a mistake the AI
made that I caught — see [AI_USAGE.md](./AI_USAGE.md).

---

## Prerequisites

- **Node 18.17+** (the framework uses Playwright 1.45).
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

# 3. (Optional) Copy the env file. Defaults already point at 4101 / 3000.
cp .env.example .env

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

Four tests covering critical flows across UI and API:

| Test | Layer | What it proves |
| --- | --- | --- |
| `tests/ui/auth.spec.ts` | UI | A new user can register, log out, and log back in via the form. A duplicate email surfaces a validation error. |
| `tests/api/article-crud.spec.ts` | API | Full create → read → update → delete cycle. Author filter on list endpoint works. |
| `tests/api/favorite.spec.ts` | API | A second user can favorite and unfavorite an article. The count updates. |
| `tests/ui/publish-and-view.spec.ts` | UI | A logged-in user can publish an article through the editor and it renders on the article page and home feed. |

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
  api/          Article CRUD + favorite tests
  ui/           Auth + publish-and-view tests
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
