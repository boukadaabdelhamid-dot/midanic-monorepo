import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

/**
 * Phase 1 networking glue.
 *
 * The mobile app reuses the SAME backend as the ERP/web store through the
 * shared `@workspace/api-client-react` package. We only need to point that
 * client at the user-supplied ERP URL via `setBaseUrl`, then verify the
 * server answers on a public, unauthenticated endpoint.
 */

const HEALTH_PATH = "/api/healthz";
const CONNECT_TIMEOUT_MS = 10_000;

/** Trim whitespace and strip a trailing slash. */
export function normalizeUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

/** Accept only well-formed http(s) URLs with a host. */
export function isValidServerUrl(raw: string): boolean {
  const value = normalizeUrl(raw);
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

/** Register the base URL with the shared API client. */
export function applyServerUrl(url: string | null): void {
  setBaseUrl(url ? normalizeUrl(url) : null);
}

// ---------------------------------------------------------------------------
// Auth token wiring
// ---------------------------------------------------------------------------

let _authToken: string | null = null;
let _getterInstalled = false;

/** Update the in-memory bearer token used for authenticated API calls. */
export function setAuthToken(token: string | null): void {
  _authToken = token;
}

/**
 * Install a single global getter that supplies the current bearer token to
 * the shared API client. Safe to call multiple times — only wires once.
 */
export function installAuthTokenGetter(): void {
  if (_getterInstalled) return;
  setAuthTokenGetter(() => _authToken);
  _getterInstalled = true;
}

export type ConnectionResult = {
  ok: boolean;
  message: string;
};

/** Hit a public health endpoint to confirm the server is reachable. */
export async function testConnection(url: string): Promise<ConnectionResult> {
  const base = normalizeUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);

  try {
    const response = await fetch(`${base}${HEALTH_PATH}`, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });

    if (response.ok) {
      return { ok: true, message: "تم الاتصال بالخادم بنجاح" };
    }

    return {
      ok: false,
      message: `استجاب الخادم برمز ${response.status}. تحقّق من الرابط`,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      message: aborted
        ? "انتهت مهلة الاتصال. تأكّد من الرابط واتصال الإنترنت"
        : "تعذّر الوصول إلى الخادم. تحقّق من الرابط",
    };
  } finally {
    clearTimeout(timer);
  }
}
