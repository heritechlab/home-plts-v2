"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { SITE } from "@/lib/plts/config"
import { fmt, keyLabel, wibFmt } from "@/lib/plts/format"
import { TZ_OFFSET_MS } from "@/lib/plts/time"
import type { DailySummary, TelemetryPoint } from "@/lib/plts/types"
import { cn } from "@/lib/utils"

export type XMode = "time" | "datetime" | "date"

function xTick(mode: XMode) {
  return (ts: number) => {
    if (mode === "date") return wibFmt.dayShort(ts)
    if (mode === "datetime" && wibFmt.time(ts) === "00:00") return wibFmt.dayShort(ts)
    return wibFmt.time(ts)
  }
}

function xLabel(mode: XMode) {
  return (_: unknown, payload: readonly { payload?: { ts?: number } }[]) => {
    const ts = payload?.[0]?.payload?.ts
    if (ts === undefined) return ""
    return mode === "date" ? wibFmt.dayLong(ts) : `${wibFmt.dayLong(ts)} · ${wibFmt.time(ts)} WIB`
  }
}

const HOUR = 3_600_000
const STEPS = [HOUR, 2 * HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, 24 * HOUR, 48 * HOUR, 7 * 24 * HOUR]

/** Evenly spaced ticks aligned to WIB clock hours/days. */
function timeTicks(data: TelemetryPoint[], max = 8): number[] | undefined {
  if (data.length < 2) return undefined
  const lo = data[0].ts
  const hi = data[data.length - 1].ts
  const step = STEPS.find((s) => (hi - lo) / s <= max) ?? STEPS[STEPS.length - 1]
  const offset = TZ_OFFSET_MS
  const out: number[] = []
  for (let t = Math.ceil((lo + offset) / step) * step - offset; t <= hi; t += step) out.push(t)
  return out
}

/** "Nice" round ticks (1/2/2.5/5 × 10ⁿ) covering the data range, including 0. */
function niceTicks(values: number[], count = 5): number[] | undefined {
  if (!values.length) return undefined
  const lo = Math.min(0, ...values)
  const hi = Math.max(0, ...values)
  const raw = (hi - lo || 1) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
  const out: number[] = []
  for (let t = Math.floor(lo / step) * step; t <= Math.ceil(hi / step) * step + 1e-9; t += step) out.push(+t.toFixed(6))
  return out
}

const axisProps = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  fontSize: 11,
} as const

const powerTick = (v: number) => (Math.abs(v) >= 1000 ? `${fmt.n1(v / 1000)}k` : fmt.n0(v))

/* ------------------------------------------------------------------ */
/*  Power: PV production, load and battery flow (one W axis)           */
/* ------------------------------------------------------------------ */

const powerConfig = {
  pvPower: { label: "Produksi PV", color: "var(--solar)" },
  loadPower: { label: "Beban", color: "var(--load)" },
  batteryPower: { label: "Baterai (±)", color: "var(--battery)" },
} satisfies ChartConfig

export function PowerChart({
  data,
  mode = "time",
  className,
  showBattery = true,
}: {
  data: TelemetryPoint[]
  mode?: XMode
  className?: string
  showBattery?: boolean
}) {
  const id = React.useId().replace(/:/g, "")
  const powerTicks = React.useMemo(
    () => niceTicks(data.flatMap((d) => (showBattery ? [d.pvPower, d.loadPower, d.batteryPower] : [d.pvPower, d.loadPower]))),
    [data, showBattery],
  )
  return (
    <ChartContainer config={powerConfig} className={cn("aspect-auto h-[300px] w-full", className)}>
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id={`pv-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-pvPower)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--color-pvPower)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id={`ld-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-loadPower)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-loadPower)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 6" />
        <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} ticks={timeTicks(data)} tickFormatter={xTick(mode)} minTickGap={24} {...axisProps} />
        <YAxis
          width={44}
          tickFormatter={powerTick}
          ticks={powerTicks}
          domain={powerTicks ? [powerTicks[0], powerTicks[powerTicks.length - 1]] : undefined}
          {...axisProps}
        />
        <ReferenceLine y={0} stroke="var(--border)" />
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={xLabel(mode)}
              valueFormatter={(v) => fmt.powerText(v)}
            />
          }
        />
        <Area dataKey="pvPower" type="monotone" stroke="var(--color-pvPower)" strokeWidth={2} fill={`url(#pv-${id})`} isAnimationActive={false} />
        <Area dataKey="loadPower" type="monotone" stroke="var(--color-loadPower)" strokeWidth={2} fill={`url(#ld-${id})`} isAnimationActive={false} />
        {showBattery && (
          <Line dataKey="batteryPower" type="monotone" stroke="var(--color-batteryPower)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
        )}
        <ChartLegend itemSorter={null} content={<ChartLegendContent />} />
      </ComposedChart>
    </ChartContainer>
  )
}

