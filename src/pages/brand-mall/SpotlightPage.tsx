import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { mallSpotlightApi } from '../../services/admin-api'
import { useAdminCrud } from '../../hooks/useAdminCrud'

interface SpotlightCard {
  id: number
  title: string
  description: string
  icon_name: string
  image_url: string
  cta_text: string
  cta_link: string
  background_color: string
  sort_order: number
  is_active: boolean
}

const emptyForm: Omit<SpotlightCard, 'id'> = {
  title: '', description: '', icon_name: 'diamond', image_url: '',
  cta_text: 'Explore Now', cta_link: '', background_color: '', sort_order: 0, is_active: true,
}

export default function SpotlightPage() {
  const { addToast } = useToast()
  const { data: items, loading, refresh, update: updateItem, create: createItem, remove: deleteItemApi } = useAdminCrud<SpotlightCard>(mallSpotlightApi)
  const [editItem, setEditItem] = useState<SpotlightCard | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const openEdit = (item: SpotlightCard) => {
    setEditItem(item)
    setForm({ ...item })
    setIsNew(false)
  }

  const openCreate = () => {
    setEditItem({} as SpotlightCard)
    setForm({ ...emptyForm })
    setIsNew(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isNew) {
        await createItem(form as any)
        addToast('Spotlight card created')
      } else if (editItem) {
        await updateItem(editItem.id, form as any)
        addToast('Spotlight card updated')
      }
      setEditItem(null)
      refresh()
    } catch {
      addToast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this spotlight card?')) return
    try {
      await deleteItemApi(id)
      addToast('Deleted')
      refresh()
    } catch {
      addToast('Failed to delete', 'error')
    }
  }

  const columns: Column<SpotlightCard>[] = [
    { key: 'title', title: 'Title', render: r => <span className="font-medium">{r.title}</span> },
    { key: 'icon_name', title: 'Icon' },
    { key: 'cta_text', title: 'CTA' },
    { key: 'sort_order', title: 'Order' },
    { key: 'is_active', title: 'Active', render: r => (
      <span className={r.is_active ? 'text-green-600 font-bold' : 'text-red-500'}>
        {r.is_active ? 'Yes' : 'No'}
      </span>
    )},
    { key: 'actions' as any, title: 'Actions', render: r => (
      <div className="flex gap-2">
        <button onClick={() => openEdit(r)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={16} /></button>
        <button onClick={() => handleDelete(r.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Curation Spotlight</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg text-sm hover:bg-amber-800">
          <Plus size={16} /> Add Spotlight
        </button>
      </div>
      <p className="text-sm text-gray-500">Manage the spotlight cards shown below listings in Brand Mall.</p>

      <DataTable columns={columns} data={items} loading={loading} />

      {editItem && (
        <Modal isOpen={!!editItem} title={isNew ? 'Add Spotlight Card' : 'Edit Spotlight Card'} onClose={() => setEditItem(null)}>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-gray-600">Title *</span>
              <input type="text" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">Description</span>
              <textarea rows={2} className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-600">Icon Name (Material)</span>
                <input type="text" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={form.icon_name}
                  onChange={e => setForm({ ...form, icon_name: e.target.value })} placeholder="diamond" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-600">Background Color (hex)</span>
                <input type="text" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={form.background_color}
                  onChange={e => setForm({ ...form, background_color: e.target.value })} placeholder="#914700" />
              </label>
            </div>
            <label className="block">
              <span className="text-xs text-gray-600">Image URL</span>
              <input type="text" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-600">CTA Text</span>
                <input type="text" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={form.cta_text}
                  onChange={e => setForm({ ...form, cta_text: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs text-gray-600">Sort Order</span>
                <input type="number" className="mt-1 block w-full border rounded px-3 py-2 text-sm" value={form.sort_order}
                  onChange={e => setForm({ ...form, sort_order: +e.target.value })} />
              </label>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              <span className="text-sm">Active</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50">
                {saving ? 'Saving...' : (isNew ? 'Create' : 'Update')}
              </button>
              <button onClick={() => setEditItem(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
