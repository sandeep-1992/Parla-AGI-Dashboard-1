type IconProps = { className?: string }

export function IconBell({ className }: IconProps) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9a6 6 0 1112 0c0 3.2.8 4.6 1.5 5.5.3.4 0 1.5-.7 1.5H5.2c-.7 0-1-.1.7-1.5C5.2 13.6 6 12.2 6 9z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 18a2 2 0 004 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function IconEye({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.8 12S6.2 6.5 12 6.5 21.2 12 21.2 12 17.8 17.5 12 17.5 2.8 12 2.8 12z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function IconCopy({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function IconMail({ className }: IconProps) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 7.5l8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconDepartment({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8.2v4.1l2.8 1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconClock({ className }: IconProps) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v4.2l2.6 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconChevron({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconPhone({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.2 3.8h2.4l1.1 3-1.5 1.2a12.5 12.5 0 006.3 6.3l1.2-1.5 3 1.1v2.4c0 .8-.6 1.5-1.4 1.6-7.6.7-14-5.7-13.3-13.3.1-.8.8-1.4 1.6-1.4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconRefresh({ className }: IconProps) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 12a8 8 0 10-2.2 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M20 7v5h-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconFilter({ className }: IconProps) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 16.5L20 20.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function IconCsv({ className }: IconProps) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3.5h7l5 5V20a1.5 1.5 0 01-1.5 1.5H7A1.5 1.5 0 015.5 20V5A1.5 1.5 0 017 3.5z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 3.5V9h5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 15h2.2M13.2 15H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconJson({ className }: IconProps) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 5c-2 0-3 1.5-3 3.5v2c0 1-1 1.5-1 1.5s1 .5 1 1.5v2c0 2 1 3.5 3 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 5c2 0 3 1.5 3 3.5v2c0 1 1 1.5 1 1.5s-1 .5-1 1.5v2c0 2-1 3.5-3 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function IconSignOut({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 4H6a2 2 0 00-2 2v12a2 2 0 002 2h4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 8l4 4-4 4M19 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconPin({ className }: IconProps) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 4.5h6l.8 6.2 2.2 2.3v1.5H6v-1.5l2.2-2.3L9 4.5z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 14.5V20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function IconCalendar({ className }: IconProps) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 10h16M8 3.5v4M16 3.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function IconPeople({ className }: IconProps) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.8 17.5c.7-2.4 2.4-3.6 4.2-3.6s3.5 1.2 4.2 3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16.2" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15.2 17.5c.5-1.6 1.6-2.5 3-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.4 12.2l2.4 2.4 4.8-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconClose({ className }: IconProps) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconSort({ className }: IconProps) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M3 4.5L6 1.5 9 4.5M3 7.5L6 10.5 9 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconEdit({ className }: IconProps) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4.2L19 9.2 14.8 5 4 15.8V20z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13.2 6.6l4.2 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h14M9 7V5h6v2M8 7l.8 12h6.4L16 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconPower({ className }: IconProps) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7.2 6.4a7 7 0 109.6 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconDuplicate({ className }: IconProps) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="11" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function IconLink({ className }: IconProps) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 14a4 4 0 010-5.7l2-2a4 4 0 015.7 5.7l-1 1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M14 10a4 4 0 010 5.7l-2 2a4 4 0 01-5.7-5.7l1-1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
