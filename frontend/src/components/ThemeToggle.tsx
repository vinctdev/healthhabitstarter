import { useState } from "react";
import { LuMoon, LuSun } from "react-icons/lu";

type Theme = "dark" | "light";

// Must match the inline script in index.html.
const STORAGE_KEY = "pd-theme";

function readTheme(): Theme {
  return document.documentElement.dataset.mode === "light" ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.mode = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage may be blocked, e.g. in private browsing.
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const isLight = theme === "light";

  const toggle = () => {
    const next: Theme = isLight ? "dark" : "light";
    applyTheme(next);
    setTheme(next);
  };

  const label = isLight ? "Switch to dark mode" : "Switch to light mode";

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="rounded-full p-2 text-dash-tertiary transition-colors hover:text-dash-secondary"
    >
      {isLight ? (
        <LuMoon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
      ) : (
        <LuSun className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
      )}
    </button>
  );
}
