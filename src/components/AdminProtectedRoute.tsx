import { Navigate, Outlet } from 'react-router-dom'
import { platformAuthService } from '../services/platformAuthService'

export function AdminProtectedRoute() {
  if (!platformAuthService.isAuthenticated()) {
    return <Navigate to="/admin/login" replace />
  }
  return <Outlet />
}
