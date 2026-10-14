export interface CustomerRecord {
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

export type CustomerInput = {
  slug: string
  name: string
  productName: string
  logoUrl: string
  username: string
  password: string
  webhookUrl: string
  enabled: boolean
}
