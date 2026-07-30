/**
 * Small id helper. crypto.randomUUID is available in every browser we target,
 * but the fallback keeps things working in older tablet browsers.
 */
export function createId(prefix = 'id') {
  const random =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${random}`;
}
