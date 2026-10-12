import type { SalesEnquiry } from '../types/enquiry'
import { displayEnquiryText, displayEnquiryType, displayGuestName } from './format'

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function enquiriesToCsv(rows: SalesEnquiry[]): string {
  const header = [
    'id',
    'enquiryType',
    'conversationId',
    'guestName',
    'guestPhone',
    'guestEmail',
    'enquiry',
    'createdAt',
  ]
  const lines = [
    header.join(','),
    ...rows.map((row) =>
      [
        String(row.id),
        displayEnquiryType(row),
        row.conversationId,
        displayGuestName(row),
        row.guestPhone,
        row.guestEmail,
        displayEnquiryText(row),
        row.createdAt,
      ]
        .map(csvEscape)
        .join(','),
    ),
  ]
  return lines.join('\n')
}

export function downloadText(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
