import type { TenantInfo } from '../types/tenant'

const FALLBACK: TenantInfo = {
  id: 'hilton-t5',
  slug: 'hilton-t5',
  name: 'Hilton Heathrow Terminal 5',
  productName: 'Hilton Inquiries',
  logoUrl: '/hilton-logo.png',
}

export function BrandMark({
  compact = false,
  tenant,
}: {
  compact?: boolean
  tenant?: TenantInfo | null
}) {
  const active = tenant ?? FALLBACK
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <img className="brand-logo" src={active.logoUrl || FALLBACK.logoUrl} alt={active.name} />
      <span className="brand-copy">
        <span className="brand-name">{active.name}</span>
        <span className="brand-product">{active.productName}</span>
      </span>
    </div>
  )
}
