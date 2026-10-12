export interface TranscriptTurn {
  role?: string
  message?: string
  time_in_call_secs?: number
}

export interface ConversationDetail {
  conversation_id?: string
  status?: string
  has_audio?: boolean
  call_duration_secs?: number
  start_time_unix_secs?: number
  transcript?: TranscriptTurn[]
}
