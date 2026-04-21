# Remove Firefox E2E Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Firefox from the Playwright E2E browser matrix and keep CI pipelines aligned so only Chromium and WebKit run.

**Architecture:** Add a small guard test that reads runtime Playwright config and CI config files to enforce the supported browser set. Then remove Firefox from Playwright CI projects and from GitHub Actions matrix, and make GitLab Playwright browser installation explicit for Chromium/WebKit only. This keeps behavior deterministic and prevents Firefox from being accidentally reintroduced.

**Tech Stack:** TypeScript, Vitest, Playwright, GitHub Actions, GitLab CI

---

## File Map

- Create: `ui/src/test/e2eBrowserMatrix.test.ts`  
  Purpose: Guard test that fails if `firefox` appears in Playwright CI projects or CI pipeline browser matrix/install commands.

- Modify: `ui/playwright.config.ts`  
  Purpose: Remove Firefox project from `projects` when `process.env.CI` is set.

- Modify: `.github/workflows/ui-ci.yml`  
  Purpose: Update E2E strategy matrix to run only `chromium` and `webkit`.

- Modify: `ui/.gitlab-ci.yml`  
  Purpose: Install only required browsers (`chromium webkit`) in E2E job.

- Optional Modify (if docs mention Firefox explicitly): `ui/README.md`  
  Purpose: Keep docs consistent with supported browser matrix.

---

### Task 1: Add Failing Guard Tests for Browser Matrix

**Files:**
- Create: `ui/src/test/e2eBrowserMatrix.test.ts`
- Test: `ui/src/test/e2eBrowserMatrix.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const uiRoot = path.resolve(__dirname, '..', '..');
const repoRoot = path.resolve(uiRoot, '..');

async function loadPlaywrightConfigForCi() {
  const previousCi = process.env.CI;
  process.env.CI = 'true';

  // Cache-busting query ensures the module re-evaluates with CI=true.
  const configModule = await import(`../../playwright.config.ts?ci=true&t=${Date.now()}`);

  if (previousCi === undefined) {
    delete process.env.CI;
  } else {
    process.env.CI = previousCi;
  }

  return configModule.default;
}

describe('E2E browser matrix guardrails', () => {
  it('Playwright CI projects should include only chromium and webkit', async () => {
    const config = await loadPlaywrightConfigForCi();
    const names = (config.projects ?? []).map((p: { name?: string }) => p.name);

    expect(names).toEqual(['chromium', 'webkit']);
    expect(names).not.toContain('firefox');
  });

  it('GitHub Actions matrix should not include firefox', () => {
    const workflow = readFileSync(path.join(repoRoot, '.github/workflows/ui-ci.yml'), 'utf-8');

    expect(workflow).toContain('browser: [chromium, webkit]');
    expect(workflow).not.toContain('firefox');
  });

  it('GitLab CI should install only chromium and webkit', () => {
    const gitlabCi = readFileSync(path.join(uiRoot, '.gitlab-ci.yml'), 'utf-8');

    expect(gitlabCi).toContain('npx playwright install --with-deps chromium webkit');
    expect(gitlabCi).not.toContain('npx playwright install --with-deps\n');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ui && npm test -- src/test/e2eBrowserMatrix.test.ts`

Expected: FAIL because current Playwright config and GitHub Actions matrix still include `firefox`, and GitLab install command is not browser-scoped.

- [ ] **Step 3: Commit failing-test scaffold**

```bash
git add ui/src/test/e2eBrowserMatrix.test.ts
git commit -m "test: add browser matrix guardrails for e2e"
```

---

### Task 2: Remove Firefox from Playwright CI Projects

**Files:**
- Modify: `ui/playwright.config.ts`
- Test: `ui/src/test/e2eBrowserMatrix.test.ts`

- [ ] **Step 1: Write minimal implementation in Playwright config**

```ts
  projects: process.env.CI
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
      ]
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ],
```

- [ ] **Step 2: Run guard test to verify this part is fixed**

Run: `cd ui && npm test -- src/test/e2eBrowserMatrix.test.ts`

Expected: Still FAIL, but only on CI file assertions (Playwright project assertion should pass).

- [ ] **Step 3: Verify runtime project listing explicitly**

Run: `cd ui && CI=true npm run e2e -- --list`

Expected output includes only projects:
- `chromium`
- `webkit`

Expected output does **not** include:
- `firefox`

- [ ] **Step 4: Commit Playwright config update**

```bash
git add ui/playwright.config.ts
git commit -m "test(e2e): drop firefox project from playwright ci matrix"
```

---

### Task 3: Align GitHub/GitLab CI to Chromium + WebKit

**Files:**
- Modify: `.github/workflows/ui-ci.yml`
- Modify: `ui/.gitlab-ci.yml`
- Test: `ui/src/test/e2eBrowserMatrix.test.ts`

- [ ] **Step 1: Update GitHub Actions browser matrix**

```yaml
strategy:
  fail-fast: false
  matrix:
    browser: [chromium, webkit]
```

- [ ] **Step 2: Update GitLab Playwright browser installation command**

```yaml
before_script:
  - cd ui
  - npx playwright install --with-deps chromium webkit
```

- [ ] **Step 3: Run guard test and confirm all assertions pass**

Run: `cd ui && npm test -- src/test/e2eBrowserMatrix.test.ts`

Expected: PASS (all tests in file).

- [ ] **Step 4: Run full UI quality gates**

Run: `cd ui && npm run lint`
Expected: PASS (0 errors)

Run: `cd ui && npm test`
Expected: PASS (existing unit tests + new guard test)

Run: `cd ui && npm run e2e`
Expected: PASS locally (chromium only by local config branch).

- [ ] **Step 5: Commit CI alignment**

```bash
git add .github/workflows/ui-ci.yml ui/.gitlab-ci.yml
git commit -m "ci(e2e): run chromium and webkit only"
```

---

### Task 4: Optional Documentation Consistency Pass

**Files:**
- Modify if needed: `ui/README.md`

- [ ] **Step 1: Check whether docs mention Firefox support**

Run: `cd ui && rg -n "firefox|webkit|chromium|browser" README.md`

Expected: If no Firefox mention exists, no code change needed.

- [ ] **Step 2: If Firefox is documented, update wording**

```md
CI E2E browser coverage: Chromium and WebKit.
```

- [ ] **Step 3: Commit docs only when changed**

```bash
git add ui/README.md
git commit -m "docs(e2e): update supported ci browsers"
```

---

## Self-Review

- **Spec coverage:**
  - Remove Firefox support from E2E: covered by Task 2 (`ui/playwright.config.ts`) and Task 3 (`.github/workflows/ui-ci.yml`, `ui/.gitlab-ci.yml`).
  - Keep CI green: covered by guard tests + full lint/unit/e2e verification in Task 3.

- **Placeholder scan:**
  - No TODO/TBD placeholders.
  - Every code-changing step includes concrete snippet.
  - Every verification step includes exact commands and expected outcomes.

- **Type consistency:**
  - Browser names are consistently `chromium` and `webkit` across config, CI, tests, and commands.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-12-remove-firefox-e2e-support.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?