import { useState, useMemo, useCallback } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2 } from 'lucide-react'
import { promoAnnouncementsApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface PromoAnnouncement {
  id: number
  text: string
  subtitle: string
  is_active: boolean
  sort_order: number
}

interface FormState {
  text: string
  subtitle: string
  is_active: boolean
  sort_order: number
}

const emptyForm: FormState = {
  text: '',
  subtitle: '',
  is_active: true,
  sort_order: 0,
}

export default function PromoAnnouncementPage() {
  const { addToast } = useToast()
  const { data, loading, create, update, remove } = useAdminCrud<PromoAnnouncement>(promoAnnouncementsApi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PromoAnnouncement | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<PromoAnnouncement | null>(null)

  // Sorted data by sort_order
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.sort_order - b.sort_order)
  }, [data])

  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (item: PromoAnnouncement) => {
    setEditingItem(item)
    setForm({
      text: item.text || '',
      subtitle: item.subtitle || '',
      is_active: item.is_active,
      sort_order: item.sort_order,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.text.trim()) { addToast('Text is required', 'error'); return }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Promo announcement updated successfully')
      } else {
        await create(form)
        addToast('Promo announcement created successfully')
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
      addToast('Promo announcement deleted successfully')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed. Please try again.', 'error')
    }
  }

  // Inline toggle active
  const toggleActive = useCallback(async (item: PromoAnnouncement) => {
    try {
      const updated = await update(item.id, { is_active: !item.is_active } as any)
      if (updated) addToast(`Announcement "${item.text}" ${!item.is_active ? 'activated' : 'deactivated'}`)
    } catch {
      addToast('Toggle failed', 'error')
    }
  }, [update, addToast])

  const columns: Column<PromoAnnouncement>[] = [
    { key: 'text', title: 'Text', sortable: true, render: (item) => <span className="font-medium text-brand-text">{item.text}</span> },
    { key: 'subtitle', title: 'Subtitle', sortable: true, render: (item) => <span className="text-brand-text-muted">{item.subtitle || '—'}</span> },
    {
      key: 'is_active', title: 'Active',
      render: (item) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleActive(item) }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.is_active ? 'bg-green-500' : 'bg-gray-600'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      ),
    },
    { key: 'sort_order', title: 'Sort Order', sortable: true, render: (item) => <span className="text-brand-text-muted">{item.sort_order}</span> },
    {
      key: 'actions', title: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors"><Pencil className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ]

  const inputClass = "w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Promo Announcements</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">+ Add Announcement</button>
      </div>

      <p className="text-sm text-brand-text-muted">
        Manage promotional announcements displayed in the app. Toggle to show/hide announcements.
      </p>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
          : <DataTable columns={columns} data={sortedData} />
        }
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} title={editingItem ? 'Edit Promo Announcement' : 'Add Promo Announcement'} size="lg">
        <div className="space-y-4">
          {/* Text */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Text <span className="text-status-error">*</span></label>
            <input value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="e.g. Special Offer!" className={inputClass} />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Subtitle (optional)</label>
            <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="e.g. Limited time only" className={inputClass} />
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className={inputClass} />
            <p className="text-xs text-brand-text-muted mt-1">Lower numbers appear first</p>
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            <label className="text-sm text-brand-text-muted">Active (visible in app)</label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false) }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Promo Announcement" message={`Delete "${deleteItem?.text}"? This will remove the announcement from the app.`} confirmText="Delete" variant="danger" />
    </div>
  )
}
