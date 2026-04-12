import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uiRoot = path.resolve(__dirname, "..", "..");
const repoRoot = path.resolve(uiRoot, "..");

describe("E2E browser matrix guardrails", () => {
  it("Playwright CI projects should include only chromium and webkit", async () => {
    const previousCi = process.env.CI;
    process.env.CI = "true";

    try {
      const configModule = await import("../../playwright.config.ts?ci=true");
      const config = configModule.default;
      const names = (config.projects ?? []).map((project: { name?: string }) => project.name);

      expect(names).toEqual(["chromium", "webkit"]);
      expect(names).not.toContain("firefox");
    } finally {
      if (previousCi === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = previousCi;
      }
    }
  });

  it("GitHub Actions matrix should not include firefox", () => {
    const workflow = readFileSync(path.join(repoRoot, ".github/workflows/ui-ci.yml"), "utf-8");
    const browserMatrixPattern = /browser:\s*\[\s*(?:chromium\s*,\s*webkit|webkit\s*,\s*chromium)\s*\]/m;

    expect(workflow).toMatch(browserMatrixPattern);
    expect(workflow).not.toMatch(/\bfirefox\b/);
  });

  it("GitLab CI should install only chromium and webkit", () => {
    const gitlabCi = readFileSync(path.join(uiRoot, ".gitlab-ci.yml"), "utf-8");
    const installLines = gitlabCi
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^(?:-\s*)?(?:npx|npm\s+exec)\s+playwright\s+install\b/.test(line));
    const installedBrowsers = new Set(
      installLines
        .flatMap((line) => {
          const normalized = line.replace(/^-\s*/, "");
          const tokens = normalized.split(/\s+/);
          const installIndex = tokens.findIndex((token) => token === "install");

          return installIndex >= 0 ? tokens.slice(installIndex + 1) : [];
        })
        .filter((token) => token.length > 0 && !token.startsWith("-")),
    );

    expect(installLines.length).toBeGreaterThan(0);
    expect(installedBrowsers).toContain("chromium");
    expect(installedBrowsers).toContain("webkit");
    expect(installedBrowsers).not.toContain("firefox");
  });
});