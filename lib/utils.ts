import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Format number as USD with en-US locale to avoid SSR/client hydration mismatch */
export function formatCurrency(value: number): string {
  return value.toLocaleString("en-US");
}

