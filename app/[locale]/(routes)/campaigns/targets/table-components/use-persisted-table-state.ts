"use client";

import * as React from "react";

/**
 * Back a piece of TanStack-table state with `localStorage` so it survives the
 * list component unmounting and remounting.
 *
 * `TargetsDataTable` lives in a Server Component page, so Next.js tears it down
 * when the viewer leaves the list to open a target and rebuilds it on return.
 * Plain `useState` therefore loses the viewer's filters, sorting and
 * rows-per-page on every round trip. This hook restores them.
 *
 * Design notes:
 * - Restore happens in a mount effect, NOT lazy `useState` init: reading
 *   `localStorage` during render would make the client's first render diverge
 *   from the server markup and trip a hydration mismatch.
 * - The first persist pass is skipped so the default value can never clobber a
 *   previously-saved value before the restore effect has run.
 * - Storage is per-origin, so `qa.crm…` and the production domain each keep
 *   their own saved view.
 * - `merge` lets a caller reconcile a saved value with current defaults — e.g.
 *   force a volatile field like `pageIndex` back to 0, or default a
 *   newly-added column to hidden for viewers whose saved prefs predate it.
 */
export function usePersistedTableState<T>(
  storageKey: string,
  defaultValue: T,
  options?: { merge?: (saved: T) => T }
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = React.useState<T>(defaultValue);
  const skipNextPersist = React.useRef(true);
  // `merge` is read inside a mount-only effect; keep the latest ref without
  // re-running restore when the caller passes a new inline function identity.
  const mergeRef = React.useRef(options?.merge);
  mergeRef.current = options?.merge;

  // Restore the saved value after mount; keep the default when storage is
  // empty, blocked, or holds unparseable JSON.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as T;
        const merge = mergeRef.current;
        setValue(merge ? merge(saved) : saved);
      }
    } catch {
      /* localStorage unavailable — keep the default */
    }
    // storageKey is a stable per-call-site constant; restore exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on change. The first invocation (initial default render) is skipped
  // so it cannot overwrite a saved value before the restore effect lands.
  React.useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* ignore persistence failures */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return [value, setValue];
}
