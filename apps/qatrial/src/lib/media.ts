/**
 * Assets sous `public/media` (Metronic kit : flags, avatars, illustrations…).
 * Chemins absolus depuis la racine Vite.
 */

export function mediaFlag(slug: string): string {
  return `/media/flags/${slug}.svg`;
}

export function mediaAvatar(file: string): string {
  return `/media/avatars/${file}`;
}

/** Drapeaux utilisés par le sélecteur de langue. */
export const LANG_FLAGS = {
  fr: mediaFlag('france'),
  en: mediaFlag('united-states'),
} as const;

/**
 * Avatars prédéfinis (pack public/media/avatars).
 * Chemins stables — pas de data-URL.
 */
export const PRESET_AVATARS: readonly string[] = [
  ...[1, 2, 3, 4, 5].map((n) => mediaAvatar(`gray/${n}.png`)),
  ...Array.from({ length: 24 }, (_, i) => mediaAvatar(`300-${i + 1}.png`)),
];
