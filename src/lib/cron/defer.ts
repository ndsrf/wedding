/**
 * defer() — run a promise in background after the HTTP response is sent.
 *
 * On Vercel (all plans, including Hobby):
 *   Uses waitUntil() from @vercel/functions. The runtime keeps the execution
 *   context alive until the promise settles (up to the function's max duration).
 *   waitUntil() must be called synchronously — this module imports it at the
 *   top level so the call is always synchronous within the request lifecycle.
 *
 * Non-Vercel (docker / standard / cloudflare):
 *   Falls back to plain fire-and-forget. The in-process scheduler (60s interval
 *   in instrumentation.ts) acts as the safety net for any work that gets lost.
 *
 * Usage:
 *   defer(triggerAlert({ ... }));   // instead of:  void triggerAlert({ ... })
 */

// Top-level import so waitUntil is resolved synchronously at call time.
// On non-Vercel environments the package is still installed but waitUntil()
// may throw when called outside a request context — that's handled below.
import { waitUntil } from '@vercel/functions';

export function defer(promise: Promise<unknown>): void {
  try {
    waitUntil(promise);
  } catch {
    // Not inside a Vercel request context (e.g. called from instrumentation.ts
    // startup code, or non-Vercel platform). The promise is already running;
    // any uncompleted DB deliveries will be retried by the scheduler/cron.
  }
}
