import type { EnquiryDecision } from '../types/enquiry'

const STORAGE_KEY = 'hilton-t5-sales-enquiries.decisions'

export function loadDecisions(): Record<string, EnquiryDecision> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, EnquiryDecision>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveDecision(enquiryId: number, decision: EnquiryDecision): Record<string, EnquiryDecision> {
  const next = { ...loadDecisions(), [String(enquiryId)]: decision }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function applyDecisions<T extends { id: number; decision?: EnquiryDecision }>(
  rows: T[],
  decisions: Record<string, EnquiryDecision>,
): T[] {
  return rows.map((row) => ({
    ...row,
    decision: decisions[String(row.id)] ?? row.decision,
  }))
}
