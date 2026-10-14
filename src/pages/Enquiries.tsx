import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { ConversationModal } from '../components/ConversationModal'
import {
  IconBell,
  IconCheck,
  IconChevron,
  IconClock,
  IconClose,
  IconCsv,
  IconDepartment,
  IconFilter,
  IconMail,
  IconPhone,
  IconRefresh,
  IconSearch,
} from '../components/Icons'
import { usePagedRows } from '../hooks/usePagedRows'
import { useToast } from '../hooks/useToast'
import { authService } from '../services/authService'
import { applyDecisions, loadDecisions, saveDecision } from '../services/decisionService'
import { fetchSalesEnquiries } from '../services/enquiryService'
import {
  enableEnquiryNotifications,
  notifyNewEnquiries,
  notificationsWanted,
  setNotificationsWanted,
} from '../services/notificationService'
import type { EnquiryDecision, SalesEnquiry, SortKey } from '../types/enquiry'
import { downloadText, enquiriesToCsv } from '../utils/export'
import {
  displayEnquiryText,
  displayEnquiryType,
  displayGuestName,
  departmentAllocation,
  departmentDonutSegments,
  displayRequestBody,
  enquiryDepartment,
  formatReceived,
  guestInitial,
} from '../utils/format'

type StatusFilter = 'all' | 'pending' | 'accepted' | 'resolved'

