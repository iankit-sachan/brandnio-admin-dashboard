import { useState } from 'react'
import { useAdminCrud } from '../../hooks/useAdminCrud'
import { bgRemovalTestimonialsApi } from '../../services/admin-api'
import { useToast } from '../../context/ToastContext'

interface Testimonial {
  id: number
  title: string
  subtitle: string
  thumbnail_url: string
  video_url: string
  display_order: number
  is_active: boolean
}

type FormState = Omit<Testimonial, 'id'>

const emptyForm: FormState = { title: '', subtitle: '', thumbnail_url: '', video_url: '', display_order: 0, is_active: true }

export default function TestimonialsPage() {
  const { addToast } = useToast()
  const { data, create, update, remove } = useAdminCrud<Testimonial>(bgRemovalTestimonialsApi)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null)

  const startEdit = (t: Testimonial) => {
    setEditingItem(t)
    setForm({ title: t.title, subtitle: t.subtitle, thumbnail_url: t.thumbnail_url, video_url: t.video_url, display_order: t.display_order, is_active: t.is_active })
  }

  const cancelEdit = () => {
    setEditingItem(null)
    setForm(emptyForm)
  }

  const handleSave = async () => {
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Testimonial updated', 'success')
      } else {
        await create(form)
        addToast('Testimonial created', 'success')
      }
      cancelEdit()
    } catch {
      addToast('Save failed', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await remove(id)
      addToast('Testimonial deleted', 'success')
    } catch {
      addToast('Delete failed', 'error')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">BG Removal Testimonials</h1>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">{editingItem ? 'Edit Testimonial' : 'Add Testimonial'}</h2>
        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded p-2 col-span-2" placeholder="Title (e.g. Clothing Review)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <input className="border rounded p-2 col-span-2" placeholder="Subtitle (e.g. by Business Owner)" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} />
          <input className="border rounded p-2 col-span-2" placeholder="Thumbnail URL" value={form.thumbnail_url} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} />
          <input className="border rounded p-2 col-span-2" placeholder="Video URL" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} />
          <input className="border rounded p-2" type="number" placeholder="Display Order" value={form.display_order} onChange={e => setForm({ ...form, display_order: Number(e.target.value) })} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
        </div>
        <div className="flex gap-2 mt-3">
          <button className="bg-yellow-400 px-4 py-2 rounded font-semibold" onClick={handleSave}>{editingItem ? 'Update' : 'Add'}</button>
          {editingItem && <button className="border px-4 py-2 rounded" onClick={cancelEdit}>Cancel</button>}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="p-3 text-left">Title</th><th className="p-3 text-left">Subtitle</th><th className="p-3">Order</th><th className="p-3">Active</th><th className="p-3">Actions</th></tr></thead>
          <tbody>{data.map((t: Testimonial) => (
            <tr key={t.id} className="border-t">
              <td className="p-3">{t.title}</td>
              <td className="p-3 text-gray-500">{t.subtitle}</td>
              <td className="p-3 text-center">{t.display_order}</td>
              <td className="p-3 text-center">{t.is_active ? '✓' : '✗'}</td>
              <td className="p-3 text-center flex gap-2 justify-center">
                <button className="text-blue-600 hover:underline" onClick={() => startEdit(t)}>Edit</button>
                <button className="text-red-500 hover:underline" onClick={() => handleDelete(t.id)}>Delete</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
