import type { EnquiryDecision } from '../types/enquiry'

function storageKey(tenantId: string) {
  return `hilton-inquiries.${tenantId}.decisions`
}

export function loadDecisions(tenantId: string): Record<string, EnquiryDecision> {
  if (!tenantId) return {}
  try {
    const raw = localStorage.getItem(storageKey(tenantId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, EnquiryDecision>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveDecision(
  tenantId: string,
  enquiryId: number,
  decision: EnquiryDecision,
): Record<string, EnquiryDecision> {
  const next = { ...loadDecisions(tenantId), [String(enquiryId)]: decision }
  localStorage.setItem(storageKey(tenantId), JSON.stringify(next))
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
