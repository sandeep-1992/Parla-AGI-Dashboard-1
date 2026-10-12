import type { SalesEnquiry } from '../types/enquiry'

export const FALLBACK_ENQUIRY_TYPE = 'General Inquiry'
export const FALLBACK_GUEST_NAME = 'Anonymous Guest'
export const FALLBACK_ENQUIRY_TEXT = 'No inquiry text provided.'

export function displayEnquiryType(enquiry: SalesEnquiry): string {
  return enquiry.enquiryType.trim() || FALLBACK_ENQUIRY_TYPE
}

export function displayGuestName(enquiry: SalesEnquiry): string {
  return enquiry.guestName.trim() || FALLBACK_GUEST_NAME
}

export function displayEnquiryText(enquiry: SalesEnquiry): string {
  return enquiry.enquiry.trim() || FALLBACK_ENQUIRY_TEXT
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'A'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function formatReceived(iso: string): { absolute: string; relative: string } {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return { absolute: 'Unknown', relative: '' }
  }

  const datePart = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timePart = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  const absolute = `${datePart}, ${timePart}`

  const diffMs = Date.now() - date.getTime()
  const abs = Math.abs(diffMs)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  let relative: string
  if (abs < minute) relative = 'just now'
  else if (abs < hour) {
    const n = Math.round(abs / minute)
    relative = `${n}m ago`
  } else if (abs < day) {
    const n = Math.round(abs / hour)
    relative = `${n}h ago`
  } else {
    const n = Math.round(abs / day)
    relative = `${n}d ago`
  }

  return { absolute, relative }
}

export function hasPhone(enquiry: SalesEnquiry): boolean {
  return enquiry.guestPhone.trim().length > 0
}

export function isSalesBooking(enquiry: SalesEnquiry): boolean {
  const type = displayEnquiryType(enquiry).toLowerCase()
  return type.includes('sales') || type.includes('reservation') || type.includes('booking')
}

export function truncateText(text: string, max = 72): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (compact.length <= max) return compact
  return `${compact.slice(0, max - 1)}…`
}

export function truncateId(id: string, max = 24): string {
  if (!id) return ''
  if (id.length <= max) return id
  return `${id.slice(0, max)}…`
}

export function guestInitial(name: string): string {
  const cleaned = name.trim() || FALLBACK_GUEST_NAME
  return (cleaned[0] ?? 'A').toUpperCase()
}

export type EnquiryChip = { kind: 'date' | 'people'; label: string }

const MONTHS =
  'January|February|March|April|May|June|July|August|September|October|November|December'

export function extractEnquiryChips(enquiry: string): EnquiryChip[] {
  const text = enquiry.replace(/\s+/g, ' ')
  const chips: EnquiryChip[] = []
  const seen = new Set<string>()

  const dateMatches = text.matchAll(
    new RegExp(
      `(?:${MONTHS})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})(?:,?\\s+\\d{4})?`,
      'gi',
    ),
  )
  for (const match of dateMatches) {
    const raw = match[0].replace(/,/g, '').replace(/\s+\d{4}$/, '').replace(/(st|nd|rd|th)/gi, '')
    const label = raw.replace(/\s+/g, ' ').trim()
    const key = label.toLowerCase()
    if (!label || seen.has(key)) continue
    seen.add(key)
    chips.push({ kind: 'date', label })
    if (chips.length >= 2) return chips
  }

  const peopleMatches = text.matchAll(
    /(\d+)\s*(?:people|person|guests?|adults?|children|child|attendees)/gi,
  )
  for (const match of peopleMatches) {
    const n = match[1]
    if (!n) continue
    const unit = match[0].toLowerCase().includes('adult')
      ? Number(n) === 1
        ? 'adult'
        : 'adults'
      : match[0].toLowerCase().includes('child')
        ? Number(n) === 1
          ? 'child'
          : 'children'
        : Number(n) === 1
          ? 'person'
          : 'people'
    const label = `${n} ${unit}`
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    chips.push({ kind: 'people', label })
    if (chips.length >= 2) break
  }

  return chips
}
