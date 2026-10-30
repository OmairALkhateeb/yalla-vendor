/**
 * Backend + realtime configuration.
 * Override with VITE_API_BASE_URL / VITE_BROADCAST_AUTH_URL / VITE_PUSHER_KEY / VITE_PUSHER_CLUSTER.
 */
const env = import.meta.env as Record<string, string | undefined>;

/** Server root (without /api). Default comes from the driver/rider apps. */
export const SERVER_URL = (env.VITE_API_BASE_URL ?? "https://ez.aazer.app").replace(/\/+$/, "");

/** All vendor-panel endpoints live under /api/vendor. */
export const API_BASE = `${SERVER_URL}/api/vendor`;

/**
 * Pusher private-channel auth endpoint (docs/PUSHER_REALTIME.md §1). The backend
 * sends no CORS headers on /broadcasting/auth, so the browser calls the app's own
 * same-origin proxy (src/routes/broadcasting.auth.ts), which forwards it server-side.
 */
export const BROADCAST_AUTH_URL = env.VITE_BROADCAST_AUTH_URL ?? "/broadcasting/auth";

/**
 * Currency the backend stores amounts in. The `currency` field from GET /store wins;
 * VITE_CURRENCY overrides it (use it if the API reports the wrong code).
 */
export const CURRENCY_OVERRIDE = env.VITE_CURRENCY?.trim().toUpperCase() || null;
export const DEFAULT_CURRENCY = "USD";

export const PUSHER_KEY = env.VITE_PUSHER_KEY ?? "0b71d893968ff1df6b86";
export const PUSHER_CLUSTER = env.VITE_PUSHER_CLUSTER ?? "us2";
