#!/usr/bin/env ts-node
/**
 * scaffold-test.ts — generate a fresh spec file from a template.
 *
 * Usage:
 *   npm run agent:scaffold <name> <ui|api>
 *
 * Example:
 *   npm run agent:scaffold delete-comment api
 *   → creates tests/api/delete-comment.spec.ts
 *
 * Why this exists:
 *   AI agents reliably re-derive the import paths, the fixture usage, and
 *   the boilerplate from scratch — and they reliably get one or two of those
 *   wrong (missing fixture import, missing cleanup, wrong auth header).
 *   A scaffold script makes the right starting point the default.
 */

import * as fs from 'fs';
import * as path from 'path';

const [, , rawName, rawKind] = process.argv;

if (!rawName || !rawKind) {
  console.error('Usage: npm run agent:scaffold <name> <ui|api>');
  process.exit(2);
}

const kind = rawKind.toLowerCase();
if (kind !== 'ui' && kind !== 'api') {
  console.error(`Unknown kind "${rawKind}". Must be "ui" or "api".`);
  process.exit(2);
}

const name = rawName
  .replace(/[^a-zA-Z0-9-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .toLowerCase();

const filePath = path.join('tests', kind, `${name}.spec.ts`);

if (fs.existsSync(filePath)) {
  console.error(`File already exists: ${filePath}`);
  process.exit(1);
}

const apiTemplate = `import { test, expect } from '../../src/fixtures';
import { articleFactory } from '../../src/factories/article';

/**
 * TODO: one-line description of what this test proves.
 *
 * Uses the \`authedUser\` fixture — articles created via authedUser.api.createArticle
 * are auto-cleaned up. See AGENTS.md.
 */
test.describe('${name} — API', () => {
  test('TODO: rename me', async ({ authedUser }) => {
    const { api } = authedUser;

    const article = await api.createArticle(articleFactory.build());
    expect(article.slug).toBeTruthy();

    // TODO: your assertions here.
  });
});
`;

const uiTemplate = `import { test, expect } from '../../src/fixtures';
import { LoginPage } from '../../src/pages/LoginPage';
import { userFactory } from '../../src/factories/user';

/**
 * TODO: one-line description of what this test proves.
 *
 * Pattern: API setup, UI assert. We register via api.register() so we don't
 * waste time on a UI sign-up unless registration is what's under test.
 */
test('${name}: TODO rename me', async ({ api, page }) => {
  const creds = userFactory.build();
  await api.register(creds);

  const login = new LoginPage(page);
  await login.open();
  await login.login(creds.email, creds.password);
  await page.waitForURL((url) => url.pathname === '/');

  // TODO: drive the UI and assert.
  expect(true).toBe(true);
});
`;

const template = kind === 'ui' ? uiTemplate : apiTemplate;

fs.mkdirSync(path.dirname(filePath), { recursive: true });
fs.writeFileSync(filePath, template, 'utf8');

console.log(`Created ${filePath}`);
console.log('Next: open the file, replace the TODOs, and run');
console.log(`  npx playwright test ${filePath}`);
