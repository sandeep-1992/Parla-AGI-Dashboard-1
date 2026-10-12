export function formatUpstreamError(error: unknown, fallback: string): string
export function fetchWithRetry(
  url: string,
  init?: RequestInit,
  attempts?: number,
): Promise<Response>
