"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description?: string;
  /** Same-origin PDF URL (e.g. /api/invoices/:id/pdf) */
  pdfUrl?: string | null;
  emptyHint?: React.ReactNode;
};

export function DocumentPdfPreview({
  title,
  description,
  pdfUrl,
  emptyHint = "Issue or generate the document to preview the PDF with your letterhead.",
}: Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {pdfUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              Open full screen
            </a>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {pdfUrl ? (
          <iframe
            title={title}
            src={`${pdfUrl}#toolbar=1&navpanes=0`}
            className="h-[min(70vh,720px)] w-full border-0 bg-muted/30"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-sm text-muted-foreground">
            <FileText className="h-10 w-10 opacity-40" />
            <p className="max-w-sm">{emptyHint}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
