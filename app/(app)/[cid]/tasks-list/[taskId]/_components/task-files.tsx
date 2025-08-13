"use client";

import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Task, TaskDocument } from "../../../tasks/_types";

interface TaskFilesProps {
  task: Task;
  companyId: string;
}

export default function TaskFiles({ task, companyId }: TaskFilesProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "metadata",
      JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        companyId,
        taskId: task.id,
      })
    );

    try {
      setIsUploading(true);
      const res = await fetch("/api/ai/documents", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      toast.success("File uploaded and processed");
    } catch {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Attach files for context and AI analysis.
          </div>
          <div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </div>

        <ul className="space-y-2">
          {(task.documents ?? []).map((doc: TaskDocument) => (
            <li key={doc.id} className="text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{doc.filename}</span>
                  <span className="ml-2 text-muted-foreground">
                    {doc.mimeType} · {(doc.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(doc.createdAt).toLocaleString()}
                </div>
              </div>
              {doc.summary && (
                <div className="text-xs text-muted-foreground mt-1">
                  {doc.summary}
                </div>
              )}
            </li>
          ))}
          {(!task.documents || task.documents.length === 0) && (
            <li className="text-sm text-muted-foreground">
              No files attached.
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
