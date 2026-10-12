import { useEffect, useMemo, useState } from 'react'

export function usePagedRows<T>(rows: T[], pageSize: number, resetKey = '') {
  const [page, setPage] = useState(0)
  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1)

  useEffect(() => {
    setPage(0)
  }, [resetKey])

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1))
  }, [page, pageCount])

  const pageRows = useMemo(() => {
    const start = page * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, page, pageSize])

  return {
    pageRows,
    page,
    pageCount,
    total,
    canPrev: page > 0,
    canNext: page < pageCount - 1,
    rangeStart: total === 0 ? 0 : page * pageSize + 1,
    rangeEnd: Math.min(total, (page + 1) * pageSize),
    goPrev: () => setPage((p) => Math.max(0, p - 1)),
    goNext: () => setPage((p) => Math.min(pageCount - 1, p + 1)),
    setPage,
  }
}
