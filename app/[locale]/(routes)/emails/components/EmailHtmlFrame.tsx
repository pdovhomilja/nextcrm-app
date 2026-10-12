"use client";

import * as React from "react";

const IFRAME_STYLES = `
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    padding: 20px 24px 28px;
    line-height: 1.55;
    color: #18181b;
    font-size: 14px;
    word-wrap: break-word;
    overflow-x: hidden;
  }
  img, table { max-width: 100% !important; height: auto !important; }
  table { border-collapse: collapse; }
  a { color: #0369a1; }
  blockquote {
    margin: 14px 0;
    padding: 12px 14px;
    border-left: 3px solid #0ea5e9;
    background: #f4f4f5;
    border-radius: 0 10px 10px 0;
  }
`;

type Props = {
  bodyHtml: string;
};

export function EmailHtmlFrame({ bodyHtml }: Props) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = React.useState(320);

  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${IFRAME_STYLES}</style></head><body>${bodyHtml}</body></html>`;

  const measure = React.useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      const body = doc?.body;
      const html = doc?.documentElement;
      if (!body || !html) return;
      const next = Math.max(body.scrollHeight, html.scrollHeight, body.offsetHeight);
      setHeight(Math.min(Math.max(next + 8, 120), 8000));
    } catch {
      /* sandbox */
    }
  }, []);

  React.useEffect(() => {
    measure();
  }, [bodyHtml, measure]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
      <div className="overflow-hidden rounded-xl border border-border/50 bg-white shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          title="Email body"
          onLoad={measure}
          className="block w-full border-0 bg-white"
          style={{ height: `${height}px` }}
        />
      </div>
    </div>
  );
}
