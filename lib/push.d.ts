export function getVapidPublicKey(): string
export function addPushSubscription(subscription: unknown): Promise<number>
export function dispatchNewEnquiryPushes(): Promise<{
  notified: number
  newEnquiries?: number
  firstSync?: boolean
  skipped?: string
}>
