/**
 * Hook for admin CRUD pages with server-side pagination and search.
 * Extends the pattern of useAdminCrud but sends page/search params to the API
 * and tracks pagination state locally.
 *
 * Usage:
 *   const { data, loading, page, totalPages, totalCount, search,
 *           setPage, setSearch, create, update, remove, refresh } = useAdminPaginatedCrud(postersApi)
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { logActivity } from '../utils/activityLog'
import type { PaginatedResponse } from '../services/admin-api'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormData = Record<string, any>

interface PaginatedCrudApi<T> {
  listPaginated: (params?: Record<string, string | number | undefined>) => Promise<PaginatedResponse<T>>
  create: (data: Partial<T>) => Promise<T>
  update: (id: number, data: Partial<T>) => Promise<T>
  delete: (id: number) => Promise<unknown>
}

const PAGE_SIZE = 25

interface UseAdminPaginatedCrudResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  page: number
  totalPages: number
  totalCount: number
  search: string
  setPage: (p: number) => void
  setSearch: (q: string) => void
  create: (item: FormData) => Promise<T | null>
  update: (id: number, item: FormData) => Promise<T | null>
  remove: (id: number) => Promise<boolean>
  refresh: () => void
}

export function useAdminPaginatedCrud<T extends { id: number }>(
  apiService: PaginatedCrudApi<T>,
  extraParams?: Record<string, string | number | undefined>,
): UseAdminPaginatedCrudResult<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearchRaw] = useState('')
  const mountedRef = useRef(true)
  // Debounce timer ref for search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable serialization of extraParams so we can detect changes by value
  const extraParamsKey = useMemo(() => JSON.stringify(extraParams ?? {}), [extraParams])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const fetchData = useCallback(async (pageNum: number, searchQuery: string) => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string | number | undefined> = {
        page: pageNum,
        page_size: PAGE_SIZE,
        ...(extraParams ?? {}),
      }
      if (searchQuery) params.search = searchQuery
      const result = await apiService.listPaginated(params)
      if (mountedRef.current) {
        setData(result.results)
        setTotalCount(result.count)
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to load data'
        setError(msg)
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiService, extraParamsKey])

  // Re-fetch when page/search/filters change; reset to page 1 on filter change
  const prevExtraParamsKeyRef = useRef(extraParamsKey)
  useEffect(() => {
    mountedRef.current = true
    if (prevExtraParamsKeyRef.current !== extraParamsKey) {
      prevExtraParamsKeyRef.current = extraParamsKey
      if (page !== 1) {
        setPage(1) // will re-trigger this effect with page=1
        return      // skip fetch with stale page number
      }
    }
    fetchData(page, search)
    return () => { mountedRef.current = false }
  }, [page, fetchData, search])

  const setSearch = useCallback((q: string) => {
    setSearchRaw(q)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = window.setTimeout(() => {
      setPage(1)
    }, 300)
  }, [])

  const refresh = useCallback(() => {
    fetchData(page, search)
  }, [fetchData, page, search])

  const create = useCallback(async (item: FormData): Promise<T | null> => {
    const created = await apiService.create(item as Partial<T>)
    logActivity('created', (apiService as { resourceName?: string }).resourceName || 'item', (item as Record<string, string>).name || (item as Record<string, string>).title || 'item')
    // Refresh current page to show updated data
    fetchData(page, search)
    return created
  }, [apiService, fetchData, page, search])

  const update = useCallback(async (id: number, item: FormData): Promise<T | null> => {
    const updated = await apiService.update(id, item as Partial<T>)
    logActivity('updated', (apiService as { resourceName?: string }).resourceName || 'item', (item as Record<string, string>).name || (item as Record<string, string>).title || 'item')
    setData(prev => prev.map(d => d.id === id ? updated : d))
    return updated
  }, [apiService])

  const remove = useCallback(async (id: number): Promise<boolean> => {
    try {
      await apiService.delete(id)
    } catch (err: any) {
      // 404 means already deleted — not an error
      if (err?.response?.status !== 404) throw err
    }
    logActivity('deleted', (apiService as { resourceName?: string }).resourceName || 'item', `ID ${id}`)
    // Refresh to update pagination counts
    fetchData(page, search)
    return true
  }, [apiService, fetchData, page, search])

  return { data, loading, error, page, totalPages, totalCount, search, setPage, setSearch, create, update, remove, refresh }
}
