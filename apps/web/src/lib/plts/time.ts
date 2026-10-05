/**
 * The installation runs on WIB (UTC+7, no DST), so day boundaries are
 * computed with a fixed offset instead of relying on the viewer's timezone.
 */
export const TZ_OFFSET_MS = 7 * 60 * 60 * 1000
export const DAY_MS = 24 * 60 * 60 * 1000
export const STEP_MIN = 5
export const STEP_MS = STEP_MIN * 60 * 1000
export const STEPS_PER_DAY = DAY_MS / STEP_MS

/** yyyy-MM-dd of the WIB calendar day containing `ts`. */
export function dayKey(ts: number): string {
  return new Date(ts + TZ_OFFSET_MS).toISOString().slice(0, 10)
}

/** Epoch ms of 00:00 WIB on the given day key. */
export function dayStart(key: string): number {
  return Date.parse(`${key}T00:00:00Z`) - TZ_OFFSET_MS
}

export function addDays(key: string, n: number): string {
  return dayKey(dayStart(key) + n * DAY_MS + DAY_MS / 2)
}

export function daysBetween(fromKey: string, toKey: string): string[] {
  const out: string[] = []
  for (let k = fromKey; k <= toKey; k = addDays(k, 1)) out.push(k)
  return out
}

/** Hour-of-day (fractional) in WIB. */
export function wibHours(ts: number): number {
  const d = new Date(ts + TZ_OFFSET_MS)
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600
}

/** Treat a local calendar Date (from a date picker) as a WIB day key. */
export function keyFromLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function localDateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}
