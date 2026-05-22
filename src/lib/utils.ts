import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Convert a DB timestamp (Date | null) to a YYYY-MM-DD string or undefined. */
function tsToDateStr(ts: Date | null): string | undefined {
  return ts ? ts.toISOString().split("T")[0] : undefined;
}
