import type { TenantInfo } from './tenant'

export interface AuthUser {
  userId: string
  tenantId: string
  tenantSlug: string
}

export interface AuthSession {
  user: AuthUser
  tenant: TenantInfo
  loggedInAt: string
}
