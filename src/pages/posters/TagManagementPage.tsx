import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SearchInput } from '../../components/ui/SearchInput'
import { useToast } from '../../context/ToastContext'
import { Tag, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { posterTagsApi } from '../../services/admin-api'
import { CategoryTabNav } from '../../components/CategoryTabNav'

interface TagItem {
  tag: string
  count: number
}

export default function TagManagementPage() {
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [tags, setTags] = useState<TagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Rename state
  const [renameTag, setRenameTag] = useState<TagItem | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [renaming, setRenaming] = useState(false)

  // Delete state
  const [deleteTag, setDeleteTag] = useState<TagItem | null>(null)

  const fetchTags = async () => {
    setLoading(true)
    try {
      const result = await posterTagsApi.list()
      setTags(result)
    } catch { addToast('Failed to load tags', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTags() }, [])

  const filtered = useMemo(() =>
    tags.filter(t => !search || t.tag.includes(search.toLowerCase())),
    [tags, search]
  )

  const handleRename = async () => {
    if (!renameTag || !newTagName.trim()) return
    setRenaming(true)
    try {
      const result = await posterTagsApi.rename(renameTag.tag, newTagName.trim().toLowerCase())
      addToast(`Renamed "${renameTag.tag}" to "${newTagName.trim().toLowerCase()}" on ${result.renamed} posters`)
      setRenameTag(null)
      setNewTagName('')
      fetchTags()
    } catch { addToast('Rename failed', 'error') }
    finally { setRenaming(false) }
  }

  const handleDelete = async () => {
    if (!deleteTag) return
    try {
      const result = await posterTagsApi.delete(deleteTag.tag)
      addToast(`Removed "${deleteTag.tag}" from ${result.removed_from} posters`)
      setDeleteTag(null)
      fetchTags()
    } catch { addToast('Delete failed', 'error') }
  }

  return (
    <div className="space-y-4">
      <CategoryTabNav />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
          <Tag className="h-6 w-6 text-brand-gold" />
          Tag Manager
        </h1>
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search tags..." className="w-64" />
          <span className="text-sm text-brand-text-muted">{filtered.length} tags</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-brand-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-brand-text-muted">
          <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">{search ? 'No tags match your search' : 'No tags found'}</p>
        </div>
      ) : (
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-dark text-brand-text-muted text-left text-xs uppercase tracking-wider">
                <th className="px-4 py-3">Tag</th>
                <th className="px-4 py-3">Posters</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-dark-border/30">
              {filtered.map(item => (
                <tr key={item.tag} className="hover:bg-brand-dark-hover/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-indigo-500/10 text-indigo-400">
                      <Tag className="h-3.5 w-3.5" />
                      {item.tag}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-text-muted">{item.count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/posters?tag=${encodeURIComponent(item.tag)}`)} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-blue-400 transition-colors" title="View posters with this tag"><ExternalLink className="h-4 w-4" /></button>
                      <button onClick={() => { setRenameTag(item); setNewTagName(item.tag) }} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-brand-gold transition-colors" title="Rename"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteTag(item)} className="p-1.5 rounded-lg hover:bg-brand-dark-hover text-brand-text-muted hover:text-status-error transition-colors" title="Delete tag from all posters"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rename Modal */}
      <Modal isOpen={!!renameTag} onClose={() => { setRenameTag(null); setNewTagName('') }} title={`Rename Tag: "${renameTag?.tag}"`}>
        <div className="space-y-4">
          <p className="text-sm text-brand-text-muted">This will rename the tag on {renameTag?.count} poster(s).</p>
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">New Tag Name</label>
            <input value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRename() }} className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold/50" autoFocus />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setRenameTag(null); setNewTagName('') }} className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text">Cancel</button>
            <button onClick={handleRename} disabled={renaming || !newTagName.trim() || newTagName.trim().toLowerCase() === renameTag?.tag} className="px-4 py-2 bg-brand-gold text-gray-900 font-medium text-sm rounded-lg hover:bg-brand-gold-dark disabled:opacity-50">
              {renaming ? 'Renaming...' : 'Rename'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTag} onClose={() => setDeleteTag(null)} onConfirm={handleDelete} title="Delete Tag" message={`Remove tag "${deleteTag?.tag}" from ${deleteTag?.count} poster(s)? The posters themselves are not deleted.`} confirmText="Remove Tag" variant="danger" />
    </div>
  )
}
