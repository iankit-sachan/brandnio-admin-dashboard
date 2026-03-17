/**
 * Generic hook for admin CRUD pages.
 * Replaces the old pattern of useState([...mockData]) with live API calls.
 *
 * Usage:
 *   const { data, loading, error, create, update, remove, refresh } = useAdminCrud(taglinesApi)
 */
import { useState, useEffect, useCallback, useRef } from 'react'

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

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiService.list(params)
      if (mountedRef.current) {
        // Handle both plain arrays and DRF paginated responses {count, results: [...]}
        if (Array.isArray(result)) {
          setData(result)
        } else if (result && typeof result === 'object' && 'results' in result && Array.isArray((result as Record<string, unknown>).results)) {
          setData((result as Record<string, unknown>).results as T[])
        } else {
          setData([])
        }
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

  const create = useCallback(async (item: FormData): Promise<T | null> => {
    const created = await apiService.create(item as Partial<T>)
    setData(prev => [...prev, created])
    return created
  }, [apiService])

  const update = useCallback(async (id: number, item: FormData): Promise<T | null> => {
    const updated = await apiService.update(id, item as Partial<T>)
    setData(prev => prev.map(d => d.id === id ? updated : d))
    return updated
  }, [apiService])

  const remove = useCallback(async (id: number): Promise<boolean> => {
    await apiService.delete(id)
    setData(prev => prev.filter(d => d.id !== id))
    return true
  }, [apiService])

  return { data, loading, error, create, update, remove, refresh: fetchData, setData }
}
