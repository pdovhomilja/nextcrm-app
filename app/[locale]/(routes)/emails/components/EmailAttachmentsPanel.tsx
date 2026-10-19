"use client";

import * as React from "react";
import { Download, FileText, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type EmailStoredAttachment,
  isPdfAttachment,
} from "@/lib/email/attachment-types";

type Props = {
  emailId: string;
  attachments: EmailStoredAttachment[];
  className?: string;
};

export function EmailAttachmentsPanel({ emailId, attachments, className }: Props) {
  const [previewIndex, setPreviewIndex] = React.useState<number | null>(() => {
    const pdfIdx = attachments.findIndex(isPdfAttachment);
    return pdfIdx >= 0 ? pdfIdx : null;
  });

  if (attachments.length === 0) return null;

  const preview =
    previewIndex !== null && attachments[previewIndex] ? attachments[previewIndex] : null;
  const previewIsPdf = preview ? isPdfAttachment(preview) : false;
  const previewSrc =
    previewIndex !== null
      ? `/api/emails/${emailId}/attachments/${previewIndex}?inline=1`
      : null;

  return (
    <div className={cn("border-b border-border/40 bg-background px-5 py-4", className)}>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        {attachments.length} attachment{attachments.length === 1 ? "" : "s"}
      </div>

      <ul className="flex flex-wrap gap-2">
        {attachments.map((a, i) => {
          const pdf = isPdfAttachment(a);
          const active = previewIndex === i;
          return (
            <li key={`${a.url}-${i}`}>
              <Button
                type="button"
                variant={active ? "secondary" : "outline"}
                size="sm"
                className="h-auto max-w-[min(100%,280px)] gap-2 py-2"
                onClick={() => {
                  if (pdf) setPreviewIndex(i);
                  else window.open(`/api/emails/${emailId}/attachments/${i}`, "_blank", "noopener");
                }}
              >
                {pdf ? (
                  <FileText className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                ) : (
                  <Paperclip className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{a.name}</span>
              </Button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        {attachments.map((a, i) => (
          <Button key={`dl-${a.url}-${i}`} variant="ghost" size="sm" className="gap-2" asChild>
            <a href={`/api/emails/${emailId}/attachments/${i}`} download={a.name}>
              <Download className="h-4 w-4" />
              Download {a.name}
            </a>
          </Button>
        ))}
      </div>

      {previewIsPdf && previewSrc && preview && (
        <div className="mt-4 overflow-hidden rounded-lg border border-border/60 bg-muted/30">
          <div className="border-b border-border/40 bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            PDF preview — {preview.name}
          </div>
          <iframe
            title={preview.name}
            src={previewSrc}
            className="h-[min(70vh,520px)] w-full bg-white dark:bg-zinc-950"
          />
        </div>
      )}
    </div>
  );
}
