import { AuthorizationError } from "../errors";

const MESSAGE = "Managed by an external system";

/** Products and categories synced by a plugin are read-only for users (catalog spec § 2.2). */
export function assertProductWritable(product: { source: string } | null): void {
  if (product?.source === "EXTERNAL") throw new AuthorizationError(MESSAGE);
}
