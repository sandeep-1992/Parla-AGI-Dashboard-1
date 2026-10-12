import { useEffect, useState } from 'react'
import { fetchConversationDetail, getConversationAudioUrl } from '../services/conversationService'
import type { ConversationDetail } from '../types/conversation'

interface ConversationModalProps {
  conversationId: string | null
  onClose: () => void
}

function formatDuration(seconds?: number): string {
  if (seconds == null || !Number.isFinite(seconds)) return ''
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

function roleLabel(role?: string): string {
  const raw = (role ?? 'unknown').toLowerCase()
  if (raw === 'agent' || raw === 'assistant') return 'Agent'
  if (raw === 'user' || raw === 'customer') return 'Guest'
  return role ?? 'Unknown'
}

export function ConversationModal({ conversationId, onClose }: ConversationModalProps) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!conversationId) {
      setDetail(null)
      setError('')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    fetchConversationDetail(conversationId)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load conversation')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [conversationId])

  if (!conversationId) return null

  const audioUrl = getConversationAudioUrl(conversationId)
  const showAudio = detail?.has_audio !== false

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="conversation-title">
      <div className="modal modal-wide">
        <div className="modal-head">
          <div>
            <p className="modal-kicker">Conversation</p>
            <h3 id="conversation-title">Call recording &amp; transcript</h3>
            <p className="muted">{conversationId}</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        {loading && <p className="muted">Loading conversation…</p>}
        {error && <p className="banner-error">{error}</p>}

        {!loading && detail && (
          <>
            {(detail.status || detail.call_duration_secs != null) && (
              <div className="detail-grid">
                {detail.status ? (
                  <div className="detail-card">
                    <p className="kpi-label">Status</p>
                    <p className="detail-strong">{detail.status}</p>
                  </div>
                ) : null}
                {detail.call_duration_secs != null ? (
                  <div className="detail-card">
                    <p className="kpi-label">Duration</p>
                    <p className="detail-strong">{formatDuration(detail.call_duration_secs)}</p>
                  </div>
                ) : null}
              </div>
            )}

            {showAudio && (
              <div className="enquiry-body">
                <p className="kpi-label">Conversation audio</p>
                <audio className="conversation-audio" controls preload="none" src={audioUrl}>
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}

            <div className="enquiry-body">
              <p className="kpi-label">Text conversation</p>
              {(detail.transcript ?? []).length === 0 ? (
                <p className="muted">No transcript is available for this call.</p>
              ) : (
                <ul className="transcript-list">
                  {(detail.transcript ?? []).map((turn, index) => (
                    <li key={`${turn.role}-${index}`} className={`transcript-turn transcript-${(turn.role ?? 'unknown').toLowerCase()}`}>
                      <div className="transcript-meta">
                        <strong>{roleLabel(turn.role)}</strong>
                        {turn.time_in_call_secs != null ? (
                          <span className="muted">{formatDuration(turn.time_in_call_secs)}</span>
                        ) : null}
                      </div>
                      <p>{turn.message || '—'}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
