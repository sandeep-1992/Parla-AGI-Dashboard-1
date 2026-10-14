import { Navigate, Outlet, useParams } from 'react-router-dom'
import { authService } from '../services/authService'
import { resolveClientTenantSlug, tenantPath } from '../services/tenantService'

export function ProtectedRoute() {
  const { tenantSlug } = useParams()
  const session = authService.getSession()

  if (!session) {
    const slug = tenantSlug || resolveClientTenantSlug()
    return <Navigate to={tenantPath(slug, '/login')} replace />
  }

  if (tenantSlug && session.user.tenantSlug !== tenantSlug.toLowerCase()) {
    return <Navigate to={tenantPath(session.user.tenantSlug, '/enquiries')} replace />
  }

  return <Outlet />
}
