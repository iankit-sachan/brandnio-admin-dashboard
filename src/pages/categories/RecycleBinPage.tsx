import { useState, useEffect, useCallback, useMemo } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SearchInput } from '../../components/ui/SearchInput'
import { useToast } from '../../context/ToastContext'
import { Trash2, RotateCcw, AlertTriangle, Image, FolderTree, ChevronLeft, ChevronRight } from 'lucide-react'
import { categoryRecycleBinApi, posterRecycleBinApi } from '../../services/admin-api'
import { CategoryTabNav } from '../../components/CategoryTabNav'

interface DeletedCategory {
  id: number
  name: string
  slug: string
  poster_count: number
  children_count: number
  deleted_at: string
  deleted_by: string
}

interface DeletedPoster {
  id: number
  title: string
  thumbnail_url: string | null
  image_url: string | null
  category_name: string
  aspect_ratio: string
  deleted_at: string
  deleted_by: string
}

type Tab = 'categories' | 'posters'
const PAGE_SIZE = 20

export default function RecycleBinPage() {
  const { addToast } = useToast()
  const [tab, setTab] = useState<Tab>('categories')
  const [search, setSearch] = useState('')

  // Category state
  const [categories, setCategories] = useState<DeletedCategory[]>([])
  const [catLoading, setCatLoading] = useState(true)
  const [catPage, setCatPage] = useState(1)
  const [selectedCatIds, setSelectedCatIds] = useState<Set<number>>(new Set())

  // Poster state
  const [posters, setPosters] = useState<DeletedPoster[]>([])
  const [posterLoading, setPosterLoading] = useState(true)
  const [posterPage, setPosterPage] = useState(1)
  const [selectedPosterIds, setSelectedPosterIds] = useState<Set<number>>(new Set())

  // Confirm dialogs
  const [restoreItem, setRestoreItem] = useState<{ id: number; name: string; type: Tab } | null>(null)
  const [permanentDeleteItem, setPermanentDeleteItem] = useState<{ id: number; name: string; type: Tab; posterCount?: number } | null>(null)
  const [bulkAction, setBulkAction] = useState<{ action: 'restore' | 'delete'; type: Tab } | null>(null)

  const fetchCategories = useCallback(async () => {
    setCatLoading(true)
    try {
      const result = await categoryRecycleBinApi.list()
      setCategories(result)
    } catch { addToast('Failed to load deleted categories', 'error') }
    finally { setCatLoading(false) }
  }, [addToast])

  const fetchPosters = useCallback(async () => {
    setPosterLoading(true)
    try {
      const result = await posterRecycleBinApi.list()
      setPosters(result as DeletedPoster[])
    } catch { addToast('Failed to load deleted posters', 'error') }
    finally { setPosterLoading(false) }
  }, [addToast])

  useEffect(() => { fetchCategories() }, [fetchCategories])
  useEffect(() => { if (tab === 'posters') fetchPosters() }, [tab, fetchPosters])

  // Filtered + paginated data
  const filteredCats = useMemo(() =>
    categories.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search.toLowerCase())),
    [categories, search]
  )
  const catTotalPages = Math.max(1, Math.ceil(filteredCats.length / PAGE_SIZE))
  const pagedCats = filteredCats.slice((catPage - 1) * PAGE_SIZE, catPage * PAGE_SIZE)

  const filteredPosters = useMemo(() =>
    posters.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.category_name || '').toLowerCase().includes(search.toLowerCase())),
    [posters, search]
  )
  const posterTotalPages = Math.max(1, Math.ceil(filteredPosters.length / PAGE_SIZE))
  const pagedPosters = filteredPosters.slice((posterPage - 1) * PAGE_SIZE, posterPage * PAGE_SIZE)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // Single item actions
  const handleRestore = async () => {
    if (!restoreItem) return
    try {
      if (restoreItem.type === 'categories') {
        await categoryRecycleBinApi.restore(restoreItem.id)
        setCategories(prev => prev.filter(d => d.id !== restoreItem.id))
      } else {
        await posterRecycleBinApi.restore(restoreItem.id)
        setPosters(prev => prev.filter(d => d.id !== restoreItem.id))
      }
      addToast(`"${restoreItem.name}" restored`)
      setRestoreItem(null)
    } catch { addToast('Restore failed', 'error') }
  }

  const handlePermanentDelete = async () => {
    if (!permanentDeleteItem) return
    try {
      if (permanentDeleteItem.type === 'categories') {
        await categoryRecycleBinApi.permanentDelete(permanentDeleteItem.id)
        setCategories(prev => prev.filter(d => d.id !== permanentDeleteItem.id))
      } else {
        await posterRecycleBinApi.permanentDelete(permanentDeleteItem.id)
        setPosters(prev => prev.filter(d => d.id !== permanentDeleteItem.id))
      }
      addToast(`"${permanentDeleteItem.name}" permanently deleted`)
      setPermanentDeleteItem(null)
    } catch { addToast('Delete failed', 'error') }
  }

  // Bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction) return
    const ids = bulkAction.type === 'categories' ? Array.from(selectedCatIds) : Array.from(selectedPosterIds)
    const api = bulkAction.type === 'categories' ? categoryRecycleBinApi : posterRecycleBinApi
    const fn = bulkAction.action === 'restore' ? api.restore : api.permanentDelete
    let ok = 0
    for (const id of ids) {
      try { await fn(id); ok++ } catch { /* continue */ }
    }
    addToast(`${bulkAction.action === 'restore' ? 'Restored' : 'Deleted'} ${ok}/${ids.length} items`)
    if (bulkAction.type === 'categories') {
      setCategories(prev => prev.filter(d => !selectedCatIds.has(d.id)))
      setSelectedCatIds(new Set())
    } else {
      setPosters(prev => prev.filter(d => !selectedPosterIds.has(d.id)))
      setSelectedPosterIds(new Set())
    }
    setBulkAction(null)
  }

  const toggleCat = (id: number) => setSelectedCatIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const togglePoster = (id: number) => setSelectedPosterIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const loading = tab === 'categories' ? catLoading : posterLoading
  const selectedCount = tab === 'categories' ? selectedCatIds.size : selectedPosterIds.size

  return (
    <div className="space-y-4">
      <CategoryTabNav />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-text flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-status-error" />
            Recycle Bin
          </h1>
          <p className="text-sm text-brand-text-muted mt-1">Restore or permanently remove deleted items</p>
        </div>
        <SearchInput value={search} onChange={v => { setSearch(v); setCatPage(1); setPosterPage(1) }} placeholder="Search deleted items..." className="w-64" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-brand-dark-border">
        <button onClick={() => { setTab('categories'); setSearch('') }} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${tab === 'categories' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-brand-text'}`}>
          <FolderTree className="h-4 w-4" /> Categories <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-brand-dark-hover">{categories.length}</span>
        </button>
        <button onClick={() => { setTab('posters'); setSearch('') }} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${tab === 'posters' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-brand-text'}`}>
          <Image className="h-4 w-4" /> Posters <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-brand-dark-hover">{posters.length}</span>
        </button>
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-brand-dark-card rounded-xl border border-brand-gold/30">
          <span className="text-sm text-brand-text-muted">{selectedCount} selected</span>
          <button onClick={() => setBulkAction({ action: 'restore', type: tab })} className="px-3 py-1.5 text-xs font-medium rounded-md bg-status-success/10 text-status-success hover:bg-status-success/20 flex items-center gap-1">
            <RotateCcw className="h-3 w-3" /> Restore Selected
          </button>
          <button onClick={() => setBulkAction({ action: 'delete', type: tab })} className="px-3 py-1.5 text-xs font-medium rounded-md bg-status-error/10 text-status-error hover:bg-status-error/20 flex items-center gap-1">
            <Trash2 className="h-3 w-3" /> Delete Forever
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
      ) : tab === 'categories' ? (
        /* ── Categories Tab ── */
        filteredCats.length === 0 ? (
          <div className="text-center py-16 text-brand-text-muted">
            <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No deleted categories</p>
          </div>
        ) : (
          <>
            <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-dark text-brand-text-muted text-left text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 w-8"><input type="checkbox" checked={selectedCatIds.size === pagedCats.length && pagedCats.length > 0} onChange={() => selectedCatIds.size === pagedCats.length ? setSelectedCatIds(new Set()) : setSelectedCatIds(new Set(pagedCats.map(c => c.id)))} className="rounded" /></th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Posters</th>
                    <th className="px-4 py-3">Sub-cats</th>
                    <th className="px-4 py-3">Deleted At</th>
                    <th className="px-4 py-3">By</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-dark-border/30">
                  {pagedCats.map(item => (
                    <tr key={item.id} className="hover:bg-brand-dark-hover/30 transition-colors">
                      <td className="px-4 py-3"><input type="checkbox" checked={selectedCatIds.has(item.id)} onChange={() => toggleCat(item.id)} className="rounded" /></td>
                      <td className="px-4 py-3"><span className="font-medium text-brand-text">{item.name}</span> <span className="text-brand-text-muted text-xs ml-1">/{item.slug}</span></td>
                      <td className="px-4 py-3 text-brand-text-muted">{item.poster_count}</td>
                      <td className="px-4 py-3 text-brand-text-muted">{item.children_count}</td>
                      <td className="px-4 py-3 text-brand-text-muted text-xs">{formatDate(item.deleted_at)}</td>
                      <td className="px-4 py-3 text-brand-text-muted text-xs">{item.deleted_by}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setRestoreItem({ id: item.id, name: item.name, type: 'categories' })} className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-status-success/10 text-status-success hover:bg-status-success/20"><RotateCcw className="h-3 w-3" /> Restore</button>
                          <button onClick={() => setPermanentDeleteItem({ id: item.id, name: item.name, type: 'categories', posterCount: item.poster_count })} className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-status-error/10 text-status-error hover:bg-status-error/20"><AlertTriangle className="h-3 w-3" /> Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {catTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setCatPage(p => Math.max(1, p - 1))} disabled={catPage <= 1} className="p-2 rounded-lg bg-brand-dark-card border border-brand-dark-border text-brand-text-muted hover:text-brand-text disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-sm text-brand-text-muted">Page {catPage} of {catTotalPages} ({filteredCats.length} items)</span>
                <button onClick={() => setCatPage(p => Math.min(catTotalPages, p + 1))} disabled={catPage >= catTotalPages} className="p-2 rounded-lg bg-brand-dark-card border border-brand-dark-border text-brand-text-muted hover:text-brand-text disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </>
        )
      ) : (
        /* ── Posters Tab ── */
        filteredPosters.length === 0 ? (
          <div className="text-center py-16 text-brand-text-muted">
            <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No deleted posters</p>
          </div>
        ) : (
          <>
            <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-dark text-brand-text-muted text-left text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 w-8"><input type="checkbox" checked={selectedPosterIds.size === pagedPosters.length && pagedPosters.length > 0} onChange={() => selectedPosterIds.size === pagedPosters.length ? setSelectedPosterIds(new Set()) : setSelectedPosterIds(new Set(pagedPosters.map(p => p.id)))} className="rounded" /></th>
                    <th className="px-4 py-3">Poster</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Ratio</th>
                    <th className="px-4 py-3">Deleted At</th>
                    <th className="px-4 py-3">By</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-dark-border/30">
                  {pagedPosters.map(item => (
                    <tr key={item.id} className="hover:bg-brand-dark-hover/30 transition-colors">
                      <td className="px-4 py-3"><input type="checkbox" checked={selectedPosterIds.has(item.id)} onChange={() => togglePoster(item.id)} className="rounded" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {(item.thumbnail_url || item.image_url) ? <img src={item.thumbnail_url || item.image_url || ''} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-gray-700" />}
                          <span className="font-medium text-brand-text truncate max-w-[200px]">{item.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-brand-text-muted text-xs">{item.category_name}</td>
                      <td className="px-4 py-3 text-brand-text-muted text-xs">{item.aspect_ratio}</td>
                      <td className="px-4 py-3 text-brand-text-muted text-xs">{formatDate(item.deleted_at)}</td>
                      <td className="px-4 py-3 text-brand-text-muted text-xs">{item.deleted_by}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setRestoreItem({ id: item.id, name: item.title, type: 'posters' })} className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-status-success/10 text-status-success hover:bg-status-success/20"><RotateCcw className="h-3 w-3" /> Restore</button>
                          <button onClick={() => setPermanentDeleteItem({ id: item.id, name: item.title, type: 'posters' })} className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-status-error/10 text-status-error hover:bg-status-error/20"><AlertTriangle className="h-3 w-3" /> Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {posterTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setPosterPage(p => Math.max(1, p - 1))} disabled={posterPage <= 1} className="p-2 rounded-lg bg-brand-dark-card border border-brand-dark-border text-brand-text-muted hover:text-brand-text disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-sm text-brand-text-muted">Page {posterPage} of {posterTotalPages} ({filteredPosters.length} items)</span>
                <button onClick={() => setPosterPage(p => Math.min(posterTotalPages, p + 1))} disabled={posterPage >= posterTotalPages} className="p-2 rounded-lg bg-brand-dark-card border border-brand-dark-border text-brand-text-muted hover:text-brand-text disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </>
        )
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog isOpen={!!restoreItem} onClose={() => setRestoreItem(null)} onConfirm={handleRestore} title="Restore Item" message={`Restore "${restoreItem?.name}"?${restoreItem?.type === 'categories' ? ' This will also restore subcategories.' : ''}`} confirmText="Restore" variant="warning" />
      <ConfirmDialog isOpen={!!permanentDeleteItem} onClose={() => setPermanentDeleteItem(null)} onConfirm={handlePermanentDelete} title="Permanently Delete" message={`This will permanently delete "${permanentDeleteItem?.name}"${permanentDeleteItem?.posterCount ? ` and its ${permanentDeleteItem.posterCount} posters` : ''}. This CANNOT be undone.`} confirmText="Delete Forever" variant="danger" />
      <ConfirmDialog isOpen={!!bulkAction} onClose={() => setBulkAction(null)} onConfirm={handleBulkAction} title={bulkAction?.action === 'restore' ? 'Bulk Restore' : 'Bulk Delete Forever'} message={`${bulkAction?.action === 'restore' ? 'Restore' : 'Permanently delete'} ${selectedCount} item(s)?`} confirmText={bulkAction?.action === 'restore' ? 'Restore All' : 'Delete All Forever'} variant={bulkAction?.action === 'restore' ? 'warning' : 'danger'} />
    </div>
  )
}
