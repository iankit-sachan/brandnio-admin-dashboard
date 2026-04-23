/**
 * Polls /api/admin/sidebar-badges/ every 60 s and exposes a map of
 * { badgeKey → count } to the sidebar.
 *
 * Design notes:
 *   - First fetch runs on mount; re-runs every 60 s thereafter.
 *   - When the browser tab is hidden we stop polling (no point burning
 *     DB cycles on a background tab) and resume on the next `visible`
 *     event with an immediate refetch.
 *   - A failed request does NOT clear existing values — we'd rather
 *     show the last known counts than flash an empty pill. The next
 *     successful poll replaces them.
 *   - Shared singleton: every component that calls the hook reads the
 *     same `badges` object from a tiny pub-sub store so a dozen sidebar
 *     items don't fire a dozen copies of the request.
 */
import { useEffect, useState } from 'react'
import { sidebarBadgesApi, type SidebarBadges } from '../services/admin-api'

const EMPTY: SidebarBadges = {
  contact_inbox: 0,
  partner_inbox: 0,
  delete_requests: 0,
}

const POLL_MS = 60_000

// Module-level singleton so N hook callers share one poller + one value.
let current: SidebarBadges = EMPTY
let started = false
let timer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<(b: SidebarBadges) => void>()

function broadcast() {
  for (const fn of listeners) fn(current)
}

async function fetchOnce() {
  try {
    const data = await sidebarBadgesApi.fetch()
    current = {
      contact_inbox: Number(data.contact_inbox) || 0,
      partner_inbox: Number(data.partner_inbox) || 0,
      delete_requests: Number(data.delete_requests) || 0,
    }
    broadcast()
  } catch {
    // Keep previous values; do not blank out pills on a transient
    // network error.
  }
}

function schedule() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    if (document.visibilityState === 'visible') {
      fetchOnce().finally(schedule)
    } else {
      // Tab hidden — just re-arm the timer without calling the API.
      schedule()
    }
  }, POLL_MS)
}

function startPollerOnce() {
  if (started) return
  started = true
  fetchOnce()
  schedule()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchOnce()
    }
  })
}

export function useSidebarBadges(): SidebarBadges {
  const [value, setValue] = useState<SidebarBadges>(current)

  useEffect(() => {
    startPollerOnce()
    listeners.add(setValue)
    // Sync to latest on mount in case poller already fired.
    setValue(current)
    return () => { listeners.delete(setValue) }
  }, [])

  return value
}
