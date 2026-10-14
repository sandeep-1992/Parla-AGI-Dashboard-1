import type { CustomerInput, CustomerRecord } from '../types/customer'
import { platformAuthService } from './platformAuthService'

async function parseError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
  return body.error || body.message || `Request failed (${response.status})`
}

export async function listAdminCustomers(): Promise<{ customers: CustomerRecord[]; durable: boolean }> {
  const response = await fetch('/api/admin/customers', {
    headers: { ...platformAuthService.authHeaders() },
  })
  if (!response.ok) throw new Error(await parseError(response))
  const body = (await response.json()) as { customers?: CustomerRecord[]; durable?: boolean }
  return {
    customers: Array.isArray(body.customers) ? body.customers : [],
    durable: Boolean(body.durable),
  }
}

export async function createAdminCustomer(input: CustomerInput): Promise<CustomerRecord> {
  const response = await fetch('/api/admin/customers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...platformAuthService.authHeaders(),
    },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error(await parseError(response))
  const body = (await response.json()) as { customer?: CustomerRecord }
  if (!body.customer) throw new Error('Customer was not returned.')
  return body.customer
}

export async function updateAdminCustomer(
  id: string,
  input: Partial<CustomerInput>,
): Promise<CustomerRecord> {
  const response = await fetch(`/api/admin/customers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...platformAuthService.authHeaders(),
    },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error(await parseError(response))
  const body = (await response.json()) as { customer?: CustomerRecord }
  if (!body.customer) throw new Error('Customer was not returned.')
  return body.customer
}

export async function deleteAdminCustomer(id: string): Promise<void> {
  const response = await fetch(`/api/admin/customers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...platformAuthService.authHeaders() },
  })
  if (!response.ok) throw new Error(await parseError(response))
}

export async function pingWebhook(url: string): Promise<{ ok: boolean; ms: number | null; error?: string }> {
  const response = await fetch('/api/admin/webhook-ping', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...platformAuthService.authHeaders(),
    },
    body: JSON.stringify({ url }),
  })
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    ms?: number | null
    error?: string
  }
  if (!response.ok) throw new Error(body.error || 'Ping failed')
  return { ok: Boolean(body.ok), ms: body.ms ?? null, error: body.error }
}
