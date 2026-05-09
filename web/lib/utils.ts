import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Escape user-supplied strings before injecting them into HTML.
 *
 * Use whenever a value that originates outside our codebase (KML files,
 * API responses, drawn-field metadata) is interpolated into a Leaflet
 * popup `bindPopup(...)` template-literal.
 */
export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
