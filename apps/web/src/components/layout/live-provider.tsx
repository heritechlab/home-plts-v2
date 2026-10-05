"use client"

import * as React from "react"

import { usePltsQuery } from "@/hooks/use-plts"
import { pltsApi } from "@/lib/plts/api"
import type { LiveSnapshot } from "@/lib/plts/types"

export const LIVE_REFRESH_MS = 2000
const HISTORY_LEN = 90

interface LiveContextValue {
  snapshot: LiveSnapshot | undefined
  /** Rolling buffer of recent snapshots for sparklines (oldest first). */
  trail: LiveSnapshot[]
  updatedAt: number | undefined
}

const LiveContext = React.createContext<LiveContextValue | null>(null)

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const { data, updatedAt } = usePltsQuery("live", pltsApi.live, LIVE_REFRESH_MS)
  const [trail, setTrail] = React.useState<LiveSnapshot[]>([])
  const [lastSeen, setLastSeen] = React.useState<LiveSnapshot>()

  // Append each new snapshot to the trail (derived during render, no effect).
  if (data && data !== lastSeen) {
    setLastSeen(data)
    setTrail((t) => [...t.slice(-(HISTORY_LEN - 1)), data])
  }

  const value = React.useMemo(() => ({ snapshot: data, trail, updatedAt }), [data, trail, updatedAt])
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>
}

export function useLive() {
  const ctx = React.useContext(LiveContext)
  if (!ctx) throw new Error("useLive must be used inside <LiveProvider>")
  return ctx
}
