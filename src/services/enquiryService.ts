import type { EnquiryFeed, SalesEnquiry } from '../types/enquiry'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function asNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function normalizeEnquiry(raw: unknown, index: number): SalesEnquiry | null {
  const obj = asRecord(raw)
  if (!obj) return null
  return {
    id: asNumber(obj.id) || index + 1,
    conversationId: asString(obj.conversationId ?? obj.conversation_id),
    enquiryType: asString(obj.enquiryType ?? obj.enquiry_type ?? obj.type),
    enquiry: asString(obj.enquiry ?? obj.message ?? obj.body ?? obj.text),
    guestName: asString(obj.guestName ?? obj.guest_name ?? obj.name),
    guestEmail: asString(obj.guestEmail ?? obj.guest_email ?? obj.email),
    guestPhone: asString(obj.guestPhone ?? obj.guest_phone ?? obj.phone),
    createdAt: asString(obj.createdAt ?? obj.created_at),
    updatedAt: asString(obj.updatedAt ?? obj.updated_at),
  }
}

function parseFeed(body: unknown): SalesEnquiry[] {
  const obj = asRecord(body)
  const list = Array.isArray(body)
    ? body
    : Array.isArray(obj?.enquiries)
      ? obj.enquiries
      : Array.isArray(obj?.data)
        ? obj.data
        : []
  return list
    .map((row, index) => normalizeEnquiry(row, index))
    .filter((row): row is SalesEnquiry => row != null)
}

export async function fetchSalesEnquiries(): Promise<EnquiryFeed> {
  let response: Response
  try {
    response = await fetch('/api/enquiries', { method: 'GET' })
  } catch {
    throw new Error('Sales enquiry feed is unreachable right now. Try again in a moment.')
  }

  const text = await response.text()
  let parsed: unknown = null
  if (text.trim()) {
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new Error('Enquiry API returned invalid JSON.')
    }
  }

  if (!response.ok) {
    const err = asRecord(parsed)
    throw new Error(asString(err?.error) || `Could not load enquiries (${response.status})`)
  }

  const enquiries = parseFeed(parsed)
  return { count: enquiries.length, enquiries }
}
