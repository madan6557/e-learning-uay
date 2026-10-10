import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

export function ThemeToggle() {
  const context = useTheme();
  if (!context) return null;
  const dark = context.theme === "dark";
  const label = dark ? "Aktifkan tema terang" : "Aktifkan tema gelap";
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={label}
      aria-pressed={dark}
      title={label}
      onClick={() => context.setPreference(dark ? "light" : "dark")}
    >
      {dark ? (
        <Sun size={19} aria-hidden="true" />
      ) : (
        <Moon size={19} aria-hidden="true" />
      )}
    </button>
  );
}

export function ThemePreferenceControl() {
  const context = useTheme();
  if (!context) return null;
  return (
    <label className="theme-preference">
      <span>Tema tampilan</span>
      <select
        value={context.preference}
        onChange={(event) =>
          context.setPreference(
            event.target.value as "light" | "dark" | "system",
          )
        }
      >
        <option value="system">Ikuti perangkat</option>
        <option value="light">Terang</option>
        <option value="dark">Gelap</option>
      </select>
      <small>Pilihan tema tersimpan di perangkat ini.</small>
    </label>
  );
}
