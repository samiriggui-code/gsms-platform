import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { DocumentUploadForm } from "@/components/upload/DocumentUploadForm";
import { Button } from "@/components/ui/button";
import { tUpload } from "@/i18n/upload.fr";
import type { UploadResponse } from "@/lib/uploadApi";
import { useUploadStore } from "@/stores/uploadStore";

/** Modal upload — calqué sur compliance-desk `App.tsx` (isUploadOpen). */
export function UploadDialog() {
  const navigate = useNavigate();
  const open = useUploadStore((s) => s.open);
  const closeUpload = useUploadStore((s) => s.closeUpload);
  const markUploaded = useUploadStore((s) => s.markUploaded);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeUpload();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeUpload]);

  if (!open) return null;

  const handleUploadComplete = (_response: UploadResponse) => {
    markUploaded();
    closeUpload();
    void navigate({ to: "/documents" });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/20 px-4 backdrop-blur-sm">
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-[0_32px_100px_rgba(20,18,30,0.28)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-dialog-title"
      >
        <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div>
            <h3 id="upload-dialog-title" className="text-lg font-semibold text-foreground">
              {tUpload("app.addDocuments")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {tUpload("app.uploadDialogDesc")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeUpload}
            aria-label={tUpload("app.closeUploadDialog")}
          >
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="max-h-[80vh] overflow-y-auto px-6 py-4">
          <DocumentUploadForm onUploaded={handleUploadComplete} />
        </div>
      </div>
    </div>
  );
}
