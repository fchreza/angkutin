import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gabungkan class Tailwind dengan aman (yang terakhir menang). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
