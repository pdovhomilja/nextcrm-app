"use client";

import React from "react";
import DOMPurify from "dompurify";

interface SafeHtmlRendererProps {
  html: string;
}

export const SafeHtmlRenderer = ({ html }: SafeHtmlRendererProps) => {
  // Check if running in a browser environment before using DOMPurify
  if (typeof window === "undefined") {
    return null;
  }

  const sanitizedHtml = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: [],
    FORBID_ATTR: [],
    ADD_TAGS: [],
    ADD_ATTR: [],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
};
