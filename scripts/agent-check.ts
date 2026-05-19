#!/usr/bin/env ts-node
/**
 * agent-check.ts — flag common AI-generated test anti-patterns.
 *
 * Usage:
 *   npm run agent:check
 *
 * Exits non-zero if any rule is violated. The rules mirror AGENTS.md so a
 * contributor (human or AI) can run this before pushing and get the same
 * verdict CI would.
 *
 * This is intentionally simple — regex over .ts files in tests/ and src/.
 * A full ESLint plugin would be a nicer home for these rules, but a single
 * file ts-node script is easier for an agent to read and extend.
 */

import * as fs from 'fs';
import * as path from 'path';

type Rule = {
  id: string;
  description: string;
  pattern: RegExp;
  scope: 'tests' | 'all';
  /** Optional: skip rule if the file matches this. */
  allowIn?: RegExp;
};

const RULES: Rule[] = [
  {
    id: 'no-direct-playwright-import',
    description:
      'Tests must import test/expect from src/fixtures, not @playwright/test directly. Importing directly skips the auto-cleanup fixture.',
    pattern: /from\s+['"]@playwright\/test['"]/,
    scope: 'tests',
  },
  {
    id: 'no-math-random',
    description:
      'Use uniqueToken() from src/support/seed. Math.random() makes failures non-reproducible.',
    pattern: /Math\.random\s*\(/,
    scope: 'all',
    allowIn: /scripts\/agent-check\.ts$/,
  },
  {
    id: 'no-wait-for-timeout',
    description:
      'page.waitForTimeout is a flake source. Wait for a condition (waitFor / waitForURL / expect.toBeVisible).',
    pattern: /waitForTimeout\s*\(/,
    scope: 'all',
  },
  {
    id: 'no-css-class-selectors',
    description:
      'Use getByRole / getByText / getByPlaceholder. CSS class selectors break on UI churn.',
    // Match page.locator('.foo') but not .article-content / .error-messages
    // — those two are intentional exceptions used by the shipped page objects
    // because Conduit exposes no role for them.
    pattern: /\.locator\(\s*['"]\.(?!article-content|error-messages)/,
    scope: 'all',
  },
  {
    id: 'no-bearer-auth',
    description:
      'Conduit uses `Authorization: Token <jwt>`, not Bearer. Bearer headers silently 401.',
    pattern: /Bearer\s+\$?\{?token/,
    scope: 'all',
  },
  {
    id: 'no-hardcoded-test-email',
    description:
      'Hard-coded test emails like "test@" or "alice@example.com" collide with parallel runs. Use userFactory.build().',
    pattern: /['"](test|alice|bob|user)[\w.+-]*@/i,
    scope: 'tests',
  },
];

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && full.endsWith('.ts')) out.push(full);
  }
  return out;
}

const testFiles = walk('tests');
const srcFiles = walk('src');
const scriptFiles = walk('scripts');
const allFiles = [...testFiles, ...srcFiles, ...scriptFiles];

let failures = 0;

for (const rule of RULES) {
  const files = rule.scope === 'tests' ? testFiles : allFiles;
  for (const file of files) {
    if (rule.allowIn && rule.allowIn.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      // Skip comment lines so the rule-description regexes in this very file
      // don't trigger themselves.
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      if (rule.pattern.test(line)) {
        failures += 1;
        console.error(
          `[${rule.id}] ${file}:${i + 1}\n    ${line.trim()}\n    → ${rule.description}\n`,
        );
      }
    });
  }
}

if (failures > 0) {
  console.error(`\nagent:check found ${failures} issue(s). See AGENTS.md.`);
  process.exit(1);
}

console.log('agent:check passed. No anti-patterns found.');
