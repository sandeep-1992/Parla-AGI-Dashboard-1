export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 14c1.6-2.4 3.2-4 5.2-4.4 2.4-.5 3.6 2.2 5.6 2.2 2.1 0 3.4-3.8 5.2-5.8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path d="M8 18h.01M12 18h.01M16 18h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
      <span className="brand-copy">
        <span className="brand-name">Hilton Heathrow Terminal 5</span>
        <span className="brand-product">Hilton Inquiries</span>
      </span>
    </div>
  )
}
