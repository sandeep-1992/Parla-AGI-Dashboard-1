import type { TenantInfo } from '../types/tenant'

const DEFAULT_TENANT_SLUG = 'hilton-t5'

export function tenantPath(slug: string, path = '') {
  const clean = path.startsWith('/') ? path : path ? `/${path}` : ''
  return `/t/${slug}${clean}`
}

export function slugFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/t\/([^/]+)/)
  return match?.[1] ? decodeURIComponent(match[1]).toLowerCase() : null
}

export function slugFromHostname(hostname = window.location.hostname): string | null {
  const host = hostname.split(':')[0]?.toLowerCase() ?? ''
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.vercel.app')) {
    return null
  }
  const label = host.split('.')[0]
  if (!label || label === 'www' || label === 'app' || label === 'admin') return null
  return label
}

export function resolveClientTenantSlug(pathname = window.location.pathname): string {
  return slugFromPathname(pathname) || slugFromHostname() || DEFAULT_TENANT_SLUG
}

export async function fetchTenant(slug: string): Promise<TenantInfo | null> {
  const res = await fetch(`/api/tenants?slug=${encodeURIComponent(slug)}`)
  if (!res.ok) return null
  const body = (await res.json().catch(() => ({}))) as { tenant?: TenantInfo }
  return body.tenant ?? null
}
