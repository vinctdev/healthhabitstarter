type FontRole = "sans" | "mono";

/*
 * Semantic font assignment of the design: the SINGLE source of truth.
 *
 * Decision table:
 *   input[type=number|time]                        → Mono
 *   other input, textarea, select                  → Sans
 *   th (column label = language)                   → Sans
 *   Eyebrow (letter spacing + UPPERCASE)           → Mono
 *   Content = date/time/fraction/number+unit       → Mono
 *   otherwise                                      → Sans
 *   elements not covered                           → Sans (body default)
 *
 * Elements without .font-mono that are not in the table stay Sans.
 */

const MONO_INPUT_TYPES = new Set(["number", "time"]);

const UNIT_WORDS = new Set([
  "kcal",
  "kj",
  "g",
  "kg",
  "mg",
  "ml",
  "l",
  "cl",
  "km",
  "cm",
  "mm",
  "m",
  "h",
  "min",
  "s",
  "bpm",
  "hz",
  "p",
  "x",
  "d",
  "hr",
  "hrs",
  "day",
  "days",
]);

const DATE_PATTERNS = [
  /\b\d{1,2}:\d{2}\b/,
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s\d{1,2}\b/,
  /\b\d{4}-\d{2}-\d{2}\b/,
  /\b\d{1,2}\/\d{1,2}\b/,
];

/*
 * Exceptions to the decision table: areas that intentionally always stay
 * Mono (no switch to Sans, hence no size compensation either).
 */
function keepMono(el: HTMLElement): boolean {
  // Explicit exception: placeholders without digits (e.g. "- g") should
  // still use the data font.
  if (el.dataset.typoMono === "true") return true;
  // Main tab: goal ticker right below "My Dashboard"
  // (daily goals fade in one after another).
  if (el.closest('[aria-live="polite"]')) return true;
  // Performance tab: status line "Health API: connected/disconnected".
  const text = (el.textContent ?? "").trim();
  return text.startsWith("Health API:");
}

function isEyebrow(el: Element): boolean {
  // Letter spacing signals an eyebrow (negative spacing "tracking-tight" does not count).
  const hasTracking = Array.from(el.classList).some(
    (cls) => cls.startsWith("tracking-") && cls !== "tracking-tight",
  );
  if (!hasTracking) return false;
  if (el.classList.contains("uppercase")) return true;
  // Hard-coded uppercase labels (e.g. "GOALS") without the uppercase class.
  const text = (el.textContent ?? "").trim();
  return text.length > 0 && text === text.toUpperCase() && /[A-ZÄÖÜ]/.test(text);
}

function looksLikeData(text: string): boolean {
  if (!text) return false;
  if (DATE_PATTERNS.some((re) => re.test(text))) return true;
  // Fractions/ratios like "62.2/30" or "24.8/10" (peak tracker signals).
  if (/\d+(?:[.,]\d+)?\/\d+/.test(text)) return true;
  if (!/\d/.test(text)) return false;
  const letters = text.replace(/[^A-Za-zÄÖÜäöüß]/g, "");
  if (letters.length <= 4) return true;
  const tokens = text
    .toLowerCase()
    .split(/[^a-zäöüß]+/)
    .filter(Boolean);
  // "Generous mono": as soon as a unit appears, the line counts as data
  // (e.g. "350 kcal left" or "avg pace 5:46 min/km over 22 runs").
  return tokens.some((token) => UNIT_WORDS.has(token));
}

function decide(el: HTMLElement): FontRole | null {
  const tag = el.tagName;
  if (tag === "INPUT") {
    const type = (el as HTMLInputElement).type.toLowerCase();
    return MONO_INPUT_TYPES.has(type) ? "mono" : "sans";
  }
  if (tag === "TH" || tag === "SELECT" || tag === "TEXTAREA") return "sans";

  if (keepMono(el)) return "mono";

  // Evaluate the whole element text including child spans so that e.g. a number
  // in an inner <span> correctly marks the line as data.
  const text = (el.textContent ?? "").trim();
  if (!text) return null;
  if (isEyebrow(el)) return "mono";
  return looksLikeData(text) ? "mono" : "sans";
}

// Only these are classified: elements marked .font-mono in the source, plus form controls.
const SELECTOR = ".font-mono, input, select, textarea, th";

function apply(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
    const role = decide(el);
    if (!role) return;
    const converted = el.classList.contains("font-mono") ? role : null;
    if (
      el.dataset.typoFont === role &&
      el.style.fontFamily &&
      (el.dataset.typoConverted ?? null) === converted
    ) {
      return;
    }
    el.style.setProperty(
      "font-family",
      role === "mono" ? "var(--ui-font-mono)" : "var(--ui-font)",
      "important",
    );
    el.dataset.typoFont = role;
    // Only elements converted from mono get the sans size compensation.
    if (converted) {
      el.dataset.typoConverted = role;
    } else {
      delete el.dataset.typoConverted;
    }
  });
}

export interface TypographyHandle {
  stop(): void;
}

export function applyTypography(root: HTMLElement): TypographyHandle {
  let frame = 0;

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      apply(root);
    });
  };

  schedule();

  const observer = new MutationObserver(schedule);
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  return {
    stop() {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      root.querySelectorAll<HTMLElement>("[data-typo-font]").forEach((el) => {
        el.style.removeProperty("font-family");
        if (el.style.length === 0) el.removeAttribute("style");
        el.removeAttribute("data-typo-font");
        el.removeAttribute("data-typo-converted");
      });
    },
  };
}
