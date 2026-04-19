/**
 * Client-side helpers for the festival bulk-upload flow:
 *   • detectImageRatio() — read pixel dimensions of an image File and snap to
 *     the closest supported ratio (1:1, 4:5, 9:16, 16:9)
 *   • groupFilesByRatio() — bucket a heterogeneous file list into ratio batches
 *     so the modal can fire one bulkUpload call per ratio (Phase A: Q1=A)
 *
 * Pure functions, no React. Safe to test in isolation.
 */

export type DetectedRatio = '1:1' | '4:5' | '9:16' | '16:9'

const SUPPORTED_RATIOS: { ratio: DetectedRatio; w: number; h: number }[] = [
  { ratio: '1:1', w: 1, h: 1 },
  { ratio: '4:5', w: 4, h: 5 },
  { ratio: '9:16', w: 9, h: 16 },
  { ratio: '16:9', w: 16, h: 9 },
]

/** Read pixel dimensions of an image File via an off-screen Image element.
 *  Returns null for non-image files (e.g. videos) — caller should treat those
 *  as a separate flow. Uses createObjectURL → revokeObjectURL to avoid leaks. */
export async function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith('image/')) return null
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

/** Snap an arbitrary (w, h) pair to the closest supported ratio.
 *  Compares by `|w/h - target_w/target_h|` distance; ties broken by listing
 *  order in SUPPORTED_RATIOS. */
export function snapToSupportedRatio(width: number, height: number): DetectedRatio {
  if (width <= 0 || height <= 0) return '1:1'
  const actual = width / height
  let best: DetectedRatio = '1:1'
  let bestDist = Number.POSITIVE_INFINITY
  for (const candidate of SUPPORTED_RATIOS) {
    const target = candidate.w / candidate.h
    const dist = Math.abs(actual - target)
    if (dist < bestDist) {
      bestDist = dist
      best = candidate.ratio
    }
  }
  return best
}

/** Detect the supported ratio for a single image file. Videos return null
 *  so the caller can treat them as a single-ratio batch (admin still picks
 *  the ratio explicitly for videos — we can't read video dimensions cheaply
 *  in the browser without playing the file). */
export async function detectImageRatio(file: File): Promise<DetectedRatio | null> {
  const dims = await readImageDimensions(file)
  if (!dims) return null
  return snapToSupportedRatio(dims.width, dims.height)
}

/** Group an enriched file list (each file already has its detected ratio)
 *  by ratio, returning ratio-bucketed batches ready for sequential upload.
 *  Files without a detected ratio fall back to `fallbackRatio` (used for
 *  videos and image-decode failures). */
export function groupFilesByRatio<T extends { file: File; ratio: DetectedRatio | null }>(
  enriched: T[],
  fallbackRatio: DetectedRatio,
): Array<{ aspect_ratio: DetectedRatio; files: File[] }> {
  const buckets = new Map<DetectedRatio, File[]>()
  for (const item of enriched) {
    const r = item.ratio ?? fallbackRatio
    if (!buckets.has(r)) buckets.set(r, [])
    buckets.get(r)!.push(item.file)
  }
  return Array.from(buckets.entries()).map(([aspect_ratio, files]) => ({
    aspect_ratio,
    files,
  }))
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
