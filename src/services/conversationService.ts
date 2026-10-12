import type { ConversationDetail, TranscriptTurn } from '../types/conversation'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asTurns(value: unknown): TranscriptTurn[] {
  if (!Array.isArray(value)) return []
  return value.map((turn) => {
    const row = asRecord(turn)
    return {
      role: typeof row?.role === 'string' ? row.role : 'unknown',
      message: typeof row?.message === 'string' ? row.message : '',
      time_in_call_secs:
        typeof row?.time_in_call_secs === 'number' ? row.time_in_call_secs : undefined,
    }
  })
}

export async function fetchConversationDetail(conversationId: string): Promise<ConversationDetail> {
  let response: Response
  try {
    response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`)
  } catch {
    throw new Error('Conversation audio and transcript are unreachable right now. Try again in a moment.')
  }
  const text = await response.text()
  let parsed: unknown = null
  if (text.trim()) {
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new Error('Conversation API returned invalid JSON.')
    }
  }

  if (!response.ok) {
    const err = asRecord(parsed)
    throw new Error(
      (typeof err?.error === 'string' && err.error) ||
        `Could not load conversation (${response.status})`,
    )
  }

  const obj = asRecord(parsed) ?? {}
  return {
    conversation_id: typeof obj.conversation_id === 'string' ? obj.conversation_id : conversationId,
    status: typeof obj.status === 'string' ? obj.status : undefined,
    has_audio: obj.has_audio !== false,
    call_duration_secs: typeof obj.call_duration_secs === 'number' ? obj.call_duration_secs : undefined,
    start_time_unix_secs:
      typeof obj.start_time_unix_secs === 'number' ? obj.start_time_unix_secs : undefined,
    transcript: asTurns(obj.transcript),
  }
}

export function getConversationAudioUrl(conversationId: string): string {
  return `/api/conversations/${encodeURIComponent(conversationId)}/audio`
}
