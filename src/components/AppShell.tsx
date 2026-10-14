import type { ReactNode } from 'react'
import type { TenantInfo } from '../types/tenant'
import { BrandMark } from './BrandMark'
import { IconSignOut } from './Icons'
import { initials } from '../utils/format'

interface AppShellProps {
  userId: string
  tenant?: TenantInfo | null
  onLogout: () => void
  loggingOut?: boolean
  children: ReactNode
}

export function AppShell({ userId, tenant, onLogout, loggingOut = false, children }: AppShellProps) {
  return (
    <div className="app-root">
      <header className="topbar">
        <div className="topbar-left">
          <BrandMark compact tenant={tenant} />
        </div>

        <div className="topbar-right">
          <div className="user-capsule">
            <span className="user-avatar">{initials(userId)}</span>
            <span className="user-name">{userId}</span>
          </div>

          <button type="button" className="btn btn-ghost btn-signout" onClick={onLogout} disabled={loggingOut}>
            <IconSignOut />
            <span>{loggingOut ? 'Signing out…' : 'Sign Out'}</span>
          </button>
        </div>
      </header>
      {children}
    </div>
  )
}
