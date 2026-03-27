import { useState, useEffect, useCallback } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import { categoryRecycleBinApi } from '../../services/admin-api'

interface DeletedCategory {
  id: number
  name: string
  slug: string
  poster_count: number
  children_count: number
  deleted_at: string
  deleted_by: string
}

export default function RecycleBinPage() {
  const { addToast } = useToast()
  const [data, setData] = useState<DeletedCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [restoreItem, setRestoreItem] = useState<DeletedCategory | null>(null)
  const [permanentDeleteItem, setPermanentDeleteItem] = useState<DeletedCategory | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await categoryRecycleBinApi.list()
      setData(result)
    } catch {
      addToast('Failed to load recycle bin', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRestore = async () => {
    if (!restoreItem) return
    try {
      await categoryRecycleBinApi.restore(restoreItem.id)
      addToast(`"${restoreItem.name}" restored successfully`)
      setData(prev => prev.filter(d => d.id !== restoreItem.id))
      setRestoreItem(null)
    } catch {
      addToast('Restore failed. Please try again.', 'error')
    }
  }

  const handlePermanentDelete = async () => {
    if (!permanentDeleteItem) return
    try {
      await categoryRecycleBinApi.permanentDelete(permanentDeleteItem.id)
      addToast(`"${permanentDeleteItem.name}" permanently deleted`)
      setData(prev => prev.filter(d => d.id !== permanentDeleteItem.id))
      setPermanentDeleteItem(null)
    } catch {
      addToast('Permanent delete failed. Please try again.', 'error')
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-text flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-status-error" />
            Recycle Bin
          </h1>
          <p className="text-sm text-brand-text-muted mt-1">
            Deleted categories can be restored or permanently removed
          </p>
        </div>
        <span className="text-sm text-brand-text-muted">{data.length} item{data.length !== 1 ? 's' : ''}</span>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-16 text-brand-text-muted">
          <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Recycle Bin is empty</p>
          <p className="text-sm mt-1">Deleted categories will appear here</p>
        </div>
      ) : (
        <div className="bg-brand-card rounded-lg border border-brand-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-surface text-brand-text-muted text-left text-xs uppercase tracking-wider">
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Posters</th>
                <th className="px-4 py-3">Subcategories</th>
                <th className="px-4 py-3">Deleted At</th>
                <th className="px-4 py-3">Deleted By</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {data.map(item => (
                <tr key={item.id} className="hover:bg-brand-surface/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-brand-text">{item.name}</span>
                      <span className="text-brand-text-muted ml-2 text-xs">/{item.slug}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-text-muted">{item.poster_count}</td>
                  <td className="px-4 py-3 text-brand-text-muted">{item.children_count}</td>
                  <td className="px-4 py-3 text-brand-text-muted text-xs">{formatDate(item.deleted_at)}</td>
                  <td className="px-4 py-3 text-brand-text-muted text-xs">{item.deleted_by}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setRestoreItem(item)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-status-success/10 text-status-success hover:bg-status-success/20 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </button>
                      <button
                        onClick={() => setPermanentDeleteItem(item)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-status-error/10 text-status-error hover:bg-status-error/20 transition-colors"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Delete Forever
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!restoreItem}
        onClose={() => setRestoreItem(null)}
        onConfirm={handleRestore}
        title="Restore Category"
        message={`Restore "${restoreItem?.name}" and its subcategories? They will reappear in the category list.`}
        confirmText="Restore"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={!!permanentDeleteItem}
        onClose={() => setPermanentDeleteItem(null)}
        onConfirm={handlePermanentDelete}
        title="Permanently Delete"
        message={`This will permanently delete "${permanentDeleteItem?.name}" and all its ${permanentDeleteItem?.poster_count || 0} posters. This action CANNOT be undone.`}
        confirmText="Delete Forever"
        variant="danger"
      />
    </div>
  )
}
