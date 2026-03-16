import { useState } from 'react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { Pencil, CheckCircle } from 'lucide-react'
import { mockContactSubmissions } from '../../services/mock-data'
import type { ContactSubmission } from '../../types'

export default function ContactInboxPage() {
  const { addToast } = useToast()
  const [data, setData] = useState<ContactSubmission[]>([...mockContactSubmissions])
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ContactSubmission | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [resolveItem, setResolveItem] = useState<ContactSubmission | null>(null)

  const openEditNotes = (item: ContactSubmission) => {
    setEditingItem(item)
    setAdminNotes(item.admin_notes)
    setEditModalOpen(true)
  }

  const handleSaveNotes = () => {
    if (!editingItem) return
    setData(prev => prev.map(d => d.id === editingItem.id ? { ...d, admin_notes: adminNotes } : d))
    addToast('Notes updated successfully')
    setEditModalOpen(false)
  }

  const openResolve = (item: ContactSubmission) => setResolveItem(item)

  const handleResolve = () => {
    if (!resolveItem) return
    setData(prev => prev.map(d => d.id === resolveItem.id ? { ...d, is_resolved: true } : d))
    addToast('Marked as resolved')
    setResolveItem(null)
  }

  const columns: Column<ContactSubmission>[] = [
    { key: 'user_name', title: 'User', sortable: true },
    { key: 'email', title: 'Email' },
    { key: 'subject', title: 'Subject', sortable: true },
    { key: 'message', title: 'Message', render: (c) => <span className="truncate max-w-[200px] block">{c.message}</span> },
    { key: 'admin_notes', title: 'Admin Notes', render: (c) => <span className="truncate max-w-[150px] block text-brand-text-muted">{c.admin_notes || '—'}</span> },
    { key: 'is_resolved', title: 'Status', render: (c) => c.is_resolved ? <span className="text-status-success">Resolved</span> : <span className="text-status-warning">Pending</span> },
    { key: 'created_at', title: 'Created' },
    { key: 'actions', title: 'Actions', render: (item) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEditNotes(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors" title="Edit Notes"><Pencil className="h-4 w-4" /></button>
        {!item.is_resolved && (
          <button onClick={(e) => { e.stopPropagation(); openResolve(item) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-success transition-colors" title="Mark Resolved"><CheckCircle className="h-4 w-4" /></button>
        )}
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">Contact Inbox</h1>
      <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50">
        <DataTable columns={columns} data={data} />
      </div>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Admin Notes">
        <div className="space-y-4">
          {editingItem && (
            <div className="space-y-2 text-sm">
              <p className="text-brand-text-muted"><span className="font-medium text-brand-text">From:</span> {editingItem.user_name} ({editingItem.email})</p>
              <p className="text-brand-text-muted"><span className="font-medium text-brand-text">Subject:</span> {editingItem.subject}</p>
              <p className="text-brand-text-muted"><span className="font-medium text-brand-text">Message:</span> {editingItem.message}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Admin Notes</label>
            <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={4} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border transition-colors">Cancel</button>
            <button onClick={handleSaveNotes} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!resolveItem} onClose={() => setResolveItem(null)} onConfirm={handleResolve} title="Mark as Resolved" message={`Mark the submission from "${resolveItem?.user_name}" as resolved?`} confirmText="Mark Resolved" variant="warning" />
    </div>
  )
}
