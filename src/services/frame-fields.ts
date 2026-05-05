/**
 * Canonical frame text-layer field map — fetched from the backend
 * (single source of truth in `backend/posters/frame_fields.py`).
 *
 * Used by the Frame Designer to:
 *  - Validate that every layer's `name` is a recognised alias.
 *  - Suggest "did you mean X?" via Levenshtein distance when admin
 *    loads a legacy frame whose field name has drifted.
 *  - Power autocomplete when (in the future) free-form layer-name
 *    input is added — today the picker is a fixed grid so this is
 *    primarily defensive.
 *
 * # Caching
 *
 * localStorage with 1 h TTL. If the cache is fresh we don't re-fetch.
 * Cache miss / stale → fetch in background; if the fetch fails (5xx,
 * network), we keep using the stale cache rather than blanking out.
 *
 * # Drift detection
 *
 * When the response's `schema_version` is greater than what we
 * recognise (currently 1), we still use the `aliases` map (it's
 * structurally compatible) but log a warning so we know to update.
 */
import api from './api'

export interface FrameField {
  key: string
  label: string
  aliases: string[]
  input_type: 'text' | 'phone' | 'email' | 'url'
}

export interface FrameFieldsPayload {
  schema_version: number
  fields: FrameField[]
  /** Pre-flattened lowercase_alias → canonical_key map. */
  aliases: Record<string, string>
}

const SUPPORTED_SCHEMA_VERSION = 1
const CACHE_KEY = 'brandnio.frame_fields.cache.v1'
const CACHE_TTL_MS = 60 * 60 * 1000  // 1 hour

interface CacheEntry {
  fetched_at: number
  payload: FrameFieldsPayload
}

let _inflight: Promise<FrameFieldsPayload> | null = null

/**
 * Get the field map. Returns immediately from localStorage cache when
 * fresh; falls back to network when stale or absent. Network failures
 * fall back to the stale cache (so an offline / 5xx admin can still
 * load and edit frames).
 *
 * Throws only when there is NEITHER a cached value NOR a successful
 * network fetch — i.e. first-load + offline at the same time. Callers
 * should treat that as "validation impossible, allow save anyway".
 */
export async function getFrameFields(): Promise<FrameFieldsPayload> {
  const cached = readCache()
  const now = Date.now()
  if (cached && now - cached.fetched_at < CACHE_TTL_MS) {
    return cached.payload
  }

  // De-dupe concurrent calls — mounting two FrameDesigner instances on
  // the same page shouldn't fire two requests.
  if (_inflight) return _inflight

  _inflight = (async () => {
    try {
      const resp = await api.get<FrameFieldsPayload>('/api/posters/frame-fields/')
      const payload = resp.data
      if (payload.schema_version > SUPPORTED_SCHEMA_VERSION) {
        console.warn(
          `[frame-fields] backend schema_version=${payload.schema_version} > supported=${SUPPORTED_SCHEMA_VERSION}; ` +
          `aliases map still consumed but consider updating the admin client.`
        )
      }
      writeCache({ fetched_at: now, payload })
      return payload
    } catch (e) {
      // Stale cache > nothing. Re-raise only when we have neither.
      if (cached) {
        console.warn('[frame-fields] fetch failed, using stale cache:', e)
        return cached.payload
      }
      throw e
    } finally {
      _inflight = null
    }
  })()
  return _inflight
}

/**
 * Resolve an alias (case-insensitive) to its canonical key.
 * Returns null when the field name is not in the vocabulary.
 */
export function canonicalFor(payload: FrameFieldsPayload, alias: string): string | null {
  if (!alias) return null
  return payload.aliases[alias.toLowerCase()] ?? null
}

/**
 * Levenshtein-distance "did you mean?" suggestion. Used to help admin
 * recover from typos when loading a legacy frame whose layer.name
 * doesn't resolve. Returns the closest known alias (case-insensitive)
 * or null when nothing is within edit distance 3.
 */
export function suggestForUnknown(
  payload: FrameFieldsPayload,
  unknown: string,
): string | null {
  if (!unknown) return null
  const target = unknown.toLowerCase()
  let best: { alias: string; dist: number } | null = null
  for (const alias of Object.keys(payload.aliases)) {
    const d = levenshtein(target, alias)
    if (best === null || d < best.dist) {
      best = { alias, dist: d }
    }
  }
  // Only suggest when the typo is plausible. Edit distance 3 is the
  // standard "auto-correct sweet spot" — closer suggests confidence,
  // farther becomes a random word.
  if (best && best.dist <= 3 && best.dist < unknown.length) return best.alias
  return null
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const m = a.length
  const n = b.length
  // Two-row rolling DP — O(min(m, n)) memory.
  let prev = new Array<number>(n + 1)
  let curr = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      curr[j] = Math.min(
        curr[j - 1] + 1,        // insert
        prev[j] + 1,            // delete
        prev[j - 1] + cost,     // substitute
      )
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry
    if (
      typeof parsed?.fetched_at === 'number' &&
      parsed.payload?.aliases &&
      typeof parsed.payload.aliases === 'object'
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function writeCache(entry: CacheEntry): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // Quota exceeded / disabled — non-fatal. Next mount re-fetches.
  }
}
