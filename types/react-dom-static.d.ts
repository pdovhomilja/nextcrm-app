// The pinned types-react-dom@19.0.0-rc.1 package does not ship declarations
// for the react-dom/static entry point.
declare module "react-dom/static" {
  import type { ReactNode } from "react";

  export function prerender(
    children: ReactNode,
    options?: object
  ): Promise<{ prelude: ReadableStream<Uint8Array> }>;
}
