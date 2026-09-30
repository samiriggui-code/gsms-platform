import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

const THEME_KEY = "gsms.portal.theme";

function readDark(): boolean {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return false; /* défaut clair = DocuLens AI */
}

export function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  window.localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
}

export function ThemeToggle() {
  const { t } = useTranslation();
  const [dark, setDark] = useState(readDark);

  useEffect(() => {
    applyTheme(dark);
  }, [dark]);

  return (
    <button
      type="button"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
      aria-label={dark ? t("theme.toLight") : t("theme.toDark")}
      onClick={() => setDark((v) => !v)}
    >
      {dark ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
    </button>
  );
}
