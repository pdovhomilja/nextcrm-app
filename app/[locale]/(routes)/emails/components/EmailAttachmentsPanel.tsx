"use client";

import * as React from "react";
import { ChevronDown, Download, ExternalLink, FileText, Paperclip } from "lucide-react";
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
  const firstPdfIndex = attachments.findIndex(isPdfAttachment);
  const [previewIndex, setPreviewIndex] = React.useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  if (attachments.length === 0) return null;

  const preview =
    previewIndex !== null && attachments[previewIndex] ? attachments[previewIndex] : null;
  const previewIsPdf = preview ? isPdfAttachment(preview) : false;
  const previewSrc =
    previewIndex !== null
      ? `/api/emails/${emailId}/attachments/${previewIndex}?inline=1`
      : null;

  function openPreview(index: number) {
    setPreviewIndex(index);
    setPreviewOpen(true);
  }

  return (
    <section
      className={cn(
        "mx-auto w-full max-w-3xl border-t border-border/40 px-5 py-4 sm:px-8",
        className
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" />
          {attachments.length} attachment{attachments.length === 1 ? "" : "s"}
        </span>
        {firstPdfIndex >= 0 && !previewOpen && (
          <button
            type="button"
            className="normal-case tracking-normal text-primary hover:underline"
            onClick={() => openPreview(firstPdfIndex)}
          >
            Preview PDF
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {attachments.map((a, i) => {
          const pdf = isPdfAttachment(a);
          const active = previewOpen && previewIndex === i;
          return (
            <li
              key={`${a.url}-${i}`}
              className={cn(
                "flex min-w-0 max-w-full items-center gap-1 rounded-lg border bg-card shadow-sm sm:max-w-md",
                active ? "border-primary/40 ring-1 ring-primary/20" : "border-border/60"
              )}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm"
                onClick={() => {
                  if (pdf) {
                    if (active) setPreviewOpen((o) => !o);
                    else openPreview(i);
                  } else {
                    window.open(`/api/emails/${emailId}/attachments/${i}`, "_blank", "noopener");
                  }
                }}
              >
                {pdf ? (
                  <FileText className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                ) : (
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate font-medium">{a.name}</span>
              </button>
              <div className="flex shrink-0 items-center gap-0.5 pr-1">
                {pdf && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={previewOpen && previewIndex === i ? "Hide preview" : "Preview"}
                    onClick={() => {
                      if (active) setPreviewOpen((o) => !o);
                      else openPreview(i);
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Download">
                  <a href={`/api/emails/${emailId}/attachments/${i}`} download={a.name}>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {previewIsPdf && previewSrc && preview && previewOpen && (
        <div className="mt-3 overflow-hidden rounded-lg border border-border/60 bg-background shadow-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between border-b border-border/40 bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted/60"
            onClick={() => setPreviewOpen(false)}
          >
            <span className="truncate pr-2">Preview — {preview.name}</span>
            <ChevronDown className="h-4 w-4 shrink-0 rotate-180" />
          </button>
          <iframe
            title={preview.name}
            src={previewSrc}
            className="h-[min(420px,50vh)] w-full bg-zinc-100 dark:bg-zinc-900"
          />
        </div>
      )}
    </section>
  );
}
