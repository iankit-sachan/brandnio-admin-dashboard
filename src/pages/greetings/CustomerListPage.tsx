import { useEffect, useMemo, useState } from 'react'
import {
  Pencil, Trash2, Download, Upload, X, AlertTriangle,
  User as UserIcon,
} from 'lucide-react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { useToast } from '../../context/ToastContext'
import {
  customersApi, customerBulkApi, usersApi,
} from '../../services/admin-api'
import { useAdminPaginatedCrud } from '../../hooks/useAdminPaginatedCrud'
import type { Customer } from '../../types'

/**
 * 2026-04 Phase 3 — Customer admin Power-Admin.
 *
 * Key design decisions (per approved Q1 + Q2):
 *   Q1 = (a)  Bulk delete MUST be scoped to a single user — the
 *             "Delete selected" button is disabled unless a user
 *             filter is active. Server enforces the same invariant;
 *             client guard is a UX polish, not a security boundary.
 *   Q2 = (b)  Duplicate detection is GLOBAL — phone matches across
 *             all users surface as a warning banner, because the
 *             same human being entered twice (under two accounts)
 *             is the usual data-hygiene problem admins want to see.
 *
 * Features:
 *   * User filter dropdown (required for bulk delete)
 *   * Group filter (Tier 2 F#5)
 *   * Multi-select checkboxes on rows
 *   * Bulk delete with user-scope guard
 *   * CSV Export (whole-DB or user-scoped) + CSV Import
 *   * Global phone-duplicate warning banner
 *   * Single-row Add / Edit / Delete preserved
 */

interface FormState {
  name: string
  phone: string
  dob: string
  anniversary: string
  notes: string
  group: string
  user: number | null
}

const emptyForm: FormState = {
  name: '', phone: '', dob: '', anniversary: '', notes: '', group: '', user: null,
}

interface UserOpt {
  id: number
  email: string
  first_name?: string
  last_name?: string
  is_active?: boolean
}

interface DupRow { id: number; name: string; user_email: string; user_id: number; phone_raw: string }
interface DupGroup { phone: string; count: number; rows: DupRow[] }
interface DupsResponse { groups: DupGroup[] }

const inputClass = 'w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50'

