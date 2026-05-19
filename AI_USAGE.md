# AI_USAGE.md

How AI was actually used to build this framework. The brief asks for specific
prompts, specific responses, and at least one example where the AI got
something wrong and I caught it. The mistakes are at the end — they're the
most useful part.

## Tools

- **Claude (Sonnet)** for the bulk of code generation and the docs.
- **My own eyes and `npx playwright test`** for verification. The mistakes
  the AI made would have shipped if I'd trusted the first output.

---

## What I asked for, in order

### 1. Read the assignment and scope the framework

> Prompt: "Read `Anshul_assignment.pdf` and summarize what the framework
> needs. List the must-haves, the in-scope items, and the explicit
> out-of-scope items so I know what NOT to build."

What I got back: an accurate summary — Playwright + TS, 3–5 tests with at
least one API and one UI, `DECISIONS.md` + `AI_USAGE.md` + README, no CI,
no multi-browser, no SUT modification. Useful as a checklist; I worked from
it throughout.

### 2. Look at the SUT's package.json and the React components for selector planning

> Prompt: "Open `react-redux-realworld-example-app/package.json` and the
> Login, Register, Editor, and Header components. I want to know what the
> actual form fields look like — placeholder text, button text — before I
> write any page objects."

This was a deliberate guard against the most common AI selector failure:
the agent invents what the form *probably* looks like and writes selectors
against an imagined DOM. By making it open the real files first, the
selectors in `src/pages/*.ts` are grounded in actual JSX. (See "Mistakes"
below for what happens when I forgot to do this on a different file.)

### 3. Generate the API client

> Prompt: "Write a `ConduitApi` class that wraps the RealWorld endpoints we
> need: register, login, current user, article CRUD, favorite/unfavorite,
> comments, profile. Each method must (a) return the unwrapped domain
> object, (b) assert success with an error message that prints the response
> body, (c) use `Authorization: Token <jwt>` because that's what Conduit's
> Passport middleware expects. Use Playwright's `request.newContext`."

Output was used roughly as-is. Two things I changed by hand: I added the
`raw()` escape hatch so tests can inspect a deliberate 404 without
tripping `expect.toBeOK()`, and I renamed `auth` → `token` parameter
because "auth" was ambiguous with the Express `auth` module name.

### 4. Generate the fixtures

> Prompt: "Build a Playwright fixture extend with: `api` (anonymous client),
> `authedUser` (registers a fresh user and returns `{ user, api }` where
> `api.createArticle` is auto-tracked for cleanup), and `track(slug)` for
> articles created outside that wrapper. Cleanup failures should log but
> not fail the test."

The first version it produced used `globalThis.__trackedSlugs` to share
the slug list between `track` and `authedUser`. That's the kind of code
that works on a single test in isolation and corrupts state the moment
two tests run in the same worker. I caught it on review — see Mistake #1.

### 5. Generate the page objects

> Prompt: "Now write page objects for Register, Login, Editor, Article,
> Home. Use only `getByRole`, `getByPlaceholder`, `getByText`. No CSS
> selectors except the two cases where Conduit exposes no role:
> `.article-content` for body text and `.error-messages` for validation."

Used the components I'd already read in step 2 to ground the selectors.

### 6. Generate the four tests

> Prompt: "Write the four tests for auth UI, article CRUD API, favorite
> API, and publish-and-view UI. Each test should be short — the framework
> does the work. Use the `API setup, UI assert` pattern in the
> publish-and-view test rather than re-doing the registration form."

Used roughly as-is.

### 7. Write the docs

> Prompt: "Now write AGENTS.md, DECISIONS.md, and AI_USAGE.md. AGENTS.md
> should be the contract — what's enforced, where to find things, the five
> non-negotiable rules. DECISIONS.md should have exactly five decisions,
> each with chosen / rejected / what-would-flip-it. AI_USAGE.md is what
> you're reading."

---

## Mistakes the AI made that I caught

### Mistake #1: `globalThis` between fixtures

**What it produced:**

```ts
track: async ({}, use) => {
  const slugs: string[] = [];
  await use((slug) => slugs.push(slug));
  (globalThis as any).__trackedSlugs = slugs;
},

authedUser: async ({ track }, use) => {
  // ...
  const slugs = (globalThis as any).__trackedSlugs ?? [];
  for (const slug of slugs) await api.deleteArticle(slug);
},
```

**Why it's wrong:** Playwright runs tests serially within a worker but
fixtures from *different tests* share the worker process. Stashing state
on `globalThis` means test A's cleanup list bleeds into test B's
`authedUser` setup if the fixture order trips. Even worse: when test B
finishes, its cleanup walks test A's leftover slugs, double-deleting and
spamming `cleanup.failed` logs.

**How I caught it:** I noticed `track` had no return value and `authedUser`
was reading from `globalThis` — that's a classic shared-state smell. I
asked: "If two tests run back-to-back in the same worker, does the second
test's `authedUser` see the first test's slugs?" The answer was yes, and
I rewrote it to use a proper `tracked` fixture that both `track` and
`authedUser` depend on. Now Playwright's fixture scoping handles the
isolation for free.

