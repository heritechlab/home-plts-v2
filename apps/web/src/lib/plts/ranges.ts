import { addDays } from "./time"

export type PresetId = "today" | "yesterday" | "7d" | "30d" | "this-month" | "last-month" | "90d" | "custom"

export interface DayRange {
  from: string // yyyy-MM-dd
  to: string
}

export const PRESETS: { id: Exclude<PresetId, "custom">; label: string; short: string }[] = [
  { id: "today", label: "Hari ini", short: "Hari ini" },
  { id: "yesterday", label: "Kemarin", short: "Kemarin" },
  { id: "7d", label: "7 hari terakhir", short: "7H" },
  { id: "30d", label: "30 hari terakhir", short: "30H" },
  { id: "this-month", label: "Bulan ini", short: "Bulan ini" },
  { id: "last-month", label: "Bulan lalu", short: "Bulan lalu" },
  { id: "90d", label: "90 hari terakhir", short: "90H" },
]

export function presetRange(id: Exclude<PresetId, "custom">, today: string): DayRange {
  const monthStart = `${today.slice(0, 7)}-01`
  switch (id) {
    case "today":
      return { from: today, to: today }
    case "yesterday": {
      const y = addDays(today, -1)
      return { from: y, to: y }
    }
    case "7d":
      return { from: addDays(today, -6), to: today }
    case "30d":
      return { from: addDays(today, -29), to: today }
    case "90d":
      return { from: addDays(today, -89), to: today }
    case "this-month":
      return { from: monthStart, to: today }
    case "last-month": {
      const lastEnd = addDays(monthStart, -1)
      return { from: `${lastEnd.slice(0, 7)}-01`, to: lastEnd }
    }
  }
}

export function rangeDays(r: DayRange) {
  return Math.round((Date.parse(r.to) - Date.parse(r.from)) / 86_400_000) + 1
}
