export type EnquiryDecision = 'accepted' | 'rejected'

export interface SalesEnquiry {
  id: number
  conversationId: string
  enquiryType: string
  enquiry: string
  guestName: string
  guestEmail: string
  guestPhone: string
  createdAt: string
  updatedAt: string
  decision?: EnquiryDecision
}

export interface EnquiryFeed {
  count: number
  enquiries: SalesEnquiry[]
}

export type SortKey = 'id' | 'enquiryType' | 'guestName' | 'createdAt'
export type SortDir = 'asc' | 'desc'
