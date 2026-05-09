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

/**
 * Traduz mensagens de erro conhecidas vindas da API FastAPI (em inglês).
 * Mensagens não mapeadas são retornadas como recebidas.
 */
const ERROR_TRANSLATIONS: Record<string, string> = {
  "No Sentinel-2 products found":
    "Nenhum produto Sentinel-2 encontrado. Coloque uma imagem .SAFE em data/products/.",
  "Required Sentinel-2 file not found":
    "Arquivo Sentinel-2 necessário não encontrado.",
  "Internal processing error": "Erro interno de processamento.",
  "Internal experiment error": "Erro interno no experimento.",
  "Internal classification error": "Erro interno na classificação.",
  "Invalid product name format": "Formato de nome de produto inválido.",
  "Invalid product name": "Nome de produto inválido.",
  "Product not found": "Produto não encontrado.",
  "Invalid polygon geometry": "Geometria do polígono inválida.",
  "Invalid Sentinel-2 product name": "Nome de produto Sentinel-2 inválido.",
};

export function translateError(detail: unknown): string | null {
  if (typeof detail !== "string" || detail.length === 0) return null;
  return ERROR_TRANSLATIONS[detail] ?? detail;
}
