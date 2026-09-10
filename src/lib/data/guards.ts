import type { AppRole } from "./types";

/**
 * Shared error/permission helpers — imported by both the local and
 * Supabase repository implementations (kept dependency-free to avoid
 * import cycles between repository.ts and supabase-repo.ts).
 */

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const canWriteFinances = (r: AppRole) => r === "admin" || r === "treasurer";
export const canWriteEvents = (r: AppRole) => r === "admin";
export const canWriteMembers = (r: AppRole) => r === "admin";
export const canManageSettings = (r: AppRole) => r === "admin";

export function assertPermission(
  ok: boolean,
  message = "You do not have permission for this action",
) {
  if (!ok) throw new HttpError(403, message);
}
