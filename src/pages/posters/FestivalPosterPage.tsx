import { useState, useEffect, useMemo } from 'react'
import { Pencil, Trash2, Plus, Calendar, Image as ImageIcon, Clock } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { festivalPostersApi, festivalsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import type { FestivalPoster } from '../../types'

interface Festival {
  id: number
  name: string
  date: string
}

interface FormState {
  festival: number
  status: 'scheduled' | 'generated' | 'sent' | 'failed'
  auto_share: boolean
  scheduled_date: string
  scheduled_time: string
}

// (Hardcoded fallback removed — admin must always see real data, never stale.
//  If the festivals API fails, the page surfaces a real error with a Retry button
//  instead of silently filling the dropdown with made-up festivals.)

const emptyForm: FormState = { festival: 0, status: 'scheduled', auto_share: false, scheduled_date: '', scheduled_time: '' }

const inputClass = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'

export default function FestivalPosterPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<FestivalPoster>(festivalPostersApi)
  const [festivals, setFestivals] = useState<Festival[]>([])
  const [festivalsLoading, setFestivalsLoading] = useState(true)
  const [festivalsError, setFestivalsError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<FestivalPoster | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<FestivalPoster | null>(null)

  // Single source of truth — fetched from backend. No silent fallback.
  // If this fails, surface the error and let admin retry.
  const loadFestivals = () => {
    setFestivalsLoading(true)
    setFestivalsError(null)
    festivalsApi.list()
      .then(results => {
        const list = Array.isArray(results) ? (results as Festival[]) : []
        setFestivals(list)
      })
      .catch((e: unknown) => {
        const err = e as { message?: string }
        setFestivalsError(err.message || 'Could not load festivals from server.')
        setFestivals([])
      })
      .finally(() => setFestivalsLoading(false))
  }

  useEffect(() => { loadFestivals() }, [])

  // Filters
  const [search, setSearch] = useState('')
  const [festivalFilter, setFestivalFilter] = useState<number | ''>('')
  const [statusFilter, setStatusFilter] = useState('')

  const filteredData = useMemo(() => {
    return data.filter(p => {
      if (search && !p.festival_name.toLowerCase().includes(search.toLowerCase()) && !p.user_name.toLowerCase().includes(search.toLowerCase())) return false
      if (festivalFilter && p.festival !== festivalFilter) return false
      if (statusFilter && p.status !== statusFilter) return false
      return true
    })
  }, [data, search, festivalFilter, statusFilter])

  const totalPosters = data.length
  const upcomingFestivals = festivals.filter(f => new Date(f.date) > new Date()).length

  const openAdd = () => {
    setEditingItem(null)
    // Default the festival dropdown to the first server-loaded festival; falls
    // back to 0 (which the submit handler treats as "festival required").
    setForm({ ...emptyForm, festival: festivals[0]?.id ?? 0 })
    setModalOpen(true)
  }
  const openEdit = (item: FestivalPoster) => {
    setEditingItem(item)
    setForm({ festival: item.festival, status: item.status, auto_share: item.auto_share, scheduled_date: item.scheduled_date, scheduled_time: item.scheduled_time })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.festival) { addToast('Festival is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Poster updated successfully')
      } else {
        await create(form)
        addToast('Poster created successfully')
      }
      setForm(emptyForm); setEditingItem(null); setModalOpen(false)
    } catch {
      addToast('Operation failed. Please try again.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await remove(deleteItem.id)
      addToast('Poster deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  if (loading || festivalsLoading) {
    return <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
  }

  // Hard error state — never silently show stale or made-up data.
  if (festivalsError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand-text">Festival Posters</h1>
        </div>
        <div className="rounded-xl border border-status-error/40 bg-status-error/10 p-6 text-center">
          <div className="text-3xl mb-2">⚠</div>
          <div className="text-base font-semibold text-status-error">Could not load festivals</div>
          <div className="text-sm text-brand-text-muted mt-1 max-w-md mx-auto">{festivalsError}</div>
          <div className="text-xs text-brand-text-muted mt-2">
            Network error or server unreachable. Festivals are managed in <a href="/festivals" className="text-brand-gold underline">Festivals List</a>.
          </div>
          <button
            onClick={loadFestivals}
            className="mt-4 px-4 py-2 rounded-lg bg-brand-gold text-gray-900 font-medium text-sm hover:bg-brand-gold-dark"
          >
            🔁 Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Festival Posters</h1>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-brand-gold/10"><Calendar className="h-5 w-5 text-brand-gold" /></div>
          <div>
            <p className="text-xs text-brand-text-muted">Total Festivals</p>
            <p className="text-xl font-bold text-brand-text">{festivals.length}</p>
          </div>
        </div>
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-status-info/10"><ImageIcon className="h-5 w-5 text-status-info" /></div>
          <div>
            <p className="text-xs text-brand-text-muted">Total Posters</p>
            <p className="text-xl font-bold text-brand-text">{totalPosters}</p>
          </div>
        </div>
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-status-success/10"><Clock className="h-5 w-5 text-status-success" /></div>
          <div>
            <p className="text-xs text-brand-text-muted">Upcoming Festivals</p>
            <p className="text-xl font-bold text-brand-text">{upcomingFestivals}</p>
          </div>
        </div>
      </div>

      {/* Festival Selector - Horizontal Scroll */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          <button
            onClick={() => setFestivalFilter('')}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              festivalFilter === '' ? 'bg-brand-gold text-gray-900 border-brand-gold' : 'bg-brand-dark-card border-brand-dark-border/50 text-brand-text hover:border-brand-gold/50'
            }`}
          >
            All Festivals
          </button>
          {festivals.map(f => (
            <button
              key={f.id}
              onClick={() => setFestivalFilter(f.id === festivalFilter ? '' : f.id)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                festivalFilter === f.id ? 'bg-brand-gold text-gray-900 border-brand-gold' : 'bg-brand-dark-card border-brand-dark-border/50 text-brand-text hover:border-brand-gold/50'
              }`}
            >
              <span className="font-medium">{f.name}</span>
              <span className="ml-2 text-xs opacity-70">{new Date(f.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Search by user or festival..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2 text-sm text-brand-text w-64 focus:outline-none focus:border-brand-gold/50"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50">
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="generated">Generated</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Poster List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredData.map(poster => {
          const statusColors: Record<string, string> = {
            scheduled: 'bg-brand-gold/20 text-brand-gold',
            generated: 'bg-status-info/20 text-status-info',
            sent: 'bg-status-success/20 text-status-success',
            failed: 'bg-status-error/20 text-status-error',
          }
          return (
            <div key={poster.id} className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-4 group relative">
              {/* Status badge */}
              <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[poster.status] || 'bg-brand-dark-hover text-brand-text-muted'}`}>
                {poster.status}
              </span>
              {/* Info */}
              <h3 className="text-sm font-medium text-brand-text">{poster.festival_name}</h3>
              <p className="text-xs text-brand-text-muted mt-1">By: {poster.user_name}</p>
              <p className="text-xs text-brand-text-muted mt-0.5">Festival date: {poster.festival_date}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {poster.auto_share && <span className="text-xs px-2 py-0.5 rounded-full bg-status-info/10 text-status-info">Auto-share</span>}
                {poster.scheduled_date && <span className="text-xs text-brand-text-muted">Scheduled: {poster.scheduled_date} {poster.scheduled_time}</span>}
              </div>
              {/* Hover actions */}
              <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(poster)} className="p-1.5 bg-brand-gold rounded-lg text-gray-900"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => setDeleteItem(poster)} className="p-1.5 bg-status-error rounded-lg text-white"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          )
        })}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-16">
          <ImageIcon className="h-12 w-12 text-brand-text-muted/30 mx-auto mb-3" />
          <p className="text-brand-text-muted">No festival posters found matching your filters.</p>
        </div>
      )}

      {/* Floating Add Button */}
      <button onClick={openAdd} className="fixed bottom-6 right-6 w-14 h-14 bg-brand-gold rounded-full shadow-lg flex items-center justify-center text-gray-900 hover:bg-brand-gold-dark transition-colors z-40">
        <Plus className="h-6 w-6" />
      </button>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Festival Poster' : 'Add Festival Poster'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Festival</label>
            <select value={form.festival} onChange={e => setForm(f => ({ ...f, festival: Number(e.target.value) }))} className={inputClass}>
              {festivals.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as FormState['status'] }))} className={inputClass}>
              <option value="scheduled">Scheduled</option>
              <option value="generated">Generated</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Scheduled Date</label>
              <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Scheduled Time</label>
              <input type="time" value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.auto_share} onChange={e => setForm(f => ({ ...f, auto_share: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Auto-share when generated</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Poster" message={`Are you sure you want to delete this festival poster for "${deleteItem?.festival_name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
