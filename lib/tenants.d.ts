export type TenantRecord = {
  id: string
  slug: string
  name: string
  productName: string
  logoUrl: string
  username: string
  password: string
  webhookUrl: string
  enabled?: boolean
  createdAt?: string
  updatedAt?: string
}

export type PublicTenant = {
  id: string
  slug: string
  name: string
  productName: string
  logoUrl: string
  enabled?: boolean
}

export function listTenants(options?: { enabledOnly?: boolean }): Promise<TenantRecord[]>
export function getTenantBySlug(slug: string): Promise<TenantRecord | null>
export function getDefaultTenant(): Promise<TenantRecord | null>
export function publicTenant(tenant: TenantRecord | null | undefined): PublicTenant | null
export function resolveTenant(input?: {
  slug?: string
  host?: string
}): Promise<TenantRecord | null>
