import { create } from "zustand";

type UploadOpenOpts = {
  prestationId?: string | null;
  demandeId?: string | null;
  demandeTitle?: string | null;
};

interface UploadStore {
  open: boolean;
  prestationId: string | null;
  demandeId: string | null;
  demandeTitle: string | null;
  lastUploadAt: number;
  openUpload: (opts?: UploadOpenOpts) => void;
  closeUpload: () => void;
  markUploaded: () => void;
}

export const useUploadStore = create<UploadStore>((set) => ({
  open: false,
  prestationId: null,
  demandeId: null,
  demandeTitle: null,
  lastUploadAt: 0,
  openUpload: (opts) =>
    set({
      open: true,
      prestationId: opts?.prestationId ?? null,
      demandeId: opts?.demandeId ?? null,
      demandeTitle: opts?.demandeTitle ?? null,
    }),
  closeUpload: () =>
    set({
      open: false,
      prestationId: null,
      demandeId: null,
      demandeTitle: null,
    }),
  markUploaded: () => set({ lastUploadAt: Date.now() }),
}));
