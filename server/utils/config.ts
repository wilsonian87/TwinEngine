/**
 * Configuration Utility
 *
 * Provides secure environment variable loading with
 * production safeguards and development defaults.
 */

/**
 * Require an environment variable, with optional development default.
 * Throws in production if the variable is not set.
 */
export function requireEnvVar(name: string, devDefault?: string): string {
  const value = process.env[name];
  if (value) return value;

  if (process.env.NODE_ENV === "production") {
    throw new Error(`Required environment variable ${name} is not set`);
  }

  if (devDefault !== undefined) {
    console.warn(`[SECURITY] Using dev default for ${name}. Set this in production!`);
    return devDefault;
  }

  throw new Error(`Required environment variable ${name} is not set`);
}

/**
 * Get an optional environment variable with a fallback.
 * Unlike requireEnvVar, this does not throw or warn.
 */
export function getEnvVar(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

/**
 * Check if debug logging is enabled.
 * Set DEBUG=true or DEBUG=1 to enable verbose logging.
 */
export const isDebug = process.env.DEBUG === "true" || process.env.DEBUG === "1";

/**
 * Log a debug message (only when DEBUG is enabled).
 * Use for verbose operational logs that aren't needed in production.
 */
export function debugLog(prefix: string, message: string, data?: unknown): void {
  if (!isDebug) return;
  const timestamp = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  if (data !== undefined) {
    console.log(`${timestamp} [${prefix}] ${message}`, data);
  } else {
    console.log(`${timestamp} [${prefix}] ${message}`);
  }
}