**The fix is in `src/fixtures/index.ts`** — the `tracked` fixture lives
between the two consumers and is scoped per-test.

### Mistake #2: Bearer header in the first draft of the API client

**What it produced:**

```ts
extraHTTPHeaders: {
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
},
```

**Why it's wrong:** RealWorld's spec — and the Conduit Passport JWT
strategy specifically — expects `Authorization: Token <jwt>`. A Bearer
header is silently rejected as anonymous, which means tests fail
mysteriously with 401s on endpoints the user is supposed to have access
to.

**How I caught it:** I already had `react-redux-realworld-example-app/src/agent.js`
open from step 2 of the planning phase, and I noticed it does
`req.set('authorization', \`Token ${token}\`)`. Cross-checked, found the
mismatch, fixed it. This is why I included an `agent-check` rule that
flags `Bearer` headers — to make sure no future agent reintroduces it.

### Mistake #3: Dead `track(slug)` call in the UI publish test

**What it produced:** The first version of `tests/ui/publish-and-view.spec.ts`
depended on `api`, `track`, and `page` — but not on `authedUser`. The test
called `track(articlePage.currentSlug())` and then performed cleanup with an
inline `await import('../../src/api/client')` and a manual login/delete.

**Why it's wrong:** The framework's cleanup teardown lives in the
`authedUser` fixture. A test that calls `track()` without depending on
`authedUser` queues slugs that nothing ever drains — the cleanup is
silently a no-op. The inline cleanup at the bottom of the test masked
the issue because *that* path did delete, but it duplicated logic the
framework already knows how to do, and a future agent copying this test
as a template would carry the dead `track()` call forward.

**How I caught it:** When I went to hand-run the `agent-check` rules
against my own code, I started reading every test slowly and asked
"what does `track(slug)` actually do here?" Traced through fixtures,
saw that cleanup only happens in `authedUser`'s teardown, realised this
test doesn't use that fixture. Fixed two things:
- Added `password` to the `authedUser` fixture return so a UI test can
  log in via the form with the fixture's user.
- Rewrote the publish test to depend on `authedUser`, do its login via
  the UI, and rely on the fixture for cleanup. The dead `track()` is
  now a *real* `track()`.

### Mistake #4: Missing `await` on `expect(response).toBeOK()` across every API method

**What it produced:** The first version of `src/api/client.ts` had eight call
sites like this:

```ts
async register(user: NewUser): Promise<User> {
  const res = await this.ctx.post('/api/users', { data: { user } });
  expect(res, `POST /users failed: ${await safeBody(res)}`).toBeOK();
  return ((await res.json()) as UserResponse).user;
}
```

**Why it's wrong:** `APIResponseAssertions.toBeOK()` is async — it returns a
`Promise<void>`. Without `await`, an HTTP 422 doesn't throw inline; the
rejection is left dangling, the method proceeds to `res.json()`, and the
test eventually fails with a confusing `Cannot read property 'user' of
undefined` instead of the carefully crafted `"POST /users failed: ..."`
message I wrote into the assertion. The whole point of the descriptive
message — that future agents reading a failed CI log can see what broke
without digging — is defeated.

**How I caught it:** During the final pre-push audit, when the user asked
"check if the md files and code is written properly." I re-read every file
slowly. When I got to `client.ts` I asked myself whether `toBeOK()` was
sync or async, checked Playwright's docs, and confirmed it's documented
as `await expect(response).toBeOK()`. Added `await` to all 8 call sites.

This is the most embarrassing mistake of the four because the code looked
clean — descriptive error messages, typed returns, `expect` with a
contextual message — but the single missing keyword would have silently
hidden every API error.

### Mistake #5: Asserting the slug stayed identical after an update

**What it produced:** A line in `article-crud.spec.ts` that did
`expect(updated.slug).toBe(created.slug)` after a title change.

**Why it's wrong:** The RealWorld spec is ambiguous on whether slug
regenerates on title update, and different implementations do different
things. Conduit specifically slugifies on create and *doesn't* regen on
update — but that's not behavior I want a test to lock in. A future
backend swap could be correct *and* break this assertion.

**How I caught it:** I asked myself: "If someone replaced the backend
with a different RealWorld implementation, would this assertion be
about a bug or about an implementation detail?" Implementation detail.
I replaced it with `expect(await api.getArticle(updated.slug)).toBeDefined()`
— same coverage of "the article is still reachable", no coupling to
slug-regen policy.

---

## What I learned

The agent gets selectors, types, and boilerplate right when it's grounded
in the actual SUT files. It gets them wrong when it's left to imagine
what's probably there. The single biggest lever in this whole build was
asking it to **read the real React components and the real Express
routes before writing any code that depended on them**. That's also the
core argument for the `AGENTS.md` and the `agent-check` script: make the
right answer the easy one, and the agent gets there on the first try.