/* ------------------------------------------------------------------ */
/*  Battery state of charge                                            */
/* ------------------------------------------------------------------ */

const socConfig = { soc: { label: "SOC", color: "var(--battery)" } } satisfies ChartConfig

export function SocChart({ data, mode = "time", className }: { data: TelemetryPoint[]; mode?: XMode; className?: string }) {
  const id = React.useId().replace(/:/g, "")
  return (
    <ChartContainer config={socConfig} className={cn("aspect-auto h-[220px] w-full", className)}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id={`soc-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-soc)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--color-soc)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 6" />
        <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} ticks={timeTicks(data)} tickFormatter={xTick(mode)} minTickGap={24} {...axisProps} />
        <YAxis width={44} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} {...axisProps} />
        <ReferenceLine
          y={SITE.battery.socLowAlarm}
          stroke="var(--warn)"
          strokeDasharray="4 4"
          label={{ value: `Ambang ${SITE.battery.socLowAlarm}%`, position: "insideTopRight", fill: "var(--muted-foreground)", fontSize: 10 }}
        />
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={<ChartTooltipContent indicator="line" labelFormatter={xLabel(mode)} valueFormatter={(v) => fmt.pct(v, 1)} />}
        />
        <Area dataKey="soc" type="monotone" stroke="var(--color-soc)" strokeWidth={2} fill={`url(#soc-${id})`} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  )
}

/* ------------------------------------------------------------------ */
/*  Single metric line (voltage, temperature, …)                       */
/* ------------------------------------------------------------------ */

export function MetricLineChart({
  data,
  dataKey,
  label,
  unit,
  color,
  mode = "time",
  digits = 1,
  domain,
  className,
  reference,
}: {
  data: TelemetryPoint[]
  dataKey: keyof TelemetryPoint
  label: string
  unit: string
  color: string
  mode?: XMode
  digits?: number
  domain?: [number | "auto" | "dataMin" | "dataMax", number | "auto" | "dataMin" | "dataMax"]
  className?: string
  reference?: { y: number; label: string }
}) {
  const config = { [dataKey]: { label, color } } satisfies ChartConfig
  return (
    <ChartContainer config={config} className={cn("aspect-auto h-[200px] w-full", className)}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 6" />
        <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} ticks={timeTicks(data)} tickFormatter={xTick(mode)} minTickGap={24} {...axisProps} />
        <YAxis
          width={48}
          domain={domain ?? ["auto", "auto"]}
          tickFormatter={(v: number) => (digits === 0 || Math.abs(v) >= 100 ? fmt.n0(v) : fmt.n1(v))}
          {...axisProps}
        />
        {reference && (
          <ReferenceLine
            y={reference.y}
            stroke="var(--warn)"
            strokeDasharray="4 4"
            label={{ value: reference.label, position: "insideTopRight", fill: "var(--muted-foreground)", fontSize: 10 }}
          />
        )}
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={xLabel(mode)}
              valueFormatter={(v) => `${v.toLocaleString("id-ID", { maximumFractionDigits: digits })} ${unit}`}
            />
          }
        />
        <Line dataKey={dataKey} type="monotone" stroke={`var(--color-${dataKey})`} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  )
}

/* ------------------------------------------------------------------ */
/*  Daily energy: production vs consumption                            */
/* ------------------------------------------------------------------ */

const energyConfig = {
  pvEnergyKwh: { label: "Produksi PV", color: "var(--solar)" },
  loadEnergyKwh: { label: "Konsumsi beban", color: "var(--load)" },
} satisfies ChartConfig

export function DailyEnergyChart({ data, className }: { data: DailySummary[]; className?: string }) {
  const rows = data.map((d) => ({ ...d, label: keyLabel(d.date) }))
  const dense = rows.length > 20
  return (
    <ChartContainer config={energyConfig} className={cn("aspect-auto h-[280px] w-full", className)}>
      <BarChart data={rows} margin={{ left: 0, right: 8, top: 8 }} barGap={2} barCategoryGap={dense ? "18%" : "28%"}>
        <CartesianGrid vertical={false} strokeDasharray="3 6" />
        <XAxis dataKey="label" minTickGap={12} {...axisProps} />
        <YAxis width={40} tickFormatter={(v: number) => fmt.n0(v)} {...axisProps} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, p) => {
                const d = p?.[0]?.payload as DailySummary | undefined
                return d ? keyLabel(d.date, true) + (d.complete ? "" : " (berjalan)") : ""
              }}
              valueFormatter={(v) => `${fmt.n2(v)} kWh`}
            />
          }
        />
        <Bar dataKey="pvEnergyKwh" fill="var(--color-pvEnergyKwh)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="loadEnergyKwh" fill="var(--color-loadEnergyKwh)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <ChartLegend itemSorter={null} content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  )
}

