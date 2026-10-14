/**
 * Compatibility layer — tenants are managed customers in the platform store.
 */
import {
  getCustomerBySlug,
  listCustomers,
  publicCustomer,
  resolveCustomer,
} from './customers.js'

export async function listTenants({ enabledOnly = true } = {}) {
  return listCustomers({ enabledOnly })
}

export async function getTenantBySlug(slug) {
  const customer = await getCustomerBySlug(slug)
  if (!customer || customer.enabled === false) return null
  return customer
}

export async function getDefaultTenant() {
  const slug = process.env.DEFAULT_TENANT_SLUG?.trim() || 'hilton-t5'
  return (await getTenantBySlug(slug)) ?? (await listTenants())[0] ?? null
}

export function publicTenant(tenant) {
  return publicCustomer(tenant)
}

export async function resolveTenant({ slug, host } = {}) {
  return resolveCustomer({ slug, host, allowDisabled: false })
}