export default function CustomerListPage() {
  const { addToast } = useToast()

  // ── Filter state ──
  const [userFilter, setUserFilter] = useState<number | null>(null)
  const [groupFilter, setGroupFilter] = useState<string>('')

  // Only fetch customers when a user filter is set? No — admin wants
  // to see all customers by default (per "admin view of all users'"
  // scope in the proposal). `extraParams` is sent to the API and the
  // backend filters to the requested user when the param is present.
  const extraParams = useMemo(() => {
    const p: Record<string, string | number | undefined> = {}
    if (userFilter) p.user = userFilter
    if (groupFilter) p.group = groupFilter
    return p
  }, [userFilter, groupFilter])

  const {
    data, loading, page, totalPages, totalCount, search,
    setPage, setSearch, create, update, remove, refresh,
  } = useAdminPaginatedCrud<Customer>(customersApi, extraParams)

  // Users for the filter dropdown. 200-row cap is fine for admin
  // operators; a search typeahead is a later polish when the user
  // table grows.
  const [users, setUsers] = useState<UserOpt[]>([])
  useEffect(() => {
    let cancelled = false
    usersApi.list({ page_size: 500 })
      .then(list => { if (!cancelled) setUsers(list as unknown as UserOpt[]) })
      .catch(() => { /* silent — page still works without the dropdown */ })
    return () => { cancelled = true }
  }, [])

  // Single-row CRUD
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Customer | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteItem, setDeleteItem] = useState<Customer | null>(null)

  // Multi-select + bulk
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)

  // ── Global dup-detect (phone collision across all users) ──
  const [dups, setDups] = useState<DupsResponse | null>(null)
  const [dupsOpen, setDupsOpen] = useState(false)
  const loadDups = () => {
    customerBulkApi.duplicates()
      .then(d => setDups(d as DupsResponse))
      .catch(() => { /* silent */ })
  }
  useEffect(() => { loadDups() }, [])  // load once on mount; re-load after mutations below

  // Clear selection whenever the filtered result set changes —
  // prevents the user from selecting Alice's rows, flipping the
  // user filter to Bob, and accidentally "deleting" selected IDs
  // that no longer match.
  useEffect(() => { setSelectedIds(new Set()) }, [userFilter, groupFilter])

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (prev.size === data.length && data.length > 0) return new Set()
      return new Set(data.map(d => d.id))
    })
  }
  const clearSelection = () => setSelectedIds(new Set())
  const allSelected = data.length > 0 && selectedIds.size === data.length

  // Derive distinct groups from the current result set so the group
  // filter chip row has real options (not hardcoded). Admins get
  // only the groups that actually exist under the current filter.
  const distinctGroups = useMemo(() => {
    const s = new Set<string>()
    for (const c of data) {
      if (c.group && c.group.trim()) s.add(c.group.trim())
    }
    return Array.from(s).sort()
  }, [data])

  // ── Single-row CRUD handlers ──
  const openAdd = () => { setEditingItem(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (item: Customer) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      phone: item.phone,
      dob: item.dob || '',
      anniversary: item.anniversary || '',
      notes: item.notes || '',
      group: item.group || '',
      user: item.user ?? null,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    if (!editingItem && !form.user) {
      addToast('Pick an owner user when creating a customer', 'error')
      return
    }
    try {
      if (editingItem) {
        await update(editingItem.id, form)
        addToast('Customer updated successfully')
      } else {
        await create(form)
        addToast('Customer created successfully')
      }
      setForm(emptyForm); setEditingItem(null); setModalOpen(false)
      refresh()
      loadDups()
    } catch {
      addToast('Operation failed. Please try again.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await remove(deleteItem.id)
      addToast('Customer deleted successfully')
      setDeleteItem(null)
      loadDups()
    } catch {
      addToast('Delete failed', 'error')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || !userFilter) return
    setBulkDeleting(true)
    try {
      const resp = await customerBulkApi.bulkDelete(userFilter, Array.from(selectedIds)) as
        { deleted: number; mismatched_ids_ignored: number }
      const extra = resp.mismatched_ids_ignored > 0
        ? ` (${resp.mismatched_ids_ignored} ignored — not owned by this user)`
        : ''
      addToast(`Deleted ${resp.deleted} customer${resp.deleted === 1 ? '' : 's'}${extra}`)
      clearSelection()
      setBulkDeleteOpen(false)
      refresh()
      loadDups()
    } catch {
      addToast('Bulk delete failed', 'error')
    } finally { setBulkDeleting(false) }
  }

  const handleCsvImport = async () => {
    if (!csvFile) { addToast('Pick a CSV file first', 'error'); return }
    setCsvImporting(true)
    try {
      const resp = await customerBulkApi.csvImport(csvFile) as
        { created: unknown[]; updated: unknown[]; skipped: unknown[] }
      addToast(`CSV import: ${resp.created.length} created, ${resp.updated.length} updated, ${resp.skipped.length} skipped`)
      setCsvImportOpen(false)
      setCsvFile(null)
      refresh()
      loadDups()
    } catch {
      addToast('CSV import failed', 'error')
    } finally { setCsvImporting(false) }
  }

  const totalDupGroups = dups?.groups?.length ?? 0
  const totalDupRows = dups?.groups?.reduce((n, g) => n + g.count, 0) ?? 0

  // ── Columns ──
  const columns: Column<Customer>[] = [
    {
      key: 'select' as 'id',
      title: '',
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedIds.has(item.id)}
          onChange={() => toggleSelect(item.id)}
          onClick={e => e.stopPropagation()}
          className="rounded cursor-pointer"
        />
      ),
      className: 'w-10',
    },
    { key: 'name', title: 'Name', sortable: true },
    { key: 'phone', title: 'Phone', render: (c) => {
      const normed = (c.phone || '').replace(/\D/g, '')
      const isDup = !!dups && normed.length >= 6 && dups.groups.some(g => g.phone === normed)
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">{c.phone || '—'}</span>
          {isDup && (
            <span className="text-amber-400" title="Phone is shared across multiple customer rows (possible duplicate)">
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      )
    }},
    { key: 'dob', title: 'DOB', render: (c) => c.dob || '—' },
    { key: 'anniversary', title: 'Anniversary', render: (c) => c.anniversary || '—' },
    { key: 'group' as 'name', title: 'Group', render: (c) => (
      c.group
        ? <span className="text-xs px-2 py-0.5 rounded bg-brand-dark-hover text-brand-text">{c.group}</span>
        : <span className="text-xs text-brand-text-muted/60">—</span>
    )},
    { key: 'user_email' as 'name', title: 'Owner', render: (c) => (
      c.user_email
        ? <span className="text-xs text-brand-text-muted">{c.user_email}</span>
        : <span className="text-xs text-brand-text-muted/60">(user #{c.user ?? '?'})</span>
    )},
    { key: 'actions', title: 'Actions', render: (item) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Customers</h1>
          <p className="text-xs text-brand-text-muted mt-1">
            {totalCount} customer{totalCount === 1 ? '' : 's'} on this view
            {totalDupGroups > 0 && (
              <> · <button
                onClick={() => setDupsOpen(true)}
                className="text-amber-400 underline hover:text-amber-300"
                title="View the global phone-duplicate report"
              >
                {totalDupRows} across {totalDupGroups} phone number{totalDupGroups === 1 ? '' : 's'}
              </button> may be duplicates</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name or phone..." className="w-56" />
          <a
            href={customerBulkApi.csvExportUrl(userFilter ?? undefined)}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors flex items-center gap-1.5"
            title={userFilter ? 'Export this user\'s customers' : 'Export all customers'}
          >
            <Download className="h-3.5 w-3.5" /> CSV Export
          </a>
          <button
            onClick={() => setCsvImportOpen(true)}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors flex items-center gap-1.5"
            title="Import / update from CSV"
          >
            <Upload className="h-3.5 w-3.5" /> CSV Import
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors"
          >
            + Add Customer
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap bg-brand-dark-card rounded-xl border border-brand-dark-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-brand-text-muted" />
          <label className="text-xs font-medium text-brand-text-muted">Owner:</label>
          <select
            value={userFilter ?? ''}
            onChange={e => setUserFilter(e.target.value ? Number(e.target.value) : null)}
            className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-gold/50 min-w-[220px]"
          >
            <option value="">All users</option>
            {users.slice(0, 500).map(u => (
              <option key={u.id} value={u.id}>
                {u.email || `User #${u.id}`}
              </option>
            ))}
          </select>
          {userFilter && (
            <button
              onClick={() => setUserFilter(null)}
              className="text-xs text-brand-text-muted hover:text-brand-text underline"
            >
              Clear
            </button>
          )}
        </div>
        {distinctGroups.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-medium text-brand-text-muted">Group:</label>
            <button
              onClick={() => setGroupFilter('')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                groupFilter === ''
                  ? 'bg-brand-gold text-gray-900'
                  : 'bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border'
              }`}
            >
              All
            </button>
            {distinctGroups.map(g => (
              <button
                key={g}
                onClick={() => setGroupFilter(g)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  groupFilter === g
                    ? 'bg-brand-gold text-gray-900'
                    : 'bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-brand-gold/10 border border-brand-gold/30 rounded-lg flex-wrap">
          <span className="text-sm text-brand-text font-medium">{selectedIds.size} selected</span>
          <button onClick={toggleSelectAll} className="text-xs text-brand-text-muted hover:text-brand-text underline">
            {allSelected ? 'Deselect all on page' : `Select all ${data.length} on page`}
          </button>
          <div className="flex-1" />
          {/* Bulk delete is gated on the user filter per Q1=(a) — makes
              it physically impossible to bulk-delete customers belonging
              to more than one user in a single action. */}
          <button
            onClick={() => setBulkDeleteOpen(true)}
            disabled={!userFilter}
            className="px-3 py-1.5 bg-status-error/90 hover:bg-status-error text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={userFilter ? 'Bulk delete selected customers' : 'Filter to one user before using bulk delete'}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete selected
          </button>
          <button onClick={clearSelection} className="p-1.5 text-brand-text-muted hover:text-brand-text rounded hover:bg-brand-dark-hover transition-colors" title="Clear selection">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {selectedIds.size > 0 && !userFilter && (
        <div className="text-xs text-amber-400 px-2">
          ⚠ Bulk delete is available only when the Owner filter is set to a specific user. Pick a user above to enable it.
        </div>
      )}

      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        {loading
          ? <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
          : <DataTable columns={columns} data={data} />
        }
        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
      </div>

      {/* Single delete */}
      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Customer" message={`Remove "${deleteItem?.name}" from this user's customer list? This cannot be undone.`} confirmText="Delete" variant="danger" />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => !bulkDeleting && setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} customer${selectedIds.size === 1 ? '' : 's'}?`}
        message="Permanently removes the selected customers from this user's list. Any scheduled greetings for them are released (customer FK nulled, greeting history preserved). Cannot be undone."
        confirmText={bulkDeleting ? 'Deleting…' : 'Delete all'}
        variant="danger"
      />

      {/* ─── Add / Edit modal ─── */}
      <Modal isOpen={modalOpen} onClose={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} title={editingItem ? 'Edit Customer' : 'Add Customer'}>
        <div className="space-y-4">
          {!editingItem && (
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
                Owner (user) <span className="text-status-error">*</span>
              </label>
              <select
                value={form.user ?? ''}
                onChange={e => setForm(f => ({ ...f, user: e.target.value ? Number(e.target.value) : null }))}
                className={inputClass}
              >
                <option value="">— Select user —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.email || `User #${u.id}`}</option>
                ))}
              </select>
              <p className="text-[11px] text-brand-text-muted mt-1">
                Who owns this customer entry. Can't be changed after create.
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Name <span className="text-status-error">*</span></label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98XXXXXXXX" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Date of Birth</label>
              <input type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Anniversary</label>
              <input type="date" value={form.anniversary} onChange={e => setForm(f => ({ ...f, anniversary: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Group</label>
            <input value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))} placeholder="VIP / Family / Business / …" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputClass} resize-none`} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setForm(emptyForm); setEditingItem(null); setModalOpen(false); }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      {/* ─── CSV import modal ─── */}
      <Modal
        isOpen={csvImportOpen}
        onClose={() => !csvImporting && setCsvImportOpen(false)}
        title="Import customers from CSV"
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-text-muted">
            Upload a CSV with columns: <code className="text-brand-text bg-brand-dark px-1.5 py-0.5 rounded">id, user_id, user_email, name, phone, dob, anniversary, group, notes, created_at</code>.
            Rows with <code className="bg-brand-dark px-1.5 py-0.5 rounded">id</code> update that customer; rows without require <code className="bg-brand-dark px-1.5 py-0.5 rounded">user_id</code> and create a new customer owned by that user.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-brand-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-gold file:text-gray-900 hover:file:bg-brand-gold-dark file:cursor-pointer"
            disabled={csvImporting}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setCsvFile(null); setCsvImportOpen(false) }} disabled={csvImporting} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors disabled:opacity-50">Cancel</button>
            <button onClick={handleCsvImport} disabled={csvImporting || !csvFile} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors disabled:opacity-50">
              {csvImporting ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Global duplicates drawer ─── */}
      <Modal
        isOpen={dupsOpen}
        onClose={() => setDupsOpen(false)}
        title="Global phone duplicates"
        size="lg"
      >
        <div className="space-y-3">
          <p className="text-sm text-brand-text-muted">
            Customer rows sharing the same normalised phone number across
            all users. Helps spot the same human entered under multiple
            accounts, or one user entering the same contact twice.
          </p>
          {totalDupGroups === 0 && (
            <div className="py-8 text-center text-sm text-brand-text-muted">
              🎉 No phone duplicates found.
            </div>
          )}
          {dups?.groups?.map(g => (
            <div key={g.phone} className="bg-brand-dark rounded-lg border border-brand-dark-border/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <code className="font-mono text-sm text-brand-gold">+{g.phone}</code>
                <span className="text-xs text-brand-text-muted">{g.count} rows</span>
              </div>
              <ul className="space-y-1">
                {g.rows.map(r => (
                  <li key={r.id} className="flex items-center gap-2 text-xs">
                    <span className="text-brand-text font-medium">{r.name}</span>
                    <span className="text-brand-text-muted">·</span>
                    <span className="text-brand-text-muted">{r.user_email || `user #${r.user_id}`}</span>
                    <span className="text-brand-text-muted/60 ml-auto font-mono">#{r.id}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <button onClick={() => setDupsOpen(false)} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Close</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
