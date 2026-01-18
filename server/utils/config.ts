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
