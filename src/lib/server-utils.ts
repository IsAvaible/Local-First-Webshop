import { auth } from "@/lib/auth";

export function parseCookies(
  cookieHeader: string | null
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(/;\s*/);
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const name = decodeURIComponent(part.slice(0, idx).trim());
    out[name] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function serializeCookie(
  name: string,
  value: string,
  options: {
    httpOnly?: boolean;
    maxAgeSeconds?: number;
    path?: string;
    sameSite?: "Lax" | "Strict" | "None";
    secure?: boolean;
  } = {}
) {
  const {
    httpOnly = true,
    maxAgeSeconds = 60 * 60 * 24 * 90, // 90 days
    path = "/",
    sameSite = "Lax",
    secure = process.env.NODE_ENV === "production"
  } = options;
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `Max-Age=${maxAgeSeconds}`,
    `SameSite=${sameSite}`
  ];
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export async function getSession(headers: Headers) {
  return auth.api.getSession({ headers });
}

export function ensureGuestSessionId(headers: Headers): {
  guestSessionId: string;
  setCookieHeader?: string;
} {
  const cookies = parseCookies(headers.get("cookie"));
  let guestSessionId = cookies.guest_session_id;
  if (!guestSessionId) {
    // Node has crypto globally
    guestSessionId = (globalThis.crypto?.randomUUID?.() ??
      Math.random().toString(36).slice(2)) as string;
    const setCookieHeader = serializeCookie("guest_session_id", guestSessionId);
    return { guestSessionId, setCookieHeader };
  }
  return { guestSessionId };
}
