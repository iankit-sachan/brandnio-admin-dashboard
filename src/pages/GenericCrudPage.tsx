import { useState } from 'react'
import { DataTable, type Column } from '../components/ui/DataTable'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useAdminCrud } from '../hooks/useAdminCrud'
import { useToast } from '../context/ToastContext'
import { Pencil, Trash2, Plus, RefreshCw } from 'lucide-react'

export interface FieldDef {
  key: string
  label: string
  type?: 'text' | 'number' | 'checkbox' | 'textarea' | 'url'
  required?: boolean
}

interface GenericCrudPageProps {
  title: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: any
  columns: Column<any>[]
  fields?: FieldDef[]
  /** Hide create / edit / delete buttons (read-only table) */
  readOnly?: boolean
}

export default function GenericCrudPage({ title, api, columns, fields, readOnly }: GenericCrudPageProps) {
  const { addToast } = useToast()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, loading, create, update, remove, refresh } = useAdminCrud<any>(api)
  const [modalOpen, setModalOpen] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingItem, setEditingItem] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<Record<string, any>>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deleteItem, setDeleteItem] = useState<any>(null)

  const buildEmptyForm = () => {
    const empty: Record<string, any> = {} // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const f of fields || []) {
      empty[f.key] = f.type === 'checkbox' ? false : f.type === 'number' ? 0 : ''
    }
    return empty
  }

  const openAdd = () => {
    setEditingItem(null)
    setForm(buildEmptyForm())
    setModalOpen(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEdit = (item: any) => {
    setEditingItem(item)
    const f: Record<string, any> = {} // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const field of fields || []) {
      f[field.key] = item[field.key] ?? (field.type === 'checkbox' ? false : field.type === 'number' ? 0 : '')
    }
    setForm(f)
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingItem) await update(editingItem.id, form)
      else await create(form)
      addToast(editingItem ? `${title} updated` : `${title} created`, 'success')
      setModalOpen(false)
    } catch {
      addToast('Save failed', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await remove(deleteItem.id)
      addToast(`${title} deleted`, 'success')
      setDeleteItem(null)
    } catch {
      addToast('Delete failed', 'error')
    }
  }

  const actionColumns: Column<any>[] = readOnly || !fields
    ? columns
    : [
        ...columns,
        {
          key: 'id',
          title: 'Actions',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          render: (item: any) => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-brand-dark-border/30 text-brand-text-muted hover:text-brand-yellow transition-colors">
                <Pencil size={14} />
              </button>
              <button onClick={() => setDeleteItem(item)} className="p-1.5 rounded hover:bg-red-500/10 text-brand-text-muted hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ),
        },
      ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">{title}</h1>
        <div className="flex gap-2">
          <button onClick={refresh} className="flex items-center gap-2 px-3 py-2 border border-brand-dark-border text-brand-text-muted rounded-lg hover:bg-brand-dark-border/20 transition-colors text-sm">
            <RefreshCw size={14} />
          </button>
          {!readOnly && fields && (
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-brand-yellow text-black rounded-lg font-medium hover:bg-brand-yellow/90 transition-colors text-sm">
              <Plus size={16} /> Add
            </button>
          )}
        </div>
      </div>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
          : <DataTable columns={actionColumns} data={data} />
        }
      </div>

      {/* Create / Edit Modal */}
      {fields && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? `Edit ${title}` : `Add ${title}`}>
          <div className="space-y-4">
            {fields.map((f) => {
              if (f.type === 'checkbox') {
                return (
                  <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form[f.key]}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                      className="w-4 h-4 accent-brand-yellow"
                    />
                    <span className="text-sm text-brand-text">{f.label}</span>
                  </label>
                )
              }
              if (f.type === 'textarea') {
                return (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-brand-text-muted mb-1">{f.label}</label>
                    <textarea
                      rows={3}
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 bg-brand-dark-deep border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-yellow/50 resize-none"
                    />
                  </div>
                )
              }
              return (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-brand-text-muted mb-1">{f.label}</label>
                  <input
                    type={f.type === 'number' ? 'number' : 'text'}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: f.type === 'number' ? +e.target.value : e.target.value }))}
                    className="w-full px-3 py-2 bg-brand-dark-deep border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-yellow/50"
                  />
                </div>
              )
            })}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2 border border-brand-dark-border text-brand-text-muted rounded-lg hover:bg-brand-dark-border/20 transition-colors text-sm">Cancel</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 bg-brand-yellow text-black rounded-lg font-medium hover:bg-brand-yellow/90 transition-colors text-sm">Save</button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title={`Delete ${title}`}
        message={`Are you sure you want to delete this item? This cannot be undone.`}
      />
    </div>
  )
}
