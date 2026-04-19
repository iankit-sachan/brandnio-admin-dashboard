/** Small undo/redo hook for the frame designer.
 *
 *  Tracks the full ``layers`` array snapshot per committed mutation. Capped at
 *  50 steps per session — enough for a realistic design session without
 *  unbounded memory growth.
 *
 *  Three setters:
 *    - ``set(next)``        — records a new undo step (normal commits)
 *    - ``setSilent(next)``  — updates present without touching history (live
 *                             drag preview — call ``commit()`` on release)
 *    - ``reset(next)``      — replaces state AND clears history (hydrate)
 */
import { useCallback, useRef, useState } from 'react'

export function useUndoRedo<T>(initial: T) {
  const [present, setPresent] = useState<T>(initial)
  const past = useRef<T[]>([])
  const future = useRef<T[]>([])
  /** Snapshot taken at the start of the current silent-update streak.
   *  Used by commit() to know what to push onto past. */
  const baseline = useRef<T | null>(null)
  const MAX = 50

  const canUndo = past.current.length > 0
  const canRedo = future.current.length > 0

  const set = useCallback((next: T) => {
    past.current.push(present)
    if (past.current.length > MAX) past.current.shift()
    future.current = []
    baseline.current = null
    setPresent(next)
  }, [present])

  /** Update present state without recording a step. Remembers the pre-streak
   *  baseline so a later ``commit()`` records ONE step spanning the whole streak. */
  const setSilent = useCallback((next: T) => {
    if (baseline.current === null) baseline.current = present
    setPresent(next)
  }, [present])

  /** Record the end of a silent-update streak (e.g. pointer-up after drag). */
  const commit = useCallback(() => {
    if (baseline.current === null) return
    past.current.push(baseline.current)
    if (past.current.length > MAX) past.current.shift()
    future.current = []
    baseline.current = null
  }, [])

  const undo = useCallback(() => {
    if (past.current.length === 0) return
    const prev = past.current.pop() as T
    future.current.push(present)
    baseline.current = null
    setPresent(prev)
  }, [present])

  const redo = useCallback(() => {
    if (future.current.length === 0) return
    const next = future.current.pop() as T
    past.current.push(present)
    baseline.current = null
    setPresent(next)
  }, [present])

  /** Replace state AND clear history (hydrate from server). */
  const reset = useCallback((next: T) => {
    past.current = []
    future.current = []
    baseline.current = null
    setPresent(next)
  }, [])

  return { state: present, set, setSilent, commit, undo, redo, reset, canUndo, canRedo }
}