const AUTO_SYNC_MS = 20_000
const HIDDEN_SYNC_MS = 45_000
const PAGE_SIZES = [10, 25, 50]
const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'resolved', label: 'Resolved' },
]

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const sortKey: SortKey = 'id'
  const [pageSize, setPageSize] = useState(10)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [syncedAt, setSyncedAt] = useState<Date | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [alertsOn, setAlertsOn] = useState(() => notificationsWanted())
  const hasLoadedRef = useRef(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    if (!silent) setError('')
    try {
      const feed = await fetchSalesEnquiries()
      const next = applyDecisions(feed.enquiries, loadDecisions())
      await notifyNewEnquiries(next)
      setEnquiries(next)
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
    if (!alertsOn) return
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    void enableEnquiryNotifications()
  }, [alertsOn])

  useEffect(() => {
    let id = 0
    const arm = () => {
      window.clearInterval(id)
      const ms = document.hidden ? HIDDEN_SYNC_MS : AUTO_SYNC_MS
      id = window.setInterval(() => {
        void load(true)
      }, ms)
    }
    arm()
    const onVisibility = () => {
      if (!document.hidden) void load(true)
      arm()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [load])

  const rows = useMemo(() => applyDecisions(enquiries, decisions), [enquiries, decisions])

  const typeOptions = useMemo(() => {
    const set = new Set(rows.map(displayEnquiryType).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      const type = displayEnquiryType(row)
      if (typeFilter !== 'all' && type !== typeFilter) return false
      if (statusFilter === 'pending' && row.decision) return false
      if (statusFilter === 'accepted' && row.decision !== 'accepted') return false
      if (statusFilter === 'resolved' && row.decision !== 'rejected') return false
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
  }, [rows, search, typeFilter, statusFilter])

  const filtered = useMemo(() => {
    const next =
      departmentFilter === 'all'
        ? scoped
        : scoped.filter((row) => enquiryDepartment(row) === departmentFilter)

    return [...next].sort((a, b) => {
      if (sortKey === 'id') return b.id - a.id
      if (sortKey === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      const left = sortKey === 'guestName' ? displayGuestName(a) : displayEnquiryType(a)
      const right = sortKey === 'guestName' ? displayGuestName(b) : displayEnquiryType(b)
      return left.localeCompare(right)
    })
  }, [scoped, departmentFilter, sortKey])

  const resetKey = `${search}|${typeFilter}|${statusFilter}|${departmentFilter}|${sortKey}|${pageSize}|${filtered.length}`
  const {
    pageRows,
    page,
    pageCount,
    total,
    canPrev,
    canNext,
    goPrev,
    goNext,
  } = usePagedRows(filtered, pageSize, resetKey)

  const allocation = useMemo(() => departmentAllocation(scoped), [scoped])
  const allocationTotal = scoped.length
  const donutSegments = useMemo(
    () => departmentDonutSegments(allocation, allocationTotal),
    [allocation, allocationTotal],
  )
  const activePct = useMemo(() => {
    if (allocationTotal === 0) return 0
    const active = scoped.filter((row) => row.decision !== 'rejected').length
    return Math.round((active / allocationTotal) * 100)
  }, [scoped, allocationTotal])

  function selectDepartment(name: string) {
    setDepartmentFilter((current) => (current === name ? 'all' : name))
  }

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

  async function toggleAlerts() {
    if (alertsOn) {
      setNotificationsWanted(false)
      setAlertsOn(false)
      showToast('Phone alerts off', 'info')
      return
    }
    const permission = await enableEnquiryNotifications()
    if (permission === 'granted') {
      setAlertsOn(true)
      showToast('Phone alerts on. A test notification was sent — check your phone shade.', 'success')
      return
    }
    setAlertsOn(false)
    if (permission === 'needs-homescreen') {
      showToast(
        'On iPhone: Share → Add to Home Screen, open that icon, then tap Alerts on.',
        'error',
      )
      return
    }
    showToast(
      permission === 'unsupported'
        ? 'This phone browser cannot show alerts. Use Chrome/Safari home-screen app.'
        : 'Allow notifications in the phone prompt, then try again.',
      'error',
    )
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

        <section className="alloc-card">
          <div className="alloc-head">
            <span className="alloc-icon">
              <IconDepartment />
            </span>
            <h2>Department Allocation</h2>
          </div>
          <div className="alloc-body">
            <div className="alloc-donut">
              <svg className="alloc-svg" viewBox="0 0 100 100" role="img" aria-label="Department allocation chart">
                {donutSegments.length === 0 ? (
                  <circle cx="50" cy="50" r="37" fill="none" stroke="#e2e8f0" strokeWidth="16" />
                ) : (
                  donutSegments.map((segment) => {
                    const selected = departmentFilter === segment.name
                    const dimmed = departmentFilter !== 'all' && !selected
                    return (
                      <path
                        key={segment.name}
                        className={`alloc-seg ${selected ? 'on' : ''} ${dimmed ? 'dim' : ''}`}
                        d={segment.path}
                        fill={segment.color}
                        onClick={() => selectDepartment(segment.name)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Filter ${segment.name}`}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            selectDepartment(segment.name)
                          }
                        }}
                      />
                    )
                  })
                )}
              </svg>
              <button
                type="button"
                className="alloc-hole"
                onClick={() => setDepartmentFilter('all')}
                aria-label="Clear department filter"
              >
                <p className="alloc-total">{allocationTotal}</p>
                <p className="alloc-kicker">Inquiries</p>
                <p className="alloc-active">{activePct}% active</p>
              </button>
            </div>
            <ul className="alloc-legend">
              {allocation.length === 0 ? (
                <li className="alloc-empty">No enquiries in this view</li>
              ) : (
                allocation.map((slice) => {
                  const selected = departmentFilter === slice.name
                  return (
                    <li key={`${slice.name}-${slice.count}-${slice.percent}`}>
                      <button
                        type="button"
                        className={`alloc-row ${selected ? 'on' : ''}`}
                        onClick={() => selectDepartment(slice.name)}
                      >
                        <span className="alloc-dot" style={{ background: slice.color }} />
                        <span className="alloc-name">{slice.name}</span>
                        <span className="alloc-pct">{slice.percent}%</span>
                        <span className="alloc-count">{slice.count}</span>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
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

              <button
                type="button"
                className={`chip-toggle ${alertsOn ? 'on' : ''}`}
                onClick={() => void toggleAlerts()}
              >
                <IconBell />
                {alertsOn ? 'Alerts on' : 'Alerts off'}
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-round"
                onClick={() => void load()}
                disabled={loading}
                aria-label="Refresh"
              >
                <IconRefresh />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-round"
                onClick={exportCsv}
                disabled={filtered.length === 0}
                aria-label="Download CSV"
              >
                <IconCsv />
              </button>
            </div>

            <div className="status-seg" role="tablist" aria-label="Enquiry status">
              {STATUS_FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === item.id}
                  className={`status-seg-btn ${item.id} ${statusFilter === item.id ? 'on' : ''}`}
                  onClick={() => setStatusFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="table-meta">
            <p>
              Showing <strong>{total}</strong> of <strong>{rows.length}</strong> inquiries
            </p>
            <p className="muted">
              {loading ? 'Syncing…' : syncedAt ? `Synced ${syncedAt.toLocaleTimeString()}` : 'Not synced yet'}
            </p>
          </div>

          {error && <p className="banner-error">{error}</p>}

          <div className="ticket-list">
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

function typeTone(type: string): string {
  const tones = ['tone-teal', 'tone-blue', 'tone-green', 'tone-indigo']
  let hash = 0
  for (const ch of type) hash += ch.charCodeAt(0)
  return tones[hash % tones.length] ?? 'tone-teal'
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
  const name = displayGuestName(row)
  const phone = row.guestPhone.trim()
  const email = row.guestEmail.trim()

  return (
    <article className={`ticket ${typeTone(displayEnquiryType(row))}`}>
      <div className="ticket-head">
        <div className="ticket-title-block">
          <div className="ticket-title-row">
            <span className="ticket-dot" aria-hidden="true" />
            <h2>{displayEnquiryType(row)}</h2>
            {row.decision === 'accepted' ? <span className="status-pill accepted">Accepted</span> : null}
            {row.decision === 'rejected' ? <span className="status-pill rejected">Rejected</span> : null}
          </div>
          {row.conversationId ? (
            <button
              type="button"
              className="conv-link"
              onClick={() => onOpenConversation(row.conversationId)}
            >
              {row.conversationId}
            </button>
          ) : (
            <p className="conv-link static">#{row.id}</p>
          )}
        </div>

        <div className="ticket-aside">
          <div className="ticket-time">
            <p>{received.absolute}</p>
            {received.relative ? (
              <p className="ticket-relative">
                <IconClock /> {received.relative}
              </p>
            ) : null}
          </div>
          <DecisionButtons enquiry={row} onDecide={onDecide} />
          {row.conversationId ? (
            <button
              type="button"
              className="ticket-chevron"
              aria-label="Open conversation"
              onClick={() => onOpenConversation(row.conversationId)}
            >
              <IconChevron />
            </button>
          ) : null}
        </div>
      </div>

      <div className="ticket-body">
        <div className="ticket-guest">
          <span className="guest-avatar">{guestInitial(name)}</span>
          <div>
            <p className="guest-name">{name}</p>
            {phone ? (
              <p className="contact-line">
                <IconPhone /> {phone}
              </p>
            ) : null}
            {email ? (
              <p className="contact-line">
                <IconMail /> {email}
              </p>
            ) : null}
            {!phone && !email ? <p className="contact-line">No contact details</p> : null}
          </div>
        </div>

        <div className="ticket-request">
          <p className="request-kicker">Request details</p>
          <p className="request-text">{displayRequestBody(row)}</p>
        </div>
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
