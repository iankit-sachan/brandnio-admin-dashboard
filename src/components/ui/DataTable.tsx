import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../utils/cn'
import { LoadingSpinner } from './LoadingSpinner'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  key: string
  title: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
  className?: string
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  onRowClick?: (item: T) => void
  keyExtractor?: (item: T) => string | number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  keyExtractor = (item) => item.id != null ? String(item.id) : `row-${Math.random()}`,
}: Props<T>) {
  if (loading) return <LoadingSpinner className="py-20" />
  if (data.length === 0) return <EmptyState />

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-brand-dark-border">
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium text-brand-text-muted uppercase tracking-wider',
                  col.sortable && 'cursor-pointer select-none hover:text-brand-text',
                  col.className,
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.title}
                  {col.sortable && (
                    sortKey === col.key
                      ? sortDir === 'asc'
                        ? <ChevronUp className="h-3.5 w-3.5 text-brand-gold" />
                        : <ChevronDown className="h-3.5 w-3.5 text-brand-gold" />
                      : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-dark-border/50">
          {data.map(item => (
            <tr
              key={keyExtractor(item)}
              className={cn(
                'hover:bg-brand-dark-hover/50 transition-colors',
                onRowClick && 'cursor-pointer',
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map(col => (
                <td key={col.key} className={cn('px-4 py-3 text-sm text-brand-text', col.className)}>
                  {col.render ? col.render(item) : String(item[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-brand-dark-border">
          <p className="text-sm text-brand-text-muted">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-brand-dark-hover disabled:opacity-30 disabled:cursor-not-allowed text-brand-text-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-brand-dark-hover disabled:opacity-30 disabled:cursor-not-allowed text-brand-text-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
