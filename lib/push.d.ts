export function getVapidPublicKey(): string
export function addPushSubscription(subscription: unknown, tenantId?: string): Promise<number>
export function dispatchNewEnquiryPushes(tenantSlug?: string): Promise<{
  notified: number
  newEnquiries?: number
  firstSync?: boolean
  skipped?: string
  tenant?: string
  results?: unknown[]
}>
