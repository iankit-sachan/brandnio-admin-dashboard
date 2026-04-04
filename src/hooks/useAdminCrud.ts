/**
 * Generic hook for admin CRUD pages.
 * Replaces the old pattern of useState([...mockData]) with live API calls.
 *
 * Usage:
 *   const { data, loading, error, create, update, remove, refresh } = useAdminCrud(taglinesApi)
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { logActivity } from '../utils/activityLog'

// Simple in-memory cache with 30s TTL to avoid re-fetching on tab navigation
const CACHE_TTL = 30_000
const _cache = new Map<string, { data: unknown; ts: number }>()
function getCacheKey(api: unknown, params?: Record<string, string>): string {
  // Use the list function reference + params as cache key
  const base = (api as { list: { name?: string } }).list?.name || 'crud'
  return `${base}:${JSON.stringify(params || {})}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormData = Record<string, any>

interface CrudApi<T> {
  list: (params?: Record<string, string>) => Promise<T[]>
  create: (data: Partial<T>) => Promise<T>
  update: (id: number, data: Partial<T>) => Promise<T>
  delete: (id: number) => Promise<unknown>
}

interface UseAdminCrudResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  create: (item: FormData) => Promise<T | null>
  update: (id: number, item: FormData) => Promise<T | null>
  remove: (id: number) => Promise<boolean>
  refresh: () => void
  setData: React.Dispatch<React.SetStateAction<T[]>>
}

export function useAdminCrud<T extends { id: number }>(
  apiService: CrudApi<T>,
  params?: Record<string, string>,
): UseAdminCrudResult<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async (skipCache = false) => {
    const cacheKey = getCacheKey(apiService, params)

    // Check cache first (not on explicit refresh)
    if (!skipCache) {
      const cached = _cache.get(cacheKey)
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        if (mountedRef.current) {
          setData(cached.data as T[])
          setLoading(false)
        }
        return
      }
    }

    setLoading(true)
    setError(null)
    try {
      const result = await apiService.list(params)
      if (mountedRef.current) {
        let parsed: T[]
        if (Array.isArray(result)) {
          parsed = result
        } else if (result && typeof result === 'object' && 'results' in result && Array.isArray((result as Record<string, unknown>).results)) {
          parsed = (result as Record<string, unknown>).results as T[]
        } else {
          parsed = []
        }
        setData(parsed)
        _cache.set(cacheKey, { data: parsed, ts: Date.now() })
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to load data'
        setError(msg)
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [apiService, params])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    return () => { mountedRef.current = false }
  }, [fetchData])

  const invalidateCache = useCallback(() => {
    _cache.delete(getCacheKey(apiService, params))
  }, [apiService, params])

  const create = useCallback(async (item: FormData): Promise<T | null> => {
    const created = await apiService.create(item as Partial<T>)
    invalidateCache()
    setData(prev => [...prev, created])
    logActivity('created', (apiService as { resourceName?: string }).resourceName || 'item', (item as Record<string, string>).name || (item as Record<string, string>).title || 'item')
    return created
  }, [apiService, invalidateCache])

  const update = useCallback(async (id: number, item: FormData): Promise<T | null> => {
    const updated = await apiService.update(id, item as Partial<T>)
    invalidateCache()
    setData(prev => prev.map(d => d.id === id ? updated : d))
    logActivity('updated', (apiService as { resourceName?: string }).resourceName || 'item', (item as Record<string, string>).name || (item as Record<string, string>).title || 'item')
    return updated
  }, [apiService, invalidateCache])

  const remove = useCallback(async (id: number): Promise<boolean> => {
    await apiService.delete(id)
    invalidateCache()
    setData(prev => prev.filter(d => d.id !== id))
    logActivity('deleted', (apiService as { resourceName?: string }).resourceName || 'item', `ID ${id}`)
    return true
  }, [apiService, invalidateCache])

  const refresh = useCallback(() => fetchData(true), [fetchData])

  return { data, loading, error, create, update, remove, refresh, setData }
}
