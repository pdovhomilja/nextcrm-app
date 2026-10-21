"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  FileText,
  Loader2,
  Expand,
  Shrink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface InvoicePreviewPayload {
  type: string;
  accountId: string;
  seriesId: string;
  currency: string;
  dueDate: string;
  bankName: string;
  iban: string;
  swift: string;
  variableSymbol: string;
  publicNotes: string;
  lineItems: Array<{
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    taxRateId?: string;
    taxRate?: number;
  }>;
}

interface InvoicePdfLivePreviewProps {
  formData: InvoicePreviewPayload;
  className?: string;
}

const ZOOM_STEPS = [50, 75, 90, 100, 125, 150, 175, 200];

export function InvoicePdfLivePreview({ formData, className }: InvoicePdfLivePreviewProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [filename, setFilename] = useState("invoice-draft.pdf");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Viewer controls
  const [zoomIndex, setZoomIndex] = useState(3); // 100%
  const [isFitWidth, setIsFitWidth] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentZoom = ZOOM_STEPS[zoomIndex];

  // Generate PDF and rendered pages from API
  const generatePdf = useCallback(async () => {
    // Cancel any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setHasError(false);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/invoices/preview-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.pages)) {
        setPages(data.pages);
        const resolvedTotal = data.totalPages || data.pages.length || 1;
        setTotalPages(resolvedTotal);
        setPdfBase64(data.pdfBase64 || null);
        if (data.filename) {
          setFilename(data.filename);
        }
        setCurrentPage((prev) => Math.min(prev, resolvedTotal));
      } else {
        throw new Error(data.error || "Failed to render document preview");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return; // Ignore aborted requests
      }
      console.error("[InvoicePdfLivePreview] Generation failed:", err);
      setHasError(true);
      setErrorMessage(err.message || "Failed to generate preview");
    } finally {
      setIsGenerating(false);
    }
  }, [formData]);

  // Debounced auto-sync when form data changes (350ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      generatePdf();
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [generatePdf]);

  // Zoom controls
  const handleZoomIn = () => {
    setIsFitWidth(false);
    setZoomIndex((prev) => Math.min(prev + 1, ZOOM_STEPS.length - 1));
  };

  const handleZoomOut = () => {
    setIsFitWidth(false);
    setZoomIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleToggleFitWidth = () => {
    setIsFitWidth((prev) => !prev);
  };

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // Escape key exits fullscreen
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  // Page navigation
  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Download PDF
  const handleDownload = () => {
    if (!pdfBase64) {
      toast.error("Preview document is not ready yet. Please wait a moment.");
      return;
    }

    try {
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `${(formData.type || "invoice").toLowerCase()}-draft.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Invoice PDF downloaded successfully");
    } catch (e) {
      console.error("[InvoicePdfLivePreview] Download failed:", e);
      toast.error("Download failed. Retrying from server...");
      // Fallback: trigger download endpoint
      window.open("/api/invoices/preview-pdf?download=1", "_blank");
    }
  };

  // Standard A4 width = 210mm (~794px at 96 DPI), height = 297mm (~1123px)
  const baseWidthPx = 794;
  const scaledWidthPx = isFitWidth ? "100%" : `${Math.round(baseWidthPx * (currentZoom / 100))}px`;

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn(
          "rounded-xl border bg-card text-card-foreground shadow-sm transition-all",
          isFullscreen
            ? "fixed inset-0 z-50 rounded-none border-none bg-background flex flex-col p-4 sm:p-6"
            : "w-full",
          className
        )}
      >
        {/* Header & Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Live Invoice PDF Preview</span>
            {isGenerating ? (
              <Badge variant="outline" className="text-xs gap-1 py-0.5 px-2 animate-pulse bg-muted">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span>Generating...</span>
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs py-0.5 px-2">
                A4 Live Document
              </Badge>
            )}
          </div>

          {/* Viewer Toolbar Controls */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Page navigation */}
            <div className="flex items-center border rounded-md bg-background px-1 py-0.5 text-xs shadow-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1 || isGenerating || pages.length <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous page</TooltipContent>
              </Tooltip>

              <span className="px-2 font-medium text-muted-foreground whitespace-nowrap">
                Page {currentPage} of {totalPages}
              </span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages || isGenerating || pages.length <= 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next page</TooltipContent>
              </Tooltip>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center border rounded-md bg-background px-1 py-0.5 shadow-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleZoomOut}
                    disabled={zoomIndex <= 0 || isFitWidth}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>

              <span className="w-12 text-center text-xs font-medium text-muted-foreground select-none">
                {isFitWidth ? "Fit" : `${currentZoom}%`}
              </span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleZoomIn}
                    disabled={zoomIndex >= ZOOM_STEPS.length - 1 || isFitWidth}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
            </div>

            {/* Fit to Width Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isFitWidth ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs px-2.5 shadow-sm"
                  onClick={handleToggleFitWidth}
                >
                  {isFitWidth ? <Shrink className="mr-1 h-3.5 w-3.5" /> : <Expand className="mr-1 h-3.5 w-3.5" />}
                  Fit Width
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFitWidth ? "Reset to natural zoom" : "Fit document to container width"}</TooltipContent>
            </Tooltip>

            {/* Fullscreen Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shadow-sm"
                  onClick={handleToggleFullscreen}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? "Exit Fullscreen (Esc)" : "Full Screen"}</TooltipContent>
            </Tooltip>

            {/* Refresh / Retry */}
            {hasError && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 shadow-sm text-destructive"
                onClick={generatePdf}
              >
                <RotateCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            )}

            {/* Download PDF button */}
            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs gap-1.5 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-3"
              onClick={handleDownload}
              disabled={isGenerating && !pdfBase64}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </Button>
          </div>
        </div>

        {/* PDF Document Canvas Stage */}
        <div
          className={cn(
            "relative w-full overflow-auto bg-zinc-900/95 dark:bg-zinc-950 p-4 sm:p-8 flex justify-center items-start transition-all",
            isFullscreen ? "flex-1 min-h-0" : "min-h-[720px] max-h-[920px]"
          )}
        >
          {hasError ? (
            <div className="flex flex-col items-center justify-center my-auto p-8 rounded-lg bg-card/90 border text-center shadow-lg max-w-md">
              <FileText className="h-12 w-12 text-destructive mb-3 opacity-80" />
              <h3 className="text-base font-semibold text-foreground mb-1">
                Unable to generate invoice preview
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {errorMessage || "An unexpected error occurred while rendering the PDF document."}
              </p>
              <Button size="sm" onClick={generatePdf} className="gap-2">
                <RotateCw className="h-4 w-4" />
                Retry Preview Generation
              </Button>
            </div>
          ) : pages.length > 0 ? (
            <div
              style={{
                width: scaledWidthPx,
                maxWidth: isFitWidth ? "100%" : "none",
                aspectRatio: "210 / 297",
                transition: "width 0.2s ease-in-out",
              }}
              className="relative bg-white shadow-2xl rounded-sm transition-all duration-200 overflow-hidden border border-zinc-700/40 flex flex-col items-center"
            >
              {/* Active document page image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pages[Math.min(currentPage, pages.length) - 1]}
                alt={`Invoice Page ${currentPage} of ${totalPages}`}
                className="w-full h-auto block select-none pointer-events-none"
                draggable={false}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center my-auto p-12 text-center text-zinc-400">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium">Generating invoice document...</p>
              <p className="text-xs text-zinc-500 mt-1">Applying VenSai letterhead and calculating totals</p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
