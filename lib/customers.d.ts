export type CustomerRecord = {
  id: string
  slug: string
  name: string
  productName: string
  logoUrl: string
  username: string
  password: string
  webhookUrl: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type PublicCustomer = {
  id: string
  slug: string
  name: string
  productName: string
  logoUrl: string
  enabled: boolean
}

export function normalizeCustomer(
  raw: unknown,
  options?: { keepId?: boolean },
): CustomerRecord | null
export function publicCustomer(customer: CustomerRecord | null | undefined): PublicCustomer | null
export function adminCustomer(customer: CustomerRecord | null | undefined): CustomerRecord | null
export function listCustomers(options?: { enabledOnly?: boolean }): Promise<CustomerRecord[]>
export function getCustomerBySlug(slug: string): Promise<CustomerRecord | null>
export function getCustomerById(id: string): Promise<CustomerRecord | null>
export function resolveCustomer(input?: {
  slug?: string
  host?: string
  allowDisabled?: boolean
}): Promise<CustomerRecord | null>
export function createCustomer(input: Partial<CustomerRecord>): Promise<CustomerRecord>
export function updateCustomer(id: string, input: Partial<CustomerRecord>): Promise<CustomerRecord>
export function deleteCustomer(id: string): Promise<void>
export function hasDurableCustomerStore(): boolean
