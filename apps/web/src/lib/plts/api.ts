/**
 * Data access facade. Every page reads through these functions, so swapping
 * the mock simulator for the real backend (FastAPI/WebSocket fed by the
 * Modbus gateway) only touches this file.
 */
import * as mock from "./mock"
import { DAY_MS, addDays, dayKey, dayStart } from "./time"
import type { DailySummary, DeviceStatus, LiveSnapshot, PltsEvent, Resolution, TelemetryPoint } from "./types"

const latency = <T,>(value: T, ms = 120) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))

export const pltsApi = {
  live(): Promise<LiveSnapshot> {
    return latency(mock.liveSnapshot(), 60)
  },

  /** Time series between two WIB day keys (inclusive). */
  series(fromKey: string, toKey: string, resolution?: Resolution): Promise<TelemetryPoint[]> {
    const from = dayStart(fromKey)
    const to = dayStart(addDays(toKey, 1))
    const res = resolution ?? autoResolution(fromKey, toKey)
    return latency(mock.series(from, to, res))
  },

  /** Rolling window ending now, e.g. last 24 hours. */
  recent(hours: number, resolution: Resolution = "5m"): Promise<TelemetryPoint[]> {
    const now = Date.now()
    return latency(mock.series(now - hours * 3_600_000, now, resolution), 80)
  },

  daily(fromKey: string, toKey: string): Promise<DailySummary[]> {
    return latency(mock.dailySummaries(fromKey, toKey))
  },

  events(fromKey: string, toKey: string): Promise<PltsEvent[]> {
    return latency(mock.events(dayStart(fromKey), dayStart(addDays(toKey, 1)) - 1))
  },

  devices(): Promise<DeviceStatus[]> {
    return latency(mock.devices(), 60)
  },

  historyStart(): string {
    return mock.historyStartKey()
  },

  today(): string {
    return dayKey(Date.now())
  },
}

export function autoResolution(fromKey: string, toKey: string): Resolution {
  const days = (dayStart(toKey) - dayStart(fromKey)) / DAY_MS + 1
  if (days <= 2) return "5m"
  if (days <= 14) return "1h"
  return "1d"
}

export { simulatedLoadReading } from "./mock"
