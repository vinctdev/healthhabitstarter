// Regenerates the screenshots in docs/images/screenshots from a throwaway demo instance, so they
// look the same on every run: fresh SQLite database with demo data, demo health provider and a
// frozen clock in both the backend (FAKE_NOW) and the browser (--now).
//
// Usage (needs the backend venv and Playwright's Chromium, nothing else may use ports 8001/5174):
//   npm run screenshots:docs
//
// The running dev servers and backend/dev.db are not touched.
//
// Fonts: the app uses the viewer's system fonts. Put the font files of the system the
// screenshots should look like into frontend/screenshot-fonts/ (gitignored, such fonts are
// usually not redistributable), e.g. from C:\Windows\Fonts: segoeui*.ttf, seguisb.ttf,
// consola*.ttf and seguiemj.ttf. Without them, Chromium uses whatever fonts the machine has.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "vite";

const NOW = "2026-09-02T17:30:00Z"; // a Wednesday afternoon (the date also picks the quote)
const TIMEZONE = "UTC";
const BACKEND_PORT = 8001;
const FRONTEND_PORT = 5174;

const frontendDir = resolve(import.meta.dirname, "..");
const backendDir = resolve(frontendDir, "../backend");
const outDir = resolve(frontendDir, "../docs/images/screenshots");
const python = join(backendDir, ".venv/bin/python");
const fontsDir = join(frontendDir, "screenshot-fonts");
const hasFonts =
  existsSync(fontsDir) && readdirSync(fontsDir).some((f) => /\.(ttf|otf|ttc)$/i.test(f));

// Which screenshots to take: arguments for scripts/screenshot.mjs.
const SHOTS = [
  ["--theme", "dark"],
  ["--theme", "light"],
  ["--theme", "dark", "--mobile", "--tab", "main"],
  ["--theme", "light", "--mobile", "--tab", "main"],
];

const tmp = mkdtempSync(join(tmpdir(), "hhs-docs-"));
const env = {
  ...process.env,
  DB_URL: `sqlite:///${tmp}/docs.db`,
  HEALTH_PROVIDER: "demo",
  TZ: TIMEZONE,
  FAKE_NOW: NOW,
  ENVIRONMENT: "development",
  // Placeholder so the AI buttons are not greyed out. Nothing calls Gemini during screenshots.
  GEMINI_API_KEY: "docs-screenshots",
};

// Async on purpose: Vite runs in this process and must keep serving while screenshots are taken.
function run(cmd, args, options) {
  return new Promise((done, fail) => {
    spawn(cmd, args, { stdio: "inherit", ...options }).on("exit", (code) =>
      code === 0 ? done() : fail(new Error(`${cmd} ${args.join(" ")} failed`)),
    );
  });
}

async function waitFor(url) {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${url} did not come up`);
}

let backend;
let vite;
try {
  await run(python, ["-m", "alembic", "upgrade", "head"], { cwd: backendDir, env });
  await run(python, ["-m", "app.demo_seed", "--reset"], { cwd: backendDir, env });

  backend = spawn(
    python,
    ["-m", "uvicorn", "app.main:app", "--port", String(BACKEND_PORT), "--log-level", "warning"],
    { cwd: backendDir, env, stdio: "inherit" },
  );
  await waitFor(`http://localhost:${BACKEND_PORT}/api/health`);

  // Same config as `npm run dev`, only the port and the proxy target differ.
  vite = await createServer({
    root: frontendDir,
    logLevel: "warn",
    server: {
      port: FRONTEND_PORT,
      strictPort: true,
      proxy: { "/api": { target: `http://localhost:${BACKEND_PORT}` } },
    },
  });
  await vite.listen();

  if (!hasFonts) console.warn("No fonts in frontend/screenshot-fonts/, using the system's fonts.");
  rmSync(outDir, { recursive: true, force: true });
  for (const shot of SHOTS) {
    await run(
      process.execPath,
      [
        "scripts/screenshot.mjs",
        ...["--url", `http://localhost:${FRONTEND_PORT}`, "--out", outDir],
        ...["--now", NOW, "--timezone", TIMEZONE, "--format", "webp"],
        ...(hasFonts ? ["--fonts", fontsDir] : []),
        ...shot,
      ],
      { cwd: frontendDir },
    );
  }
} finally {
  await vite?.close();
  backend?.kill();
  rmSync(tmp, { recursive: true, force: true });
}
