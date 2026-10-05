import { TZ_OFFSET_MS } from "./time"

const nf = (min: number, max = min) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: min, maximumFractionDigits: max })

const nf0 = nf(0)
const nf1 = nf(1)
const nf2 = nf(2)
const nf3 = nf(3)

export const fmt = {
  n0: (v: number) => nf0.format(v),
  n1: (v: number) => nf1.format(v),
  n2: (v: number) => nf2.format(v),
  n3: (v: number) => nf3.format(v),
  /** 1234 W → "1,23 kW"; 640 W → "640 W" */
  power(w: number) {
    return Math.abs(w) >= 1000 ? { value: nf2.format(w / 1000), unit: "kW" } : { value: nf0.format(w), unit: "W" }
  },
  powerText(w: number) {
    const p = fmt.power(w)
    return `${p.value} ${p.unit}`
  },
  energy(kwh: number) {
    return kwh >= 1000 ? { value: nf2.format(kwh / 1000), unit: "MWh" } : { value: nf2.format(kwh), unit: "kWh" }
  },
  idr(v: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v)
  },
  idrCompact(v: number) {
    if (v >= 1_000_000) return `Rp ${nf1.format(v / 1_000_000)} jt`
    if (v >= 1000) return `Rp ${nf0.format(v / 1000)} rb`
    return `Rp ${nf0.format(v)}`
  },
  pct(v: number, digits = 0) {
    return `${nf(digits).format(v)}%`
  },
}

const pad = (n: number) => String(n).padStart(2, "0")
const wib = (ts: number) => new Date(ts + TZ_OFFSET_MS)

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
const MONTHS_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]
const DAYS_LONG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]

/** Formatting in WIB regardless of the viewer's timezone. */
export const wibFmt = {
  time(ts: number) {
    const d = wib(ts)
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  },
  timeSec(ts: number) {
    const d = wib(ts)
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  },
  dayShort(ts: number) {
    const d = wib(ts)
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
  },
  dayLong(ts: number) {
    const d = wib(ts)
    return `${DAYS_LONG[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  },
  weekday(ts: number) {
    return DAYS[wib(ts).getUTCDay()]
  },
  dateTime(ts: number) {
    return `${wibFmt.dayShort(ts)} ${wibFmt.time(ts)}`
  },
}

export function keyLabel(key: string, long = false) {
  const [y, m, d] = key.split("-").map(Number)
  return long ? `${d} ${MONTHS_LONG[m - 1]} ${y}` : `${d} ${MONTHS[m - 1]}`
}

export function relativeAgo(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s} dtk lalu`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} mnt lalu`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} jam lalu`
  return `${Math.round(h / 24)} hari lalu`
}

export const STAGE_LABEL = {
  night: "Standby (malam)",
  bulk: "Bulk",
  absorption: "Absorption",
  float: "Float",
} as const
