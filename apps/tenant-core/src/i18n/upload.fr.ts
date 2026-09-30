import i18n from "@/i18n/config";

/** Adapter upload — délègue à i18next (`upload.*` / `app.*`). */
export type UploadT = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

export const tUpload: UploadT = (key, vars) => {
  const mapped = key.startsWith("upload.") || key.startsWith("app.")
    ? key
    : key;
  return i18n.t(mapped, vars);
};
