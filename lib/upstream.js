function causeCode(error) {
  const cause = error && typeof error === 'object' ? error.cause : null
  if (!cause || typeof cause !== 'object') return ''
  return typeof cause.code === 'string' ? cause.code : ''
}

export function formatUpstreamError(error, fallback) {
  const raw = error instanceof Error ? error.message : ''
  const code = causeCode(error)
  const blob = `${raw} ${code}`.toLowerCase()

  if (
    blob.includes('timeout') ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    code === 'ETIMEDOUT' ||
    code === 'UND_ERR_HEADERS_TIMEOUT'
  ) {
    return `${fallback} timed out. Try again.`
  }

  if (
    raw === 'fetch failed' ||
    raw === 'Failed to fetch' ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'UND_ERR_SOCKET'
  ) {
    return `${fallback} is unreachable right now. Try again in a moment.`
  }

  return raw || `${fallback} failed.`
}

export async function fetchWithRetry(url, init = {}, attempts = 3) {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetch(url, init)
    } catch (error) {
      lastError = error
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)))
      }
    }
  }
  throw lastError
}
