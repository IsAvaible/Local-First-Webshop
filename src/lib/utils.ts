import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DrizzleQueryError } from "drizzle-orm/errors";
import type { TRPCErrorShape } from "@trpc/server";

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

// --- Custom Field Humanization Utilities ---
/**
 * Format a custom field value for display in the UI.
 * The function is intentionally forgiving and will fall back to sensible
 * stringification for unexpected shapes.
 */
export function humanizeCustomFieldValue(
  value: JsonValue | undefined,
  fieldType?: string,
  locale = "de-DE"
): string {
  if (value === undefined || value === null) return "";

  try {
    switch (fieldType) {
      case "number": {
        if (typeof value === "number") {
          return new Intl.NumberFormat(locale).format(value);
        }
        const n = Number(value as string);
        return Number.isNaN(n)
          ? // eslint-disable-next-line @typescript-eslint/no-base-to-string
            String(value)
          : new Intl.NumberFormat(locale).format(n);
      }

      case "date": {
        const d = typeof value === "string" ? new Date(value) : null;
        if (d && !Number.isNaN(d.getTime()))
          return d.toLocaleDateString(locale);
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        return String(value);
      }

      case "boolean":
        return (value as boolean) ? "Yes" : "No";

      case "select":
      case "text":
      default: {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
      }
    }
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return String(value);
  }
}

/**
 * Convenience helper to produce a labeled value like "FieldName: HumanizedValue".
 */
export function humanizeCustomFieldLabel(
  fieldName: string | undefined,
  value: JsonValue | undefined,
  fieldType?: string,
  locale = "de-DE"
) {
  const human = humanizeCustomFieldValue(value, fieldType, locale);
  return fieldName ? `${fieldName}: ${human}` : human;
}

/**
 * Type guard to check if an error is a DrizzleQueryError with a database error code.
 * @param error The error to check.
 */
export function isDatabaseError(
  error: unknown
): error is DrizzleQueryError & { cause: { code: string } } {
  return (
    error instanceof DrizzleQueryError &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    "code" in error.cause
  );
}

export interface TrpcRequestEnvelope<T> {
  json: T;
  meta?: unknown;
}

export interface TrpcResponseEnvelope<T> {
  result: {
    data: {
      json: T;
    };
  };
}

export interface TrpcErrorResponseEnvelope<T = TRPCErrorShape> {
  error: {
    json: T;
  };
}
