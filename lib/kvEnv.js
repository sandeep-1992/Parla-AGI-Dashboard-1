/** Prefer Vercel KV names; also accept Upstash console names. */
export function kvRestConfig() {
  const url = (
    process.env.KV_REST_API_URL?.trim() ||
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    ''
  ).replace(/\/$/, '')
  const token =
    process.env.KV_REST_API_TOKEN?.trim() ||
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    ''
  if (!url || !token) return null
  return { url, token }
}

export function hasKvStore() {
  return kvRestConfig() != null
}
