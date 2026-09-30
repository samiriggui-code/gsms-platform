/**
 * Copié depuis compliance-desk/frontend/src/components/DocumentUploadForm.tsx
 * Seuls les imports sont remappés vers tenant-core.
 */
import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, Upload, X } from "lucide-react";

import { uploadDocument, type UploadResponse } from "@/lib/uploadApi";
import { useUploadSettings } from "@/settings/useUploadSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { useNotificationStore } from "@/stores/notificationStore";
import { tUpload, type UploadT } from "@/i18n/upload.fr";

interface DocumentUploadFormProps {
  onUploaded?: (response: UploadResponse) => void;
}

type QueueStatus = "pending" | "uploading" | "success" | "error";

interface QueueItem {
  id: string;
  file: File;
  status: QueueStatus;
  message?: string;
  eventId?: string;
}

const signature = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

export function DocumentUploadForm({ onUploaded }: DocumentUploadFormProps) {
  const t = tUpload;
  const { settings } = useUploadSettings();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [docType, setDocType] = useState("");
  const [metadataText, setMetadataText] = useState("");
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [parsedMetadata, setParsedMetadata] = useState<Record<string, unknown> | undefined>(
    undefined,
  );
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    if (!metadataText.trim()) {
      setMetadataError(null);
      setParsedMetadata(undefined);
      return;
    }
    try {
      const parsed = JSON.parse(metadataText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(t("upload.metadataMustBeObject"));
      }
      setParsedMetadata(parsed as Record<string, unknown>);
      setMetadataError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("upload.metadataMustBeValidJson");
      setMetadataError(message);
      setParsedMetadata(undefined);
      addNotification({ title: t("upload.invalidMetadata"), description: message, variant: "error" });
    }
  }, [metadataText, addNotification, t]);

  useEffect(() => {
    if (isProcessing) return;
    const nextIndex = queue.findIndex((item) => item.status === "pending");
    if (nextIndex === -1) return;

    setIsProcessing(true);
    const nextItem = queue[nextIndex]!;

    const process = async () => {
      setQueue((prev) =>
        prev.map((item, idx) =>
          idx === nextIndex ? { ...item, status: "uploading", message: t("upload.uploadingMessage") } : item,
        ),
      );

      if (metadataError) {
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === nextIndex
              ? {
                  ...item,
                  status: "error",
                  message: metadataError,
                }
              : item,
          ),
        );
        addNotification({
          title: t("upload.uploadBlocked"),
          description: metadataError,
          variant: "warning",
        });
        setIsProcessing(false);
        return;
      }

      try {
        const response = await uploadDocument({
          file: nextItem.file,
          docType: docType.trim() || undefined,
          metadata: parsedMetadata,
        });
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === nextIndex
              ? {
                  ...item,
                  status: "success",
                  eventId: response.event_id,
                  message: t("upload.eventLabel", { eventId: response.event_id }),
                }
              : item,
          ),
        );
        addNotification({
          title: t("upload.uploadQueued"),
          description: t("upload.uploadQueuedDesc", {
            filename: nextItem.file.name,
            eventId: response.event_id,
          }),
          variant: "success",
          href: "/documents",
        });
        onUploaded?.(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : t("upload.uploadFailedGeneric");
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === nextIndex
              ? {
                  ...item,
                  status: "error",
                  message,
                }
              : item,
          ),
        );
        addNotification({
          title: t("upload.uploadFailed"),
          description: t("upload.uploadFailedDesc", {
            filename: nextItem.file.name,
            message,
          }),
          variant: "error",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    void process();
  }, [queue, isProcessing, metadataError, parsedMetadata, docType, onUploaded, addNotification, t]);

  const handleNativeSelect = () => {
    fileInputRef.current?.click();
  };

  const enqueueFiles = (files: FileList | File[]) => {
    const newFiles = Array.from(files).filter((file) => file.size > 0);
    if (!newFiles.length) return;
    setQueue((prev) => {
      const existing = new Set(prev.map((item) => signature(item.file)));
      const additions = newFiles
        .filter((file) => !existing.has(signature(file)))
        .map<QueueItem>((file) => ({
          id: crypto?.randomUUID
            ? crypto.randomUUID()
            : `${file.name}-${file.lastModified}-${Math.random()}`,
          file,
          status: "pending",
        }));
      return [...prev, ...additions];
    });
    if (newFiles.length) {
      addNotification({
        title: t("upload.filesQueued"),
        description: t("upload.filesQueuedDesc", { count: newFiles.length }),
        variant: "info",
      });
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    enqueueFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    if (event.dataTransfer?.files?.length) {
      enqueueFiles(event.dataTransfer.files);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isDragActive) setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleRetry = (id: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "pending", message: undefined } : item)),
    );
    addNotification({
      title: t("upload.retryScheduled"),
      description: t("upload.retryScheduledDesc"),
      variant: "info",
    });
  };

  const handleRemove = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    addNotification({
      title: t("upload.removedFromQueue"),
      description: t("upload.removedFromQueueDesc"),
      variant: "info",
    });
  };

  const hasQueuedItems = queue.length > 0;
  const pendingCount = queue.filter((item) => item.status === "pending").length;
  const uploadingCount = queue.filter((item) => item.status === "uploading").length;
  const completedCount = queue.filter((item) => item.status === "success").length;

  const dropZoneClasses = cn(
    "relative flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 bg-surface-subtle p-6 text-center transition-colors",
    isDragActive ? "border-primary/60 bg-secondary/60 text-primary" : "hover:border-border/50",
  );

  const summaryHint = useMemo(
    () => t("upload.summaryChunkLimitHint", { limit: settings.summaryChunkLimit }),
    [settings.summaryChunkLimit, t],
  );

  return (
    <Card className="shadow-none">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Upload className="h-5 w-5 text-primary" /> {t("upload.title")}
        </CardTitle>
        <CardDescription>{t("upload.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={dropZoneClasses}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
          <Button variant="outline" onClick={handleNativeSelect} type="button">
            {t("upload.browseFiles")}
          </Button>
          <p className="text-sm text-muted-foreground">{t("upload.dragDropHint")}</p>
          {hasQueuedItems ? (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="muted">{t("upload.queued", { count: queue.length })}</Badge>
              <Badge variant="muted">{t("upload.uploading", { count: uploadingCount })}</Badge>
              <Badge variant="muted">{t("upload.pending", { count: pendingCount })}</Badge>
              <Badge variant="muted">{t("upload.completed", { count: completedCount })}</Badge>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="doc-type">{t("upload.documentType")}</Label>
            <Input
              id="doc-type"
              placeholder="invoice, contract, resume…"
              value={docType}
              onChange={(event) => setDocType(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("upload.documentTypeHint")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="metadata">{t("upload.metadataJson")}</Label>
            <Textarea
              id="metadata"
              placeholder='{"tags":["finance"],"region":"EU"}'
              value={metadataText}
              onChange={(event) => setMetadataText(event.target.value)}
              rows={4}
            />
            {metadataError ? (
              <p className="text-xs text-destructive">{metadataError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("upload.metadataHint")}</p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{summaryHint}</p>

        <div className="space-y-3">
          {queue.length === 0 ? (
            <p className="rounded-md border border-border/70 bg-surface-subtle px-4 py-3 text-sm text-muted-foreground">
              {t("upload.queueEmpty")}
            </p>
          ) : (
            <ul className="space-y-2">
              {queue.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-card px-4 py-3"
                >
                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-surface-subtle text-muted-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{item.file.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          {formatBytes(item.file.size)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {statusIcon(item.status)} {item.message ?? statusMessage(item.status, t)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === "error" ? (
                      <Button variant="ghost" size="sm" onClick={() => handleRetry(item.id)}>
                        {t("upload.retry")}
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(item.id)}
                      aria-label={t("upload.removeFile")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function statusIcon(status: QueueStatus) {
  if (status === "uploading")
    return <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin text-primary" />;
  if (status === "success")
    return <CheckCircle2 className="mr-2 inline h-3.5 w-3.5 text-emerald-500" />;
  if (status === "error")
    return <AlertCircle className="mr-2 inline h-3.5 w-3.5 text-destructive" />;
  return <FileText className="mr-2 inline h-3.5 w-3.5 text-muted-foreground" />;
}

function statusMessage(status: QueueStatus, t: UploadT) {
  switch (status) {
    case "pending":
      return t("upload.waitingToUpload");
    case "uploading":
      return t("upload.uploadingStatus");
    case "success":
      return t("upload.queuedSuccessfully");
    case "error":
      return t("upload.uploadFailedStatus");
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${sizes[i]}`;
}
