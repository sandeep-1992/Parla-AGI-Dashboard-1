export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <img
        className="brand-logo"
        src="/hilton-logo.png"
        alt="Hilton Hotels & Resorts"
      />
      <span className="brand-copy">
        <span className="brand-name">Hilton Heathrow Terminal 5</span>
        <span className="brand-product">Hilton Inquiries</span>
      </span>
    </div>
  )
}
