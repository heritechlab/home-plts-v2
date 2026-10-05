"use client"

import { ArrowDownRight, ArrowUpRight, BatteryCharging, Coins, Gauge, Home, Leaf, SunMedium, Thermometer, Zap } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { DailyEnergyChart, PowerChart, SocChart } from "@/components/charts/telemetry-charts"
import { EnergyFlow } from "@/components/dashboard/energy-flow"
import { MiniStat, Readout } from "@/components/dashboard/metric"
import { SocRing } from "@/components/dashboard/soc-ring"
import { StatCard } from "@/components/dashboard/stat-card"
import { LinkBadge, SeverityIcon } from "@/components/dashboard/status"
import { useLive } from "@/components/layout/live-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useNow, usePltsQuery } from "@/hooks/use-plts"
import { pltsApi } from "@/lib/plts/api"
import { SITE } from "@/lib/plts/config"
import { STAGE_LABEL, fmt, relativeAgo, wibFmt } from "@/lib/plts/format"
import { addDays } from "@/lib/plts/time"
import type { LiveSnapshot } from "@/lib/plts/types"

function hoursText(h: number) {
  if (!Number.isFinite(h) || h > 99) return "> 99 jam"
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${hh} j ${String(mm).padStart(2, "0")} m`
}

function batteryEta(s: LiveSnapshot) {
  const { soc, power } = s.bms
  const cap = SITE.battery.capacityWh
  if (power > 15) return { label: "Estimasi penuh", value: hoursText((((100 - soc) / 100) * cap) / power) }
  if (power < -15) return { label: "Estimasi cadangan", value: hoursText((((soc - 10) / 100) * cap) / -power) }
  return { label: "Status", value: "Idle" }
}

export function Overview() {
  const { snapshot: s, trail } = useLive()
  const now = useNow(30_000)
  const today = now ? pltsApi.today() : undefined

  const todaySeries = usePltsQuery(`today-${today}`, () => (today ? pltsApi.series(today, today, "5m") : Promise.resolve([])), 60_000)
  const week = usePltsQuery(`week-${today}`, () => (today ? pltsApi.daily(addDays(today, -6), today) : Promise.resolve([])), 60_000)
  const events = usePltsQuery(`ev-${today}`, () => (today ? pltsApi.events(addDays(today, -1), today) : Promise.resolve([])), 30_000)

  const [chartMode, setChartMode] = React.useState<"power" | "soc">("power")
  const loading = !s
  const todaySummary = week.data?.at(-1)
  const loadW = s?.load?.power ?? s?.loadEstimatedW ?? 0
  const eta = s ? batteryEta(s) : undefined

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Daya PV"
          icon={<SunMedium />}
          color="var(--solar)"
          loading={loading}
          value={s ? fmt.power(s.mppt.pvPower).value : "–"}
          unit={s ? fmt.power(s.mppt.pvPower).unit : undefined}
          trend={trail.map((t) => t.mppt.pvPower)}
          footer={
            s && (
              <span>
                {fmt.n1(s.mppt.pvVoltage)} V · {fmt.n1(s.mppt.pvCurrent)} A ·{" "}
                <span className="text-foreground">{fmt.n0((s.mppt.pvPower / SITE.pv.arrayWp) * 100)}%</span> dari {fmt.n1(SITE.pv.arrayWp / 1000)} kWp
              </span>
            )
          }
          badge={s && <Badge variant="outline" className="text-[10px]">{STAGE_LABEL[s.mppt.stage]}</Badge>}
        />
        <StatCard
          label="Baterai"
          icon={<BatteryCharging />}
          color="var(--battery)"
          loading={loading}
          value={s ? fmt.n0(s.bms.soc) : "–"}
          unit="%"
          trend={trail.map((t) => t.bms.soc)}
          footer={
            s && (
              <span className="flex items-center gap-1">
                {s.bms.power >= 0 ? <ArrowUpRight className="size-3.5 text-ok" /> : <ArrowDownRight className="size-3.5 text-warn" />}
                {s.bms.power >= 0 ? "Mengisi" : "Mengosongkan"} {fmt.powerText(Math.abs(s.bms.power))} · {fmt.n2(s.bms.packVoltage)} V
              </span>
            )
          }
        />
        <StatCard
          label="Beban Saat Ini"
          icon={<Home />}
          color="var(--load)"
          loading={loading}
          value={fmt.power(loadW).value}
          unit={fmt.power(loadW).unit}
          trend={trail.map((t) => t.load?.power ?? t.loadEstimatedW)}
          badge={
            !s?.load && (
              <Badge variant="outline" className="border-warn/40 text-[10px] text-warn">
                Estimasi
              </Badge>
            )
          }
          footer={
            <span>
              {fmt.n0((loadW / SITE.inverter.ratedW) * 100)}% kapasitas inverter {SITE.inverter.ratedW / 1000} kW
            </span>
          }
        />
        <StatCard
          label="Produksi Hari Ini"
          icon={<Zap />}
          color="var(--grid)"
          loading={loading}
          value={s ? fmt.n2(s.mppt.energyTodayKwh) : "–"}
          unit="kWh"
          trend={week.data?.map((d) => d.pvEnergyKwh)}
          footer={
            todaySummary && (
              <span>
                Hemat <span className="text-foreground">{fmt.idrCompact(todaySummary.savingsIdr)}</span> · konsumsi {fmt.n2(todaySummary.loadEnergyKwh)} kWh
              </span>
            )
          }
        />
      </div>

      {/* Flow + battery */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Aliran Energi</CardTitle>
            <CardDescription>PV → MPPT → DC bus 48 V → inverter → beban rumah</CardDescription>
            <CardAction>
              <Badge variant="outline" className="gap-1.5 font-mono text-[10px] tracking-wider">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                MODBUS RTU
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-2 pb-1">
            <EnergyFlow snapshot={s} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Baterai {SITE.battery.nominalV} V</CardTitle>
            <CardDescription>
              {SITE.battery.chemistry} {SITE.battery.series}S · {SITE.battery.capacityAh} Ah · {fmt.n2(SITE.battery.capacityWh / 1000)} kWh
            </CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href="/baterai">Detail</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <SocRing soc={s?.bms.soc} sub={s ? `${fmt.n1(s.bms.remainingAh)} / ${s.bms.fullCapacityAh} Ah` : undefined} />
            <div className="w-full">
              <Readout label="Tegangan pack" value={s && fmt.n2(s.bms.packVoltage)} unit="V" loading={loading} />
              <Readout label="Arus" value={s && `${s.bms.current >= 0 ? "+" : ""}${fmt.n1(s.bms.current)}`} unit="A" loading={loading} />
              <Readout label="Δ tegangan sel" value={s && fmt.n0(s.bms.cellDeltaMv)} unit="mV" loading={loading} />
              <Readout label="Suhu sel" value={s && fmt.n1(Math.max(...s.bms.tempCells))} unit="°C" loading={loading} />
              <Readout label={eta?.label ?? "Estimasi"} value={eta?.value} loading={loading} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today chart + balance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Hari Ini</CardTitle>
            <CardDescription>
              {now ? wibFmt.dayLong(now) : "—"} · interval 5 menit
            </CardDescription>
            <CardAction>
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                value={chartMode}
                onValueChange={(v) => v && setChartMode(v as "power" | "soc")}
              >
                <ToggleGroupItem value="power" className="px-3 text-xs">
                  Daya
                </ToggleGroupItem>
                <ToggleGroupItem value="soc" className="px-3 text-xs">
                  SOC
                </ToggleGroupItem>
              </ToggleGroup>
            </CardAction>
          </CardHeader>
          <CardContent>
            {!todaySeries.data ? (
              <Skeleton className="h-[300px] w-full" />
            ) : chartMode === "power" ? (
              <PowerChart data={todaySeries.data} />
            ) : (
              <SocChart data={todaySeries.data} className="h-[300px]" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Neraca Energi Hari Ini</CardTitle>
            <CardDescription>Akumulasi sejak 00:00 WIB</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Produksi PV" icon={<SunMedium />} tone="text-solar" value={todaySummary && fmt.n2(todaySummary.pvEnergyKwh)} unit="kWh" loading={!todaySummary} />
              <MiniStat label="Konsumsi" icon={<Home />} tone="text-load" value={todaySummary && fmt.n2(todaySummary.loadEnergyKwh)} unit="kWh" loading={!todaySummary} />
              <MiniStat label="Masuk baterai" icon={<ArrowUpRight />} tone="text-battery" value={todaySummary && fmt.n2(todaySummary.chargeKwh)} unit="kWh" loading={!todaySummary} />
              <MiniStat label="Keluar baterai" icon={<ArrowDownRight />} tone="text-battery" value={todaySummary && fmt.n2(todaySummary.dischargeKwh)} unit="kWh" loading={!todaySummary} />
            </div>
            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Beban dipasok langsung oleh PV</span>
                <span className="num font-medium">{todaySummary ? fmt.pct(todaySummary.solarFraction * 100) : "–"}</span>
              </div>
              <Progress value={(todaySummary?.solarFraction ?? 0) * 100} className="mt-2 h-1.5 [&>div]:bg-solar" />
              <p className="mt-2 text-[11px] text-muted-foreground">Sisanya disuplai baterai yang diisi PV — sistem off-grid, 100% energi surya.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Penghematan" icon={<Coins />} tone="text-ok" value={todaySummary && fmt.idrCompact(todaySummary.savingsIdr)} loading={!todaySummary} />
              <MiniStat label="CO₂ dihindari" icon={<Leaf />} tone="text-ok" value={todaySummary && fmt.n2(todaySummary.co2AvoidedKg)} unit="kg" loading={!todaySummary} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Devices, events, week */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Perangkat Modbus</CardTitle>
            <CardDescription>Status komunikasi RS-485</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href="/perangkat">Kelola</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(s?.devices ?? []).map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.port}
                    {d.latencyMs !== null && <span className="num"> · {d.latencyMs} ms</span>}
                  </p>
                </div>
                <LinkBadge state={d.state} />
              </div>
            ))}
            {!s && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kejadian Terbaru</CardTitle>
            <CardDescription>24 jam terakhir</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href="/peringatan">Semua</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {events.data?.slice(0, 5).map((e) => (
              <div key={e.id} className="flex gap-3">
                <SeverityIcon severity={e.severity} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <span className="num shrink-0 text-[11px] text-muted-foreground">{wibFmt.time(e.ts)}</span>
                  </div>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {e.source} · {now ? relativeAgo(now - e.ts) : ""}
                  </p>
                </div>
              </div>
            ))}
            {!events.data && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7 Hari Terakhir</CardTitle>
            <CardDescription>
              Total produksi{" "}
              <span className="num text-foreground">{week.data ? fmt.n1(week.data.reduce((a, d) => a + d.pvEnergyKwh, 0)) : "–"} kWh</span>
            </CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href="/riwayat">Riwayat</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {week.data ? <DailyEnergyChart data={week.data} className="h-[250px]" /> : <Skeleton className="h-[250px] w-full" />}
          </CardContent>
        </Card>
      </div>

      {/* Quick telemetry strip */}
      <Card className="py-4">
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Tegangan PV", value: s && fmt.n1(s.mppt.pvVoltage), unit: "V", icon: <Gauge /> },
            { label: "Arus charge", value: s && fmt.n1(s.mppt.chargeCurrent), unit: "A", icon: <Zap /> },
            { label: "Suhu MPPT", value: s && fmt.n1(s.mppt.controllerTemp), unit: "°C", icon: <Thermometer /> },
            { label: "Suhu MOS BMS", value: s && fmt.n1(s.bms.tempMos), unit: "°C", icon: <Thermometer /> },
            { label: "Siklus baterai", value: s && fmt.n0(s.bms.cycles), unit: "x", icon: <BatteryCharging /> },
            { label: "Total produksi", value: s && fmt.n0(s.mppt.energyTotalKwh), unit: "kWh", icon: <SunMedium /> },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-md border border-border/60 text-muted-foreground [&_svg]:size-4">{m.icon}</span>
              <div>
                <p className="text-[11px] text-muted-foreground">{m.label}</p>
                {m.value ? (
                  <p className="num text-sm font-medium">
                    {m.value} <span className="text-xs text-muted-foreground">{m.unit}</span>
                  </p>
                ) : (
                  <Skeleton className="mt-1 h-4 w-14" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}
