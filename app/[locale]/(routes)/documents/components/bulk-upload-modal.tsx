"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createDocument } from "@/actions/documents/create-document";
import { checkDuplicate } from "@/actions/documents/check-duplicate";
import { Plus } from "lucide-react";

const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

type FileStatus = "queued" | "checking" | "uploading" | "uploaded" | "duplicate" | "skipped" | "error";

interface QueuedFile {
  file: File;
  status: FileStatus;
  progress: number;
  hash?: string;
  duplicateInfo?: { name: string; createdAt: Date | null };
  error?: string;
}

async function computeHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface BulkUploadModalProps {
  accountId?: string;
}

export function BulkUploadModal({ accountId }: BulkUploadModalProps) {
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const updateFile = (index: number, updates: Partial<QueuedFile>) => {
    setQueue((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: QueuedFile[] = acceptedFiles.map((file) => ({
      file,
      status: "queued",
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 64 * 1024 * 1024,
    multiple: true,
  });

  const uploadFile = async (index: number) => {
    const item = queue[index];
    updateFile(index, { status: "uploading", progress: 10 });

    try {
      const folder = item.file.type.startsWith("image/") ? "images" : "documents";
      const res = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: item.file.name,
          contentType: item.file.type,
          folder,
        }),
      });

      if (!res.ok) throw new Error("Failed to get presigned URL");
      const { presignedUrl, fileUrl, key } = await res.json();

      updateFile(index, { progress: 30 });

      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        body: item.file,
        headers: { "Content-Type": item.file.type },
      });
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);

      updateFile(index, { progress: 70 });

      await createDocument({
        name: item.file.name,
        url: fileUrl,
        key,
        size: item.file.size,
        mimeType: item.file.type,
        contentHash: item.hash,
        accountId,
      });

      updateFile(index, { status: "uploaded", progress: 100 });
    } catch (err) {
      updateFile(index, {
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  };

  const processQueue = async () => {
    setIsProcessing(true);

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status !== "queued") continue;

      updateFile(i, { status: "checking" });
      try {
        const hash = await computeHash(item.file);
        updateFile(i, { hash });

        const result = await checkDuplicate(hash);
        if (result.isDuplicate) {
          updateFile(i, {
            status: "duplicate",
            duplicateInfo: {
              name: result.existingDocument!.name,
              createdAt: result.existingDocument!.createdAt,
            },
          });
          continue;
        }
      } catch {
        // If duplicate check fails, proceed with upload
      }

      await uploadFile(i);
    }

    setIsProcessing(false);
    router.refresh();
  };

  const uploadAnyway = async (index: number) => {
    await uploadFile(index);
    router.refresh();
  };

  const skipFile = (index: number) => {
    updateFile(index, { status: "skipped" });
  };

  const uploadedCount = queue.filter((f) => f.status === "uploaded").length;
  const hasQueued = queue.some((f) => f.status === "queued");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Upload Documents
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
        >
          <input {...getInputProps()} />
          <p className="font-medium">Drop files here or click to browse</p>
          <p className="text-sm text-muted-foreground mt-1">
            PDF, DOCX, DOC, TXT, Images — up to 64MB each
          </p>
        </div>

        {queue.length > 0 && (
          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
            {queue.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 py-2 px-3 rounded-md border text-sm"
              >
                <StatusIcon status={item.status} />
                <span className="flex-1 truncate">{item.file.name}</span>
                <span className="text-muted-foreground text-xs">
                  {(item.file.size / 1024 / 1024).toFixed(1)} MB
                </span>
                {item.status === "duplicate" && (
                  <span className="flex gap-2 text-xs">
                    <button
                      className="text-primary underline"
                      onClick={() => uploadAnyway(index)}
                    >
                      Upload anyway
                    </button>
                    <button
                      className="text-muted-foreground underline"
                      onClick={() => skipFile(index)}
                    >
                      Skip
                    </button>
                  </span>
                )}
                {item.status === "uploading" && (
                  <span className="text-xs text-muted-foreground">
                    {item.progress}%
                  </span>
                )}
                {item.status === "uploaded" && (
                  <span className="text-xs text-green-600">Uploaded</span>
                )}
                {item.status === "error" && (
                  <span className="text-xs text-red-600">{item.error}</span>
                )}
                {item.status === "skipped" && (
                  <span className="text-xs text-muted-foreground">Skipped</span>
                )}
              </div>
            ))}
          </div>
        )}

        {queue.length > 0 && (
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-muted-foreground">
              {uploadedCount}/{queue.length} uploaded
            </span>
            {hasQueued && (
              <Button onClick={processQueue} disabled={isProcessing}>
                {isProcessing ? "Uploading..." : "Upload All"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatusIcon({ status }: { status: FileStatus }) {
  switch (status) {
    case "uploaded":
      return <span className="text-green-600">&#10003;</span>;
    case "uploading":
    case "checking":
      return <span className="text-yellow-600 animate-spin">&#10227;</span>;
    case "duplicate":
      return <span className="text-yellow-600">&#9888;</span>;
    case "error":
      return <span className="text-red-600">&#10007;</span>;
    case "skipped":
      return <span className="text-muted-foreground">&mdash;</span>;
    default:
      return <span className="text-muted-foreground">&#9203;</span>;
  }
}
