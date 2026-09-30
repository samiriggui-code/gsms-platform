import { cn } from "@/lib/cn";

const AVATAR_KEY = "gsms.portal.avatarDataUrl";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function readStoredAvatar(): string | null {
  try {
    return localStorage.getItem(AVATAR_KEY);
  } catch {
    return null;
  }
}

export function writeStoredAvatar(dataUrl: string | null) {
  try {
    if (dataUrl) localStorage.setItem(AVATAR_KEY, dataUrl);
    else localStorage.removeItem(AVATAR_KEY);
  } catch {
    /* ignore */
  }
}

export function UserAvatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "lg" ? "h-16 w-16 text-lg" : size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-[hsl(var(--border)/0.7)]", dim, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-[hsl(var(--foreground))] font-semibold text-[hsl(var(--background))] ring-1 ring-[hsl(var(--border)/0.7)]",
        dim,
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
