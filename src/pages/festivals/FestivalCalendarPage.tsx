import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { festivalsApi, postersApi } from '../../services/admin-api'
import { useToast } from '../../context/ToastContext'
import type { Festival, PosterAspectRatio, FestivalCalendarPoster } from '../../types/festival.types'
import { Info, Trash2, X } from 'lucide-react'

// Bump this number when you need to bust the poster-grid cache on save.
// (We invalidate by re-fetching on the refreshTick state below.)

type Tab = 'image' | 'video'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WEEKDAY_NAMES = ['S','M','T','W','T','F','S']

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay() // 0=Sun
}
function isoDate(y: number, m: number, d: number) {
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

export default function FestivalCalendarPage() {
  const { addToast } = useToast()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(isoDate(today.getFullYear(), today.getMonth(), today.getDate()))

  const [festivalsByDate, setFestivalsByDate] = useState<Record<string, Festival[]>>({})
  const [activeFestivalId, setActiveFestivalId] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('image')
  const [ratioFilter, setRatioFilter] = useState<PosterAspectRatio | 'all'>('all')
  const [languageFilter, setLanguageFilter] = useState<string | 'all'>('all')

  const [posters, setPosters] = useState<FestivalCalendarPoster[]>([])
  const [loadingPosters, setLoadingPosters] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  // Multi-select state for bulk delete.
  // Cleared when active festival/tab/ratio changes (selection no longer valid).
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const festivalsToday = festivalsByDate[selectedDate] ?? []

  // Fetch festivals for the visible month
  useEffect(() => {
    festivalsApi.byMonth(year, month + 1).then((r) => {
      setFestivalsByDate(r.dates)
    }).catch(() => {
      addToast('Failed to load festivals for month', 'error')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  // Reset active festival when selected date changes
  useEffect(() => {
    const fs = festivalsByDate[selectedDate] ?? []
    if (fs.length > 0) setActiveFestivalId(fs[0].id)
    else setActiveFestivalId(null)
  }, [selectedDate, festivalsByDate])

  // Fetch posters for active festival + filters
  useEffect(() => {
    if (!activeFestivalId) { setPosters([]); return }
    setLoadingPosters(true)
    const params: Record<string, string | number> = {
      festival: activeFestivalId,
      media_type: tab,
      page_size: 100,
    }
    if (ratioFilter !== 'all') params.aspect_ratio = ratioFilter
    postersApi.listPaginated(params).then((r) => {
      setPosters(r.results as unknown as FestivalCalendarPoster[])
    }).catch(() => {
      addToast('Failed to load posters', 'error')
    }).finally(() => setLoadingPosters(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFestivalId, tab, ratioFilter, refreshTick])

  // Whenever the visible poster set changes (festival/tab/filter switch),
  // clear the multi-select — the previous selection is no longer relevant.
  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeFestivalId, tab, ratioFilter])

  const posterStats = useMemo(() => {
    const filtered = languageFilter === 'all'
      ? posters
      : posters.filter(p => (p.language_code || 'universal') === languageFilter)
    return { visible: filtered, total: filtered.length }
  }, [posters, languageFilter])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // Build calendar grid
  const totalDays = daysInMonth(year, month)
  const firstDayWeek = firstDayOfMonth(year, month)
  const cells: Array<{ day: number; iso: string } | null> = []
  for (let i = 0; i < firstDayWeek; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push({ day: d, iso: isoDate(year, month, d) })

  const deletePoster = async (p: FestivalCalendarPoster) => {
    if (!confirm(`Delete "${p.title}"?`)) return
    try {
      await postersApi.delete(p.id)
      addToast('Poster deleted')
      setRefreshTick(t => t + 1)
    } catch {
      addToast('Delete failed', 'error')
    }
  }

  // ─── Multi-select helpers ───
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const selectAllVisible = () => {
    setSelectedIds(new Set(posterStats.visible.map(p => p.id)))
  }
  const clearSelection = () => setSelectedIds(new Set())

  const doBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    const ids = Array.from(selectedIds)
    // Parallel deletes — backend already supports DELETE /api/admin/posters/{id}/.
    // Promise.allSettled so a partial failure still reports what worked.
    const results = await Promise.allSettled(ids.map(id => postersApi.delete(id)))
    const ok = results.filter(r => r.status === 'fulfilled').length
    const failed = results.length - ok
    if (failed === 0) {
      addToast(`Deleted ${ok} poster${ok === 1 ? '' : 's'}`)
    } else if (ok === 0) {
      addToast(`All ${failed} deletes failed`, 'error')
    } else {
      addToast(`Deleted ${ok}, ${failed} failed`, 'error')
    }
    setBulkDeleting(false)
    setConfirmBulkDelete(false)
    setSelectedIds(new Set())
    setRefreshTick(t => t + 1)
  }

  const allVisibleSelected = posterStats.visible.length > 0
    && posterStats.visible.every(p => selectedIds.has(p.id))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
          📅 Festival Calendar
        </h1>
        <p className="text-sm text-brand-text-muted mt-0.5">
          Browse posters by date · view, filter, and delete
        </p>
      </div>

      {/* Info banner — clear separation of concerns: this page is view-only.
          To upload posters, admin goes to Festivals List (Phase 1 + Phase 2). */}
      <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-indigo-300 shrink-0 mt-0.5" />
          <div>
            <div className="text-indigo-200 font-semibold text-sm">
              This page is for viewing & managing existing posters.
            </div>
            <div className="text-brand-text-muted text-xs mt-1">
              To <strong>upload new posters</strong>, go to <Link to="/festivals" className="text-indigo-300 underline">Festivals List</Link> →
              click <strong>+ Add Festival</strong> (new festivals) or the <strong>⬆ Upload</strong> button on any row (existing festival).
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        {/* ── LEFT: Calendar grid ── */}
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="w-7 h-7 rounded-full hover:bg-brand-dark-hover text-brand-text-muted">‹</button>
            <div className="font-semibold text-brand-text">{MONTH_NAMES[month]} {year}</div>
            <button onClick={nextMonth} className="w-7 h-7 rounded-full hover:bg-brand-dark-hover text-brand-text-muted">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs text-center text-brand-text-muted mb-1">
            {WEEKDAY_NAMES.map((w, i) => <div key={i}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (!c) return <div key={i} />
              const festivals = festivalsByDate[c.iso] ?? []
              const selected = c.iso === selectedDate
              const isToday = c.iso === isoDate(today.getFullYear(), today.getMonth(), today.getDate())
              return (
                <button key={i}
                  onClick={() => setSelectedDate(c.iso)}
                  className={
                    'aspect-square rounded-lg text-sm flex flex-col items-center justify-center transition-colors ' +
                    (selected
                      ? 'bg-amber-500 text-black font-semibold'
                      : festivals.length > 0
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                        : 'text-brand-text hover:bg-brand-dark-hover')
                  }
                >
                  <span className={isToday && !selected ? 'underline underline-offset-2' : ''}>{c.day}</span>
                  {festivals.length > 0 && !selected && (
                    <span className="text-[9px] leading-none mt-0.5">
                      {festivals.length > 1 ? `${festivals.length}●` : '●'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected date summary */}
          <div className="mt-4 pt-4 border-t border-brand-dark-border/50">
            <div className="text-sm text-brand-text-muted mb-2">
              {selectedDate} · {festivalsToday.length} festival{festivalsToday.length === 1 ? '' : 's'}
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {festivalsToday.length === 0 && (
                <span className="text-xs text-brand-text-muted italic">
                  No festivals on this date.{' '}
                  <Link to="/festivals" className="text-amber-400 hover:underline not-italic">Add one →</Link>
                </span>
              )}
              {festivalsToday.map(f => (
                <button key={f.id}
                  onClick={() => setActiveFestivalId(f.id)}
                  className={
                    'px-2.5 py-1 rounded-full text-xs transition-colors ' +
                    (activeFestivalId === f.id
                      ? 'bg-amber-500 text-black font-medium'
                      : 'bg-[#2a2a3e] text-brand-text border border-brand-dark-border/50 hover:border-amber-500/50')
                  }
                >{f.name}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Poster grid with filters ── */}
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-3 pb-3 border-b border-brand-dark-border/50">
            {/* Tab: image / video */}
            <div className="inline-flex rounded-lg bg-[#2a2a3e] p-0.5">
              {(['image','video'] as Tab[]).map(t => (
                <button key={t}
                  onClick={() => setTab(t)}
                  className={
                    'px-3 py-1 text-xs rounded-md capitalize transition-colors ' +
                    (tab === t ? 'bg-indigo-600 text-white' : 'text-brand-text-muted hover:text-brand-text')
                  }
                >{t}s</button>
              ))}
            </div>
            {/* Size filter */}
            <select value={ratioFilter} onChange={e => setRatioFilter(e.target.value as PosterAspectRatio | 'all')}
              className="bg-[#2a2a3e] border border-brand-dark-border/50 rounded-lg px-2 py-1 text-xs text-brand-text">
              <option value="all">All sizes</option>
              <option value="1:1">1:1</option>
              <option value="4:5">4:5</option>
              <option value="9:16">Story (9:16)</option>
            </select>
            {/* Language filter (client-side, over already-loaded rows) */}
            <select value={languageFilter} onChange={e => setLanguageFilter(e.target.value)}
              className="bg-[#2a2a3e] border border-brand-dark-border/50 rounded-lg px-2 py-1 text-xs text-brand-text">
              <option value="all">All languages</option>
              <option value="universal">Universal (no tag)</option>
              {Array.from(new Set(posters.map(p => p.language_code).filter((c): c is string => !!c))).map(code => (
                <option key={code} value={code}>{code.toUpperCase()}</option>
              ))}
            </select>
            <div className="ml-auto text-xs text-brand-text-muted">
              {posterStats.total} {tab}{posterStats.total === 1 ? '' : 's'}
            </div>
          </div>

          {/* Grid */}
          {loadingPosters ? (
            <div className="py-12 text-center text-brand-text-muted">Loading…</div>
          ) : posterStats.visible.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl opacity-30 mb-2">🖼️</div>
              <div className="text-sm font-semibold text-brand-text">No {tab}s yet</div>
              <div className="text-xs text-brand-text-muted mt-1">
                {activeFestivalId
                  ? <>To add posters to this festival, go to <Link to="/festivals" className="text-amber-400 underline">Festivals List</Link>.</>
                  : 'Select a festival on the left to begin.'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-20">
              {posterStats.visible.map(p => {
                const isSelected = selectedIds.has(p.id)
                return (
                  <div key={p.id}
                    onClick={() => toggleSelect(p.id)}
                    className={
                      'group relative bg-[#2a2a3e] rounded-lg overflow-hidden border-2 transition-all cursor-pointer ' +
                      (isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/40'
                        : 'border-brand-dark-border/50 hover:border-brand-text-muted')
                    }
                  >
                    {/* Selection checkbox (top-left) */}
                    <div className={
                      'absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ' +
                      (isSelected
                        ? 'bg-amber-500 border-amber-500 text-black'
                        : 'bg-black/60 border-white/40 text-transparent group-hover:border-white')
                    }>
                      {isSelected && <span className="text-xs leading-none">✓</span>}
                    </div>

                    <div className="aspect-square bg-black/30">
                      {p.media_type === 'video' ? (
                        <div className="relative w-full h-full">
                          {p.thumbnail_url ? (
                            <img src={p.thumbnail_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">▶</div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-black/70 flex items-center justify-center">▶</div>
                          </div>
                        </div>
                      ) : (
                        <img src={p.thumbnail_url || p.image_url} className="w-full h-full object-cover" alt="" />
                      )}
                    </div>
                    <div className="p-2">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex gap-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 text-brand-text-muted uppercase">
                            {p.aspect_ratio}
                          </span>
                          {p.language_code && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase">
                              {p.language_code}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePoster(p) }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 text-sm"
                          title="Delete"
                        >🗑</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating bulk-action bar — appears when any poster is selected */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-xl bg-brand-dark-card border border-brand-gold/40 shadow-2xl backdrop-blur">
          <span className="text-sm font-semibold text-brand-text">
            {selectedIds.size} poster{selectedIds.size === 1 ? '' : 's'} selected
          </span>
          <button
            onClick={selectAllVisible}
            disabled={allVisibleSelected}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-dark-hover text-brand-text-muted hover:text-brand-text disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select All ({posterStats.visible.length})
          </button>
          <button
            onClick={clearSelection}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-dark-hover text-brand-text-muted hover:text-brand-text inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
          <div className="w-px h-6 bg-brand-dark-border" />
          <button
            onClick={() => setConfirmBulkDelete(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-status-error text-white font-medium hover:opacity-90 inline-flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Delete Selected
          </button>
        </div>
      )}

      {/* Bulk-delete confirmation dialog */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-brand-dark-card rounded-xl w-full max-w-sm border border-brand-dark-border shadow-2xl p-5">
            <h3 className="text-base font-semibold text-brand-text mb-2">
              Delete {selectedIds.size} poster{selectedIds.size === 1 ? '' : 's'}?
            </h3>
            <p className="text-sm text-brand-text-muted mb-4">
              This action cannot be undone. The selected posters will be permanently removed.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmBulkDelete(false)} disabled={bulkDeleting}
                className="px-4 py-2 text-sm rounded-lg bg-brand-dark-hover text-brand-text hover:bg-brand-dark-border disabled:opacity-50">
                Cancel
              </button>
              <button onClick={doBulkDelete} disabled={bulkDeleting}
                className="px-4 py-2 text-sm rounded-lg bg-status-error text-white font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5" />
                {bulkDeleting ? 'Deleting…' : `Delete ${selectedIds.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
