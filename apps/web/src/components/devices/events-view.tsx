"use client"

import { BellOff, Search } from "lucide-react"
import * as React from "react"

import { SEVERITY, SeverityBadge, SeverityIcon } from "@/components/dashboard/status"
import { RangeFilter } from "@/components/history/range-filter"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { usePltsQuery } from "@/hooks/use-plts"
import { pltsApi } from "@/lib/plts/api"
import { keyLabel, wibFmt } from "@/lib/plts/format"
import { type DayRange, type PresetId, presetRange } from "@/lib/plts/ranges"
import { dayKey } from "@/lib/plts/time"
import type { PltsEvent, Severity } from "@/lib/plts/types"
import { cn } from "@/lib/utils"

const SOURCES: PltsEvent["source"][] = ["MPPT", "BMS", "Gateway", "Meter Beban", "Sistem"]
const ORDER: Severity[] = ["critical", "warning", "info", "ok"]

export function EventsView() {
  const [today, setToday] = React.useState<string>()
  const [preset, setPreset] = React.useState<PresetId>("7d")
  const [range, setRange] = React.useState<DayRange>()
  const [severities, setSeverities] = React.useState<Severity[]>(ORDER)
  const [source, setSource] = React.useState<"all" | PltsEvent["source"]>("all")
  const [q, setQ] = React.useState("")

  React.useEffect(() => {
    const t = pltsApi.today()
    const id = setTimeout(() => {
      setToday(t)
      setRange(presetRange("7d", t))
    }, 0)
    return () => clearTimeout(id)
  }, [])

  const key = range ? `${range.from}_${range.to}` : "init"
  const { data } = usePltsQuery(`events-${key}`, () => (range ? pltsApi.events(range.from, range.to) : Promise.resolve([])), 30_000)

  const counts = React.useMemo(() => {
    const c: Record<Severity, number> = { critical: 0, warning: 0, info: 0, ok: 0 }
    for (const e of data ?? []) c[e.severity]++
    return c
  }, [data])

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (data ?? []).filter(
      (e) =>
        severities.includes(e.severity) &&
        (source === "all" || e.source === source) &&
        (!needle || `${e.title} ${e.detail}`.toLowerCase().includes(needle)),
    )
  }, [data, severities, source, q])

  const grouped = React.useMemo(() => {
    const g = new Map<string, PltsEvent[]>()
    for (const e of filtered) {
      const k = dayKey(e.ts)
      g.set(k, [...(g.get(k) ?? []), e])
    }
    return [...g.entries()]
  }, [filtered])

  const toggle = (s: Severity) => setSeverities((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ORDER.map((sev) => {
          const S = SEVERITY[sev]
          const on = severities.includes(sev)
          return (
            <button
              key={sev}
              type="button"
              onClick={() => toggle(sev)}
              aria-pressed={on}
              className={cn(
                "panel flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                on ? cn(S.border, "border-border/60") : "border-border/60 opacity-45 grayscale",
              )}
            >
              <SeverityIcon severity={sev} className="size-10" />
              <div>
                <p className="text-sm text-muted-foreground">{S.label}</p>
                <p className="num text-2xl font-semibold">{data ? counts[sev] : "–"}</p>
              </div>
            </button>
          )
        })}
      </div>

      <Card className="gap-0 py-3">
        <CardContent className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {today && range ? (
            <RangeFilter
              today={today}
              minKey={pltsApi.historyStart()}
              preset={preset}
              range={range}
              presets={["today", "yesterday", "7d", "30d", "this-month"]}
              onChange={(p, r) => {
                setPreset(p)
                setRange(r)
              }}
            />
          ) : (
            <Skeleton className="h-9 w-[420px] max-w-full" />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kejadian…" className="h-8 w-48 pl-8 text-xs" />
            </div>
            <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
              <SelectTrigger size="sm" className="h-8 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua sumber</SelectItem>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linimasa Kejadian</CardTitle>
          <CardDescription>{data ? `${filtered.length} dari ${data.length} kejadian` : "Memuat…"}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {!data && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          {data && filtered.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BellOff />
                </EmptyMedia>
                <EmptyTitle>Tidak ada kejadian</EmptyTitle>
                <EmptyDescription>Ubah filter tingkat, sumber atau rentang tanggal.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {grouped.map(([day, items]) => (
            <section key={day}>
              <div className="mb-3 flex items-center gap-3">
                <p className="hud-label">{keyLabel(day, true)}</p>
                <div className="h-px flex-1 bg-border/60" />
                <Badge variant="outline" className="num text-[10px]">
                  {items.length}
                </Badge>
              </div>
              <ol className="relative ml-4 border-l border-border/60">
                {items.map((e) => (
                  <li key={e.id} className="relative pb-4 pl-7 last:pb-0">
                    <SeverityIcon severity={e.severity} className="absolute top-0 -left-4 size-8 bg-background" />
                    <div className="flex flex-col gap-1 rounded-lg border border-border/50 bg-background/30 px-3 py-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{e.title}</p>
                          <Badge variant="secondary" className="text-[10px]">
                            {e.source}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{e.detail}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                        <span className="num text-xs text-muted-foreground">{wibFmt.timeSec(e.ts)} WIB</span>
                        <SeverityBadge severity={e.severity} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </CardContent>
      </Card>
    </>
  )
}