/* ------------------------------------------------------------------ */
/*  SOC range per day (min → max as a floating bar)                    */
/* ------------------------------------------------------------------ */

const socRangeConfig = { range: { label: "Rentang SOC", color: "var(--battery)" } } satisfies ChartConfig

export function DailySocRangeChart({ data, className }: { data: DailySummary[]; className?: string }) {
  const rows = data.map((d) => ({ label: keyLabel(d.date), date: d.date, range: [d.socMin, d.socMax] as [number, number] }))
  return (
    <ChartContainer config={socRangeConfig} className={cn("aspect-auto h-[220px] w-full", className)}>
      <BarChart data={rows} margin={{ left: 0, right: 8, top: 8 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} strokeDasharray="3 6" />
        <XAxis dataKey="label" minTickGap={12} {...axisProps} />
        <YAxis width={44} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} {...axisProps} />
        <ReferenceLine y={SITE.battery.socLowAlarm} stroke="var(--warn)" strokeDasharray="4 4" />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(_, p) => {
                const d = p?.[0]?.payload as { date: string } | undefined
                return d ? keyLabel(d.date, true) : ""
              }}
              formatter={(value) => {
                const [lo, hi] = value as unknown as [number, number]
                return (
                  <div className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">SOC min – maks</span>
                    <span className="num font-medium">
                      {fmt.n0(lo)}% – {fmt.n0(hi)}%
                    </span>
                  </div>
                )
              }}
            />
          }
        />
        <Bar dataKey="range" fill="var(--color-range)" radius={4} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  )
}

/* ------------------------------------------------------------------ */
/*  Cell voltages                                                      */
/* ------------------------------------------------------------------ */

const cellConfig = { mv: { label: "Tegangan sel", color: "var(--battery)" } } satisfies ChartConfig

export function CellVoltageChart({ cells, className }: { cells: number[]; className?: string }) {
  const max = Math.max(...cells)
  const min = Math.min(...cells)
  const rows = cells.map((v, i) => ({ cell: `C${i + 1}`, v, mv: v * 1000, isMax: v === max, isMin: v === min }))
  const lo = Math.floor(min * 1000 - 15)
  const hi = Math.ceil(max * 1000 + 10)
  return (
    <ChartContainer config={cellConfig} className={cn("aspect-auto h-[220px] w-full", className)}>
      <BarChart data={rows} margin={{ left: 0, right: 8, top: 8 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} strokeDasharray="3 6" />
        <XAxis dataKey="cell" interval={0} {...axisProps} fontSize={10} />
        <YAxis width={44} domain={[lo, hi]} tickFormatter={(v: number) => fmt.n3(v / 1000)} {...axisProps} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={<ChartTooltipContent hideIndicator valueFormatter={(v) => `${fmt.n3(v / 1000)} V`} />}
        />
        <Bar
          dataKey="mv"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
          shape={(props: unknown) => {
            const p = props as { x: number; y: number; width: number; height: number; payload: { isMax: boolean; isMin: boolean } }
            const fill = p.payload.isMax ? "var(--solar)" : p.payload.isMin ? "var(--load)" : "var(--battery)"
            return <rect x={p.x} y={p.y} width={p.width} height={Math.max(0, p.height)} rx={3} fill={fill} />
          }}
        />
      </BarChart>
    </ChartContainer>
  )
}
