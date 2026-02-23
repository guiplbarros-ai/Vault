/**
 * Input sanitization helpers for PostgREST / Supabase queries.
 *
 * Prevents LIKE-wildcard injection and ensures IDs from untrusted sources
 * conform to expected formats before being interpolated into filter strings.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Escapes LIKE/ILIKE special characters (%, _, \) in user-supplied search
 * terms so they are treated as literal characters by PostgreSQL.
 *
 * Usage:
 *   .ilike('nome', `%${escapeLikePattern(userInput)}%`)
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&')
}

/**
 * Validates that a string is a valid UUID v4 (or similar 8-4-4-4-12 hex format).
 * Throws if invalid.  Use this as a guard before interpolating IDs into
 * PostgREST `.or()` filter strings.
 */
export function assertUUID(value: string, label = 'ID'): void {
  if (!UUID_RE.test(value)) {
    throw new Error(`Invalid UUID for ${label}: ${value}`)
  }
}

/**
 * Returns true if the value matches UUID format.
 */
export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value)
}

/**
 * Sanitizes an external ID (e.g. from Pluggy API) by stripping any character
 * that is not alphanumeric, dash, or underscore.  This prevents injection
 * when the ID is interpolated into a PostgREST filter string.
 */
export function sanitizeExternalId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '')
}
