// Takes screenshots of the running dev app (default http://localhost:5173) and reports
// browser console errors. Used to check UI changes and to produce README screenshots.
//
// Usage:
//   node scripts/screenshot.mjs                       # all tabs, desktop
//   node scripts/screenshot.mjs --tab main --mobile   # one tab, phone viewport
//   node scripts/screenshot.mjs --out ./shots --theme light --full
//   node scripts/screenshot.mjs --now 2026-10-14T17:30:00Z --timezone UTC --format webp
//
// --now freezes the browser clock and animations (the backend needs FAKE_NOW with the same
// value, see scripts/docs-screenshots.mjs). --format webp is much smaller than png.
// --fonts <dir> adds font files (e.g. Segoe UI and Consolas copied from Windows) for Chromium:
// the app uses system fonts, and a Linux container would otherwise fall back to other ones.
//
// Exit code 1 if any page logged a console error or threw.

import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";

const { values: args } = parseArgs({
  options: {
    tab: { type: "string", multiple: true },
    mobile: { type: "boolean", default: false },
    theme: { type: "string", default: "dark" },
    full: { type: "boolean", default: false },
    out: { type: "string", default: "screenshots" },
    url: { type: "string", default: "http://localhost:5173" },
    now: { type: "string" },
    timezone: { type: "string" },
    format: { type: "string", default: "png" },
    fonts: { type: "string" },
  },
});

// A fontconfig file that adds `dir` and prefers its fonts for the generic families, as the
// browsers on Windows/macOS do (Chrome's "monospace" is Consolas on Windows).
function fontEnv(dir) {
  if (!dir) return {};
  const tmp = mkdtempSync(join(tmpdir(), "hhs-fonts-"));
  // Chromium prefers the system's emoji font, so hide it when the folder brings its own.
  const ownEmoji = readdirSync(dir).some((f) => /emj|emoji/i.test(f));
  const prefer = (generic, families) =>
    `<alias binding="strong"><family>${generic}</family><prefer>` +
    families.map((f) => `<family>${f}</family>`).join("") +
    `</prefer></alias>`;
  const conf = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>
  <dir>${resolve(dir)}</dir>
  <cachedir>${tmp}/cache</cachedir>
  ${prefer("sans-serif", ["Segoe UI", "SF Pro Text"])}
  ${prefer("monospace", ["Consolas", "SF Mono", "Menlo"])}
  ${prefer("emoji", ["Segoe UI Emoji", "Apple Color Emoji"])}
  ${ownEmoji ? "<selectfont><rejectfont><glob>*NotoColorEmoji*</glob></rejectfont></selectfont>" : ""}
</fontconfig>`;
  writeFileSync(join(tmp, "fonts.conf"), conf);
  return { FONTCONFIG_FILE: join(tmp, "fonts.conf") };
}

const outDir = resolve(args.out);
mkdirSync(outDir, { recursive: true });

const viewport = args.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const browser = await chromium.launch({ env: { ...process.env, ...fontEnv(args.fonts) } });
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: 2,
  colorScheme: args.theme === "light" ? "light" : "dark",
  timezoneId: args.timezone,
  reducedMotion: args.now ? "reduce" : "no-preference", // Recharts then skips its animations
});
if (args.now) await context.clock.setFixedTime(new Date(args.now));
// The theme toggle stores its choice in localStorage (see ThemeToggle.tsx).
await context.addInitScript((theme) => localStorage.setItem("pd-theme", theme), args.theme);

const page = await context.newPage();

// Chromium has no WebP screenshots, so a blank page re-encodes the PNG through a canvas.
/* global Image, document -- used inside the page */
const converter = args.format === "webp" ? await browser.newPage() : null;
async function encode(png) {
  if (!converter) return png;
  const webp = await converter.evaluate(async (base64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext("2d").drawImage(img, 0, 0);
    return canvas.toDataURL("image/webp", 0.9).split(",")[1];
  }, png.toString("base64"));
  return Buffer.from(webp, "base64");
}
const errors = [];
page.on("console", (msg) => {
  // Failed requests are reported with their URL below instead.
  if (msg.type() === "error" && !msg.text().startsWith("Failed to load resource"))
    errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(err.message));
page.on("response", (res) => {
  if (res.status() >= 400) errors.push(`HTTP ${res.status()} ${new URL(res.url()).pathname}`);
});

await page.goto(args.url, { waitUntil: "networkidle" });

// Default: every tab the app renders (registry in src/features.ts), in navigation order.
const tabs =
  args.tab ??
  (await page.$$eval("[data-tab]", (els) => [
    ...new Set(els.map((el) => el.getAttribute("data-tab")).filter((id) => id !== "more")),
  ]));

for (const tab of tabs) {
  const button = page.locator(`[data-tab="${tab}"]:visible`);
  if (args.mobile && (await button.count()) === 0) {
    await page.locator('[data-tab="more"]').click();
  }
  await page.locator(`[data-tab="${tab}"]:visible`).first().click();
  await page.waitForLoadState("networkidle");
  await page.mouse.move(0, 0); // no hover effects on the clicked button
  await page.waitForTimeout(600); // let charts and animations settle

  const name = `${tab}-${args.mobile ? "mobile" : "desktop"}-${args.theme}.${args.format}`;
  const file = join(outDir, name);
  // With a frozen clock, also stop CSS animations so repeated runs give the same images.
  const animations = args.now ? "disabled" : "allow";
  writeFileSync(file, await encode(await page.screenshot({ fullPage: args.full, animations })));
  console.log(file);
}

await browser.close();

if (errors.length) {
  console.error(`\n${errors.length} console error(s):`);
  for (const e of [...new Set(errors)]) console.error(`- ${e}`);
  process.exit(1);
}
