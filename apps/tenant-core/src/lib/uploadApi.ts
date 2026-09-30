/** Adapter API upload — signature alignée Desk `uploadDocument`. */

export type UploadResponse = {
  event_id: string;
  document_id?: string;
};

export async function uploadDocument(options: {
  file: File;
  docType?: string;
  metadata?: Record<string, unknown>;
}): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", options.file);
  if (options.docType) form.append("docType", options.docType);
  if (options.metadata) form.append("metadata", JSON.stringify(options.metadata));

  const res = await fetch("/api/bff/documents/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP_${res.status}`);
  }
  const data = (await res.json()) as { document: { id: string } };
  return {
    event_id: data.document.id,
    document_id: data.document.id,
  };
}
