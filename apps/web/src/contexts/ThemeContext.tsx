import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
export const THEME_STORAGE_KEY = "uay-theme";
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

export function parseThemePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

function readPreference(): ThemePreference {
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

const ThemeContext = createContext<{
  preference: ThemePreference;
  theme: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, updatePreference] = useState(readPreference);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.(SYSTEM_THEME_QUERY).matches ?? false,
  );
  const theme =
    preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    const media = window.matchMedia?.(SYSTEM_THEME_QUERY);
    const onSystemChange = () => setSystemDark(media?.matches ?? false);
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        updatePreference(readPreference());
      }
    };
    onSystemChange();
    media?.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media?.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0f1724" : "#183d32");
  }, [theme]);

  const setPreference = (next: ThemePreference) => {
    updatePreference(next);
    try {
      if (next === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
      else window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // The current tab can still switch themes when storage is unavailable.
    }
  };

  return (
    <ThemeContext.Provider value={{ preference, theme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
