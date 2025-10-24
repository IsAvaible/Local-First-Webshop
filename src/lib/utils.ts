import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// These are the simple, non-recursive JSON value types
export type JsonPrimitive = string | number | boolean | null;

// This is a JSON object
export interface JsonObject {
  [key: string]: JsonValue;
}

// This is a JSON array
export type JsonArray = JsonValue[];

// This is the complete type for any valid JSON value
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
