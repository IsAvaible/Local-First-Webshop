import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using `clsx` and resolves conflicting Tailwind classes with `twMerge`.
 *
 * Accepts any values supported by `clsx` (strings, arrays, objects, null, undefined).
 * Returns a single, merged class name string with Tailwind priority rules applied.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
