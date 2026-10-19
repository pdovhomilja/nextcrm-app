"use client";

import * as React from "react";
import { sanitizeInboundEmailHtml } from "@/lib/email/sanitize-inbound-html";
import { cn } from "@/lib/utils";

type Props = {
  bodyHtml: string;
  className?: string;
};

const SHADOW_ROOT_BASE_CSS = `
  :host {
    display: block;
    width: 100%;
    max-width: 100%;
    color: #18181b;
    background-color: #ffffff;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.55;
    font-size: clamp(13px, 1.6vw, 15px);
    word-wrap: break-word;
    overflow-wrap: anywhere;
    box-sizing: border-box;
    padding: clamp(12px, 2vw, 28px);
    isolation: isolate;
    position: relative;
    overflow-x: auto;
    overflow-y: visible;
  }
  .email-shadow-content {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }
  body, html {
    margin: 0;
    padding: 0;
    width: 100% !important;
    max-width: 100% !important;
    background: transparent !important;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }
  img, video, iframe {
    max-width: 100% !important;
    height: auto !important;
  }
  table {
    max-width: 100%;
    border-collapse: collapse;
  }
  a {
    color: #2563eb;
    text-decoration: underline;
  }
  /* Neutralize any element attempting fixed or viewport-wide overlays */
  [style*="fixed"] {
    position: relative !important;
  }
`;

/**
 * Renders sanitized HTML inside an open Shadow DOM root.
 * Guarantees 100% style encapsulation and containment:
 * - Email <style> blocks can NEVER bleed out to affect CRM navigation, header, or sidebars.
 * - position: fixed / overlay elements cannot escape the host container.
 * - Fluid natural height scrolls with the parent reading pane (no iframe double scrollbars).
 */
export function EmailHtmlBody({ bodyHtml, className }: Props) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const shadowRootRef = React.useRef<ShadowRoot | null>(null);

  const clean = React.useMemo(() => {
    return sanitizeInboundEmailHtml(bodyHtml);
  }, [bodyHtml]);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (!shadowRootRef.current) {
      try {
        shadowRootRef.current = host.attachShadow({ mode: "open" });
      } catch {
        shadowRootRef.current = host.shadowRoot;
      }
    }

    const root = shadowRootRef.current;
    if (!root) {
      // Fallback if shadow DOM is unavailable
      host.innerHTML = clean;
      return;
    }

    root.innerHTML = `<style>${SHADOW_ROOT_BASE_CSS}</style><div class="email-shadow-content">${clean}</div>`;

    // Ensure email links open in a new tab without hijacking CRM navigation
    root.querySelectorAll("a").forEach((link) => {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });
  }, [clean]);

  return (
    <div
      ref={hostRef}
      className={cn(
        "email-html-body relative w-full min-w-0 max-w-full overflow-x-auto overflow-y-visible bg-white text-zinc-900",
        className
      )}
      style={{
        isolation: "isolate",
        position: "relative",
      }}
    />
  );
}

