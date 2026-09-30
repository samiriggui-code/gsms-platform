import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

const LANGUAGES = [
  { code: "fr", label: "Français", flag: "/media/flags/france.svg" },
  { code: "en", label: "English", flag: "/media/flags/united-states.svg" },
] as const;

/** Sélecteur langue + drapeaux — i18next changeLanguage. */
export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? "fr").slice(0, 2);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  const select = (code: string) => {
    void i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))]"
        onClick={() => setOpen((v) => !v)}
        aria-label={current.label}
        title={current.label}
      >
        <img
          src={current.flag}
          alt={current.label}
          className="h-4 w-4 rounded-full object-cover"
        />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg">
            {LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => select(item.code)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition hover:bg-[hsl(var(--surface-subtle))]",
                  item.code === current.code
                    ? "font-semibold text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--muted-foreground))]",
                )}
              >
                <img
                  src={item.flag}
                  alt=""
                  className="h-4 w-4 rounded-full object-cover"
                />
                {item.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
