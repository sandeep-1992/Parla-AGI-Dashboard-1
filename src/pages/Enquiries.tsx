import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { ConversationModal } from '../components/ConversationModal'
import {
  IconCheck,
  IconClose,
  IconCsv,
  IconFilter,
  IconPin,
  IconRefresh,
  IconSearch,
} from '../components/Icons'
import { usePagedRows } from '../hooks/usePagedRows'
import { useToast } from '../hooks/useToast'
import { authService } from '../services/authService'
import { applyDecisions, loadDecisions, saveDecision } from '../services/decisionService'
import { fetchSalesEnquiries } from '../services/enquiryService'
import type { EnquiryDecision, SalesEnquiry, SortKey } from '../types/enquiry'
import { downloadText, enquiriesToCsv } from '../utils/export'
import {
  displayEnquiryText,
  displayEnquiryType,
  displayGuestName,
  formatReceived,
  guestInitial,
  hasPhone,
  isSalesBooking,
} from '../utils/format'

const AUTO_SYNC_MS = 30_000
const PAGE_SIZES = [10, 25, 50]

export function EnquiriesPage() {
  const navigate = useNavigate()
  const user = authService.getCurrentUser()
  const { showToast } = useToast()

  const [enquiries, setEnquiries] = useState<SalesEnquiry[]>([])
  const [decisions, setDecisions] = useState<Record<string, EnquiryDecision>>(() => loadDecisions())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [autoSync, setAutoSync] = useState(true)
  const sortKey: SortKey = 'id'
  const [pageSize, setPageSize] = useState(10)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [syncedAt, setSyncedAt] = useState<Date | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const hasLoadedRef = useRef(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    if (!silent) setError('')
    try {
      const feed = await fetchSalesEnquiries()
      setEnquiries(applyDecisions(feed.enquiries, loadDecisions()))
      setSyncedAt(new Date())
      setError('')
      hasLoadedRef.current = true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load enquiries'
      if (!silent || !hasLoadedRef.current) {
        setError(message)
      }
      if (!silent) setEnquiries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!autoSync) return
    const id = window.setInterval(() => {
      void load(true)
    }, AUTO_SYNC_MS)
    return () => window.clearInterval(id)
  }, [autoSync, load])

  const rows = useMemo(() => applyDecisions(enquiries, decisions), [enquiries, decisions])

  const typeOptions = useMemo(() => {
    const set = new Set(rows.map(displayEnquiryType).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const next = rows.filter((row) => {
      const type = displayEnquiryType(row)
      if (typeFilter !== 'all' && type !== typeFilter) return false
      if (!q) return true
      const haystack = [
        String(row.id),
        type,
        row.conversationId,
        displayGuestName(row),
        row.guestPhone,
        row.guestEmail,
        displayEnquiryText(row),
        row.decision ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })

    return [...next].sort((a, b) => {
      if (sortKey === 'id') return b.id - a.id
      if (sortKey === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      const left = sortKey === 'guestName' ? displayGuestName(a) : displayEnquiryType(a)
      const right = sortKey === 'guestName' ? displayGuestName(b) : displayEnquiryType(b)
      return left.localeCompare(right)
    })
  }, [rows, search, typeFilter, sortKey])

  const resetKey = `${search}|${typeFilter}|${sortKey}|${pageSize}|${filtered.length}`
  const {
    pageRows,
    page,
    pageCount,
    total,
    canPrev,
    canNext,
    rangeStart,
    rangeEnd,
    goPrev,
    goNext,
  } = usePagedRows(filtered, pageSize, resetKey)

  const stats = useMemo(() => {
    const sales = rows.filter(isSalesBooking).length
    const phone = rows.filter(hasPhone).length
    return { total: rows.length, sales, phone }
  }, [rows])

  function decide(enquiry: SalesEnquiry, decision: EnquiryDecision) {
    setDecisions(saveDecision(enquiry.id, decision))
    showToast(
      decision === 'accepted' ? `Enquiry #${enquiry.id} accepted` : `Enquiry #${enquiry.id} rejected`,
      decision === 'accepted' ? 'success' : 'info',
    )
  }

  function exportCsv() {
    downloadText(
      `sales-enquiries-${new Date().toISOString().slice(0, 10)}.csv`,
      enquiriesToCsv(filtered),
      'text/csv;charset=utf-8',
    )
    showToast('CSV downloaded', 'success')
  }

  function handleLogout() {
    setLoggingOut(true)
    authService.logout()
    navigate('/login', { replace: true })
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <AppShell userId={user.userId} onLogout={handleLogout} loggingOut={loggingOut}>
      <main className="page">
        <div className="page-head">
          <div>
            <h1>Hilton Inquiries</h1>
            <p className="page-lead">
              Guest room requests, corporate quotes, and concierge inquiries for Hilton Heathrow Terminal 5.
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => void load()} disabled={loading}>
            Fetch Latest
          </button>
        </div>

        <section className="kpi-grid">
          <article className="kpi-card">
            <p className="kpi-label">Total Enquiries</p>
            <p className="kpi-value">{stats.total}</p>
            <p className="kpi-sub">records</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">Sales &amp; Bookings</p>
            <p className="kpi-value kpi-success">{stats.sales}</p>
            <p className="kpi-sub kpi-success">active requests</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">Direct Phone Outreach</p>
            <p className="kpi-value">{stats.phone}</p>
            <p className="kpi-sub">contactable</p>
          </article>
        </section>

        <section className="panel">
          <div className="toolbar">
            <label className="search-wrap">
              <IconSearch />
              <input
                className="search-input"
                placeholder="Search enquiries by keyword, guest, phone, or ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <div className="toolbar-actions">
              <label className="select-wrap">
                <IconFilter />
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="all">All Enquiry Types</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className={`chip-toggle ${autoSync ? 'on' : ''}`}>
                <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
                <span className="status-dot" />
                Auto-sync
              </label>

              <button type="button" className="btn btn-ghost" onClick={() => void load()} disabled={loading}>
                <IconRefresh /> Refresh
              </button>
              <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={filtered.length === 0}>
                <IconCsv /> CSV
              </button>
            </div>
          </div>

          <div className="table-meta">
            <p>
              Showing {total === 0 ? 0 : rangeStart}–{rangeEnd} of {total} inquiries
            </p>
            <p className="muted">
              {loading ? 'Syncing…' : syncedAt ? `Synced ${syncedAt.toLocaleTimeString()}` : 'Not synced yet'}
            </p>
          </div>

          {error && <p className="banner-error">{error}</p>}

          <div className="table-wrap desktop-table">
            <table className="data-table feed-table">
              <tbody>
                {!loading && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty">No enquiries match this view.</div>
                    </td>
                  </tr>
                )}
                {loading && enquiries.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty">Loading latest enquiries…</div>
                    </td>
                  </tr>
                )}
                {pageRows.map((row) => (
                  <EnquiryRow
                    key={row.id}
                    row={row}
                    onOpenConversation={setConversationId}
                    onDecide={decide}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="card-list">
            {loading && enquiries.length === 0 && <div className="empty">Loading latest enquiries…</div>}
            {!loading && pageRows.length === 0 && <div className="empty">No enquiries match this view.</div>}
            {pageRows.map((row) => (
              <EnquiryCard
                key={row.id}
                row={row}
                onOpenConversation={setConversationId}
                onDecide={decide}
              />
            ))}
          </div>

          <div className="table-pagination">
            <label className="page-size">
              Rows per page:
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">
              Page {page + 1} of {pageCount}
            </p>
            <div className="pager-btns">
              <button type="button" className="btn btn-ghost btn-sm" disabled={!canPrev} onClick={goPrev}>
                ‹
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={!canNext} onClick={goNext}>
                ›
              </button>
            </div>
          </div>
        </section>
      </main>

      <ConversationModal conversationId={conversationId} onClose={() => setConversationId(null)} />
    </AppShell>
  )
}

function EnquiryRow({
  row,
  onOpenConversation,
  onDecide,
}: {
  row: SalesEnquiry
  onOpenConversation: (id: string) => void
  onDecide: (enquiry: SalesEnquiry, decision: EnquiryDecision) => void
}) {
  const received = formatReceived(row.createdAt)
  const live = isSalesBooking(row)
  const contact = [row.guestPhone, row.guestEmail].filter(Boolean).join(' - ')

  return (
    <tr>
      <td>
        <div className="type-cell">
          <span className="row-pin" aria-hidden="true">
            <IconPin />
          </span>
          <span className={`status-dot ${live ? 'dot-live' : ''}`} />
          <div className="type-copy">
            <p className="cell-title">{displayEnquiryType(row)}</p>
            {row.conversationId ? (
              <button
                type="button"
                className="conv-link"
                onClick={() => onOpenConversation(row.conversationId)}
              >
                {row.conversationId}
              </button>
            ) : (
              <p className="cell-sub">#{row.id}</p>
            )}
          </div>
        </div>
      </td>
      <td>
        <div className="guest-cell">
          <span className="guest-avatar">{guestInitial(displayGuestName(row))}</span>
          <div>
            <p className="cell-title">{displayGuestName(row)}</p>
            <p className="cell-sub">{contact || 'No contact details'}</p>
          </div>
        </div>
      </td>
      <td>
        <p className="preview-line">{displayEnquiryText(row)}</p>
      </td>
      <td className="time-cell">
        <p className="cell-title">{received.absolute}</p>
        {received.relative ? <p className="cell-sub">{received.relative}</p> : null}
      </td>
      <td>
        <DecisionButtons enquiry={row} onDecide={onDecide} />
      </td>
    </tr>
  )
}

function EnquiryCard({
  row,
  onOpenConversation,
  onDecide,
}: {
  row: SalesEnquiry
  onOpenConversation: (id: string) => void
  onDecide: (enquiry: SalesEnquiry, decision: EnquiryDecision) => void
}) {
  const received = formatReceived(row.createdAt)
  const live = isSalesBooking(row)

  return (
    <article className="enquiry-card">
      <div className="enquiry-card-top">
        <div className="type-cell">
          <span className={`status-dot ${live ? 'dot-live' : ''}`} />
          <span className="type-pill">{displayEnquiryType(row)}</span>
        </div>
      </div>
      <div className="guest-cell">
        <span className="guest-avatar">{guestInitial(displayGuestName(row))}</span>
        <div>
          <h2>{displayGuestName(row)}</h2>
          <p className="cell-sub">
            {[row.guestPhone, row.guestEmail].filter(Boolean).join(' · ') || 'No contact details'}
          </p>
        </div>
      </div>
      {row.conversationId ? (
        <button type="button" className="conv-link" onClick={() => onOpenConversation(row.conversationId)}>
          {row.conversationId}
        </button>
      ) : null}
      <p className="preview-line">{displayEnquiryText(row)}</p>
      <div className="enquiry-card-foot">
        <span className="muted">
          {received.absolute}
          {received.relative ? ` · ${received.relative}` : ''}
        </span>
        <DecisionButtons enquiry={row} onDecide={onDecide} />
      </div>
    </article>
  )
}

function DecisionButtons({
  enquiry,
  onDecide,
}: {
  enquiry: SalesEnquiry
  onDecide: (enquiry: SalesEnquiry, decision: EnquiryDecision) => void
}) {
  return (
    <div className="decision-actions">
      <button
        type="button"
        className={`btn-decision btn-accept ${enquiry.decision === 'accepted' ? 'on' : ''}`}
        onClick={() => onDecide(enquiry, 'accepted')}
      >
        <IconCheck /> Accept
      </button>
      <button
        type="button"
        className={`btn-decision btn-reject ${enquiry.decision === 'rejected' ? 'on' : ''}`}
        onClick={() => onDecide(enquiry, 'rejected')}
      >
        <IconClose /> Reject
      </button>
    </div>
  )
}
