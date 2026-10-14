import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AdminProtectedRoute } from './components/AdminProtectedRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ToastContainer } from './components/Toast'
import { ToastProvider } from './hooks/useToast'
import { AdminCustomersPage } from './pages/admin/AdminCustomers'
import { AdminLoginPage } from './pages/admin/AdminLogin'
import { EnquiriesPage } from './pages/Enquiries'
import { LoginPage } from './pages/Login'
import { authService } from './services/authService'
import { resolveClientTenantSlug, tenantPath } from './services/tenantService'

function RootRedirect() {
  const session = authService.getSession()
  if (session?.user.tenantSlug) {
    return <Navigate to={tenantPath(session.user.tenantSlug, '/enquiries')} replace />
  }
  return <Navigate to="/admin/login" replace />
}

function LegacyLoginRedirect() {
  const session = authService.getSession()
  const slug = session?.user.tenantSlug || resolveClientTenantSlug()
  return <Navigate to={tenantPath(slug, '/login')} replace />
}

function LegacyEnquiriesRedirect() {
  const session = authService.getSession()
  const slug = session?.user.tenantSlug || resolveClientTenantSlug()
  return <Navigate to={tenantPath(slug, '/enquiries')} replace />
}

function TenantLoginRoute() {
  const { tenantSlug = '' } = useParams()
  return <LoginPage tenantSlug={tenantSlug.toLowerCase()} />
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LegacyLoginRedirect />} />
          <Route path="/enquiries" element={<LegacyEnquiriesRedirect />} />
          <Route path="/dashboard" element={<LegacyEnquiriesRedirect />} />

          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin" element={<AdminCustomersPage />} />
            <Route path="/admin/customers" element={<Navigate to="/admin" replace />} />
          </Route>

          <Route path="/t/:tenantSlug/login" element={<TenantLoginRoute />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/t/:tenantSlug/enquiries" element={<EnquiriesPage />} />
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </ToastProvider>
  )
}
