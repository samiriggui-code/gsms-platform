/**
 * Préférences user locales (avatar : data-URL upload ou chemin /media/avatars/…).
 * Pas d’API avatar côté serveur pour l’instant.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserPrefsState {
  /** userId → data URL image */
  avatars: Record<string, string>;
  setAvatar: (userId: string, dataUrl: string | null) => void;
  getAvatar: (userId: string | null | undefined) => string | null;
}

export const useUserPrefsStore = create<UserPrefsState>()(
  persist(
    (set, get) => ({
      avatars: {},
      setAvatar: (userId, dataUrl) => {
        set((state) => {
          const next = { ...state.avatars };
          if (!dataUrl) delete next[userId];
          else next[userId] = dataUrl;
          return { avatars: next };
        });
      },
      getAvatar: (userId) => {
        if (!userId) return null;
        return get().avatars[userId] ?? null;
      },
    }),
    { name: 'qatrial:user-prefs' },
  ),
);

const MAX_EDGE = 256;
const MAX_BYTES = 350_000;

/** Compresse une image fichier en data-URL JPEG carrée. */
export function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Fichier image requis'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = MAX_EDGE;
        canvas.height = MAX_EDGE;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas indisponible'));
          return;
        }
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, MAX_EDGE, MAX_EDGE);
        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > MAX_BYTES && quality > 0.4) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        if (dataUrl.length > MAX_BYTES) {
          reject(new Error('Image trop lourde — choisissez une photo plus légère'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
