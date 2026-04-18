import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { SearchInput } from '../../components/ui/SearchInput'
import { Pagination } from '../../components/ui/Pagination'
import { languagesApi } from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import { useToast } from '../../context/ToastContext'
import type { Language } from '../../types/festival.types'

interface Form {
  name: string
  code: string
  is_active: boolean
  sort_order: number
}

const EMPTY: Form = { name: '', code: '', is_active: true, sort_order: 0 }

export default function LanguagesPage() {
  const { addToast } = useToast()
  const { data, loading, page, totalPages, totalCount, search, setPage, setSearch, refresh } =
    useAdminPaginatedCrud<Language>(languagesApi)
  const [editing, setEditing] = useState<Language | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)

  const openEdit = (l: Language) => {
    setEditing(l)
    setForm({ name: l.name, code: l.code, is_active: l.is_active, sort_order: l.sort_order })
  }
  const openNew = () => {
    setEditing(null); setForm(EMPTY); setCreating(true)
  }

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      addToast('Name and code are required', 'error'); return
    }
    setSaving(true)
    try {
      if (editing) {
        await languagesApi.update(editing.id, form)
        addToast('Language updated')
      } else {
        await languagesApi.create(form)
        addToast('Language created')
      }
      refresh()
      setEditing(null); setCreating(false)
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown } }
      addToast('Save failed: ' + JSON.stringify(err.response?.data || ''), 'error')
    } finally { setSaving(false) }
  }

  const del = async (l: Language) => {
    if (!confirm(`Delete language "${l.name}"? Posters tagged with it will be un-tagged.`)) return
    try {
      await languagesApi.delete(l.id)
      addToast('Language deleted')
      refresh()
    } catch {
      addToast('Delete failed', 'error')
    }
  }

  const columns: Column<Language>[] = [
    { key: 'name', title: 'Name', sortable: true, className: 'min-w-[160px]' },
    { key: 'code', title: 'Code', className: 'w-[80px]', render: l => <code className="text-xs">{l.code}</code> },
    { key: 'is_active', title: 'Active', className: 'w-[80px] text-center', render: l => l.is_active ? 'Yes' : 'No' },
    { key: 'sort_order', title: 'Sort', className: 'w-[60px] text-right' },
    {
      key: 'actions', title: 'Actions', className: 'w-[140px] text-right',
      render: l => (
        <div className="flex gap-1 justify-end">
          <button onClick={() => openEdit(l)} className="text-xs px-2.5 py-1 rounded bg-amber-700/20 text-amber-400 hover:bg-amber-700/40">Edit</button>
          <button onClick={() => del(l)} className="text-xs px-2.5 py-1 rounded bg-red-700/20 text-red-400 hover:bg-red-700/40">Delete</button>
        </div>
      ),
    },
  ]

  const show = editing || creating

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Languages</h1>
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search..." className="w-56" />
          <button onClick={openNew} className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-500">+ New Language</button>
        </div>
      </div>

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        <DataTable columns={columns} data={data} loading={loading} keyExtractor={(l) => l.id} />
        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
      </div>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e1e2e] rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">{editing ? 'Edit Language' : 'New Language'}</h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-gray-400">Name</span>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-400">ISO code (en, hi, gu, mr, ta, …)</span>
                <input type="text" value={form.code} maxLength={10} onChange={e => setForm({ ...form, code: e.target.value.toLowerCase() })}
                  className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white font-mono" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-400">Sort order</span>
                  <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: +e.target.value })}
                    className="mt-1 block w-full bg-[#2a2a3e] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                </label>
                <label className="flex items-center gap-2 mt-5">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    className="rounded border-gray-600 bg-[#2a2a3e]" />
                  <span className="text-sm text-white">Active</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={save} disabled={saving}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-500 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditing(null); setCreating(false) }}
                className="px-4 py-2 border border-gray-600 text-gray-400 rounded-lg text-sm hover:bg-gray-800">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
