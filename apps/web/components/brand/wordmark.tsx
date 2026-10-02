import { cn } from "@/lib/utils";

/** Marque GSMS : bouclier stylisé + mot-symbole. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-[18px]", className)}>
      <path
        d="M12 2.5 4 5.6v6.1c0 4.6 3.2 8.6 8 9.8 4.8-1.2 8-5.2 8-9.8V5.6L12 2.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="m8.5 12 2.4 2.4 4.6-4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("flex shrink-0 select-none items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid size-8 place-items-center rounded-[10px] shadow-sm",
          inverted ? "bg-white text-ink" : "bg-foreground text-background",
        )}
      >
        <LogoMark className="size-[17px]" />
      </span>
      <span className="text-[15px]/5 font-semibold tracking-[-0.025em]">GSMS</span>
    </span>
  );
}
