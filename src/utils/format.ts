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

export function displayRequestBody(enquiry: SalesEnquiry): string {
  const lines = enquiry.enquiry
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(guest\s*name|phone(?:\s*number)?|e-?mail(?:\s*address)?)\s*:/i.test(line))

  const text = lines.join('\n').trim()
  return text || displayEnquiryText(enquiry)
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

const DEPARTMENT_COLORS: Record<string, string> = {
  'Receptions and Maintenance': '#38bdf8',
  'Sales & Reservations': '#22c55e',
  'Terminal 5 Transit & Shuttle': '#8b5cf6',
  'Concierge & VIP': '#f59e0b',
  'Dining & Room Service': '#ef4444',
}

const FALLBACK_COLORS = ['#14b8a6', '#0ea5e9', '#64748b', '#f97316']

export function enquiryDepartment(enquiry: SalesEnquiry): string {
  const type = displayEnquiryType(enquiry)
  const t = type.toLowerCase()
  if (
    t.includes('reception') ||
    t.includes('maintenance') ||
    t.includes('plumb') ||
    t.includes('electric') ||
    t.includes('hvac') ||
    t.includes('rfid') ||
    t.includes('key')
  ) {
    return 'Receptions and Maintenance'
  }
  if (t.includes('sales') || t.includes('reservation') || t.includes('booking') || t.includes('banquet')) {
    return 'Sales & Reservations'
  }
  if (t.includes('transit') || t.includes('shuttle') || t.includes('chauffeur') || t.includes('fast track') || t.includes('fasttrack')) {
    return 'Terminal 5 Transit & Shuttle'
  }
  if (t.includes('concierge') || t.includes('vip')) {
    return 'Concierge & VIP'
  }
  if (
    t.includes('dining') ||
    t.includes('house keep') ||
    t.includes('housekeeping') ||
    t.includes('room service') ||
    t.includes('food') ||
    t.includes('linen')
  ) {
    return 'Dining & Room Service'
  }
  return type.split(/\s[-–—]\s/)[0]?.trim() || 'General Inquiry'
}

export type DepartmentSlice = {
  name: string
  count: number
  percent: number
  color: string
}

export function departmentAllocation(enquiries: SalesEnquiry[]): DepartmentSlice[] {
  const counts = new Map<string, number>()
  for (const row of enquiries) {
    const name = enquiryDepartment(row)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  const total = enquiries.length
  const names = [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b))
  let fallback = 0

  return names.map((name) => {
    const count = counts.get(name) ?? 0
    const color = DEPARTMENT_COLORS[name] ?? FALLBACK_COLORS[fallback++ % FALLBACK_COLORS.length] ?? '#64748b'
    return {
      name,
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100),
      color,
    }
  })
}

export function departmentDonutFill(slices: DepartmentSlice[], total: number): string {
  if (total === 0 || slices.length === 0) return 'conic-gradient(#e2e8f0 0 100%)'
  let acc = 0
  const stops = slices.map((slice) => {
    const start = (acc / total) * 100
    acc += slice.count
    const end = (acc / total) * 100
    return `${slice.color} ${start}% ${end}%`
  })
  return `conic-gradient(${stops.join(', ')})`
}

export type DonutSegment = DepartmentSlice & {
  path: string
}

function polar(cx: number, cy: number, radius: number, angleDeg: number) {
  const radians = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  }
}

function donutArcPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  startAngle: number,
  endAngle: number,
) {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  const outerStart = polar(cx, cy, outer, startAngle)
  const outerEnd = polar(cx, cy, outer, endAngle)
  const innerEnd = polar(cx, cy, inner, endAngle)
  const innerStart = polar(cx, cy, inner, startAngle)
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outer} ${outer} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${inner} ${inner} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}

export function departmentDonutSegments(
  slices: DepartmentSlice[],
  total: number,
  outer = 46,
  inner = 28,
): DonutSegment[] {
  if (total <= 0) return []
  let angle = 0
  return slices.map((slice, index) => {
    const isLast = index === slices.length - 1
    const sweep = isLast ? 360 - angle : (slice.count / total) * 360
    const startAngle = angle
    const endAngle = angle + Math.max(sweep, 0.01)
    angle = endAngle
    return {
      ...slice,
      path: donutArcPath(50, 50, outer, inner, startAngle, endAngle),
    }
  })
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
