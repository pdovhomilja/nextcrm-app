"use client";

import * as React from "react";
import {
  Download,
  Expand,
  FileImage,
  FileSpreadsheet,
  FileText,
  Paperclip,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  attachmentKindLabel,
  formatAttachmentSize,
  type EmailStoredAttachment,
  isPdfAttachment,
} from "@/lib/email/attachment-types";

type Props = {
  emailId: string;
  attachments: EmailStoredAttachment[];
  className?: string;
};

function AttachmentVisual({ attachment }: { attachment: EmailStoredAttachment }) {
  const pdf = isPdfAttachment(attachment);
  const image = attachment.mime.startsWith("image/");
  const sheet =
    attachment.mime.includes("spreadsheet") ||
    attachment.mime.includes("excel") ||
    /\.xlsx?$/i.test(attachment.name);

  if (pdf) {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/30">
        <FileText className="h-5 w-5" />
      </div>
    );
  }
  if (image) {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/30">
        <FileImage className="h-5 w-5" />
      </div>
    );
  }
  if (sheet) {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
        <FileSpreadsheet className="h-5 w-5" />
      </div>
    );
  }
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-primary text-white shadow-md shadow-primary/25">
      <Paperclip className="h-5 w-5" />
    </div>
  );
}

export function EmailAttachmentsPanel({ emailId, attachments, className }: Props) {
  const [previewIndex, setPreviewIndex] = React.useState<number | null>(null);

  if (attachments.length === 0) return null;

  const preview =
    previewIndex !== null && attachments[previewIndex] ? attachments[previewIndex] : null;
  const previewSrc =
    previewIndex !== null
      ? `/api/emails/${emailId}/attachments/${previewIndex}?inline=1`
      : null;

  return (
    <>
      <section className={cn("mt-2", className)}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Attachments
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {attachments.length} file{attachments.length === 1 ? "" : "s"} with this message
            </p>
          </div>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {attachments.map((a, i) => {
            const pdf = isPdfAttachment(a);
            const size = formatAttachmentSize(a.size);
            const kind = attachmentKindLabel(a);
            return (
              <li key={`${a.url}-${i}`}>
                <div
                  className={cn(
                    "group relative flex gap-3 overflow-hidden rounded-2xl border border-border/50 bg-card/80 p-3 shadow-sm transition-all duration-200",
                    "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md hover:shadow-primary/5"
                  )}
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-violet-500/[0.06] opacity-0 transition-opacity group-hover:opacity-100" />
                  <AttachmentVisual attachment={a} />
                  <div className="relative min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight text-foreground">
                      {a.name}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-md bg-muted/80 px-1.5 py-0.5 font-medium text-[10px] uppercase tracking-wide">
                        {kind}
                      </span>
                      {size && <span>{size}</span>}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {pdf && (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 gap-1.5 rounded-full px-3 text-xs shadow-sm"
                          onClick={() => setPreviewIndex(i)}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Preview
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 gap-1.5 rounded-full px-3 text-xs"
                        asChild
                      >
                        <a href={`/api/emails/${emailId}/attachments/${i}`} download={a.name}>
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      </Button>
                      {!pdf && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-full px-3 text-xs"
                          onClick={() =>
                            window.open(`/api/emails/${emailId}/attachments/${i}`, "_blank", "noopener")
                          }
                        >
                          Open
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Sheet open={previewIndex !== null} onOpenChange={(open) => !open && setPreviewIndex(null)}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-l border-border/60 p-0 sm:max-w-3xl lg:max-w-[min(920px,90vw)]"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border/50 bg-gradient-to-r from-background via-muted/30 to-background px-6 py-4 pr-14 text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Expand className="h-4 w-4 text-primary" />
              <span className="truncate">{preview?.name ?? "Document"}</span>
            </SheetTitle>
            <SheetDescription className="text-xs">
              Secure preview · download anytime from the card below the message
            </SheetDescription>
          </SheetHeader>
          {previewSrc && preview && (
            <div className="relative min-h-0 flex-1 bg-zinc-950/95 p-2 sm:p-3">
              <div className="h-full overflow-hidden rounded-lg border border-white/10 shadow-2xl">
                <iframe
                  title={preview.name}
                  src={previewSrc}
                  className="h-[calc(100dvh-7.5rem)] w-full bg-zinc-900"
                />
              </div>
            </div>
          )}
          {preview && previewIndex !== null && (
            <div className="flex shrink-0 justify-end gap-2 border-t border-border/50 bg-background/95 px-4 py-3 backdrop-blur">
              <Button variant="outline" size="sm" className="rounded-full" asChild>
                <a href={`/api/emails/${emailId}/attachments/${previewIndex}`} download={preview.name}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            </div>
          )}
        </SheetContent>
      </S