"use client"

import { BatteryCharging, CloudRain, CloudSun, Cloudy, Coins, Download, Home, Leaf, Sun, SunMedium, TrendingUp } from "lucide-react"
import * as React from "react"

import {
  DailyEnergyChart,
  DailySocRangeChart,
  MetricLineChart,
  PowerChart,
  SocChart,
  type XMode,
} from "@/components/charts/telemetry-charts"
import { StatCard } from "@/components/dashboard/stat-card"
import { RangeFilter, ResolutionSelect, rangeLabel } from "@/components/history/range-filter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePltsQuery } from "@/hooks/use-plts"
import { autoResolution, pltsApi } from "@/lib/plts/api"
import { SITE } from "@/lib/plts/config"
import { downloadCsv } from "@/lib/plts/csv"
import { fmt, keyLabel, wibFmt } from "@/lib/plts/format"
import { type DayRange, type PresetId, presetRange, rangeDays } from "@/lib/plts/ranges"
import type { DailySummary, Resolution, TelemetryPoint } from "@/lib/plts/types"

const WEATHER = {
  cerah: { icon: Sun, label: "Cerah" },
  berawan: { icon: CloudSun, label: "Berawan" },
  mendung: { icon: Cloudy, label: "Mendung" },
  hujan: { icon: CloudRain, label: "Hujan" },
} as const

const RES_LABEL: Record<Resolution, string> = { "5m": "5 menit", "1h": "1 jam", "1d": "harian" }

export function HistoryView() {
  const [today, setToday] = React.useState<string>()
  const [preset, setPreset] = React.useState<PresetId>("7d")
  const [range, setRange] = React.useState<DayRange>()
  const [res, setRes] = React.useState<"auto" | Resolution>("auto")

  React.useEffect(() => {
    const t = pltsApi.today()
    const id = setTimeout(() => {
      setToday(t)
      setRange(presetRange("7d", t))
    }, 0)
    return () => clearTimeout(id)
  }, [])

  const resolution: Resolution = range ? (res === "auto" ? autoResolution(range.from, range.to) : res) : "1h"
  const key = range ? `${range.from}_${range.to}` : "init"

  const seriesQ = usePltsQuery(`s-${key}-${resolution}`, () => (range ? pltsApi.series(range.from, range.to, resolution) : Promise.resolve([])))
  const dailyQ = usePltsQuery(`d-${key}`, () => (range ? pltsApi.daily(range.from, range.to) : Promise.resolve([])))

  const days = range ? rangeDays(range) : 0
  const single = days === 1
  const mode: XMode = resolution === "1d" ? "date" : single ? "time" : "datetime"
  const daily = dailyQ.data
  const totals = React.useMemo(() => summarize(daily ?? []), [daily])
  const pointsReady = seriesQ.data && !seriesQ.loading

  return (
    <>
      <Card className="gap-0 py-3">
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {today && range ? (
            <RangeFilter
              today={today}
              minKey={pltsApi.historyStart()}
              preset={preset}
              range={range}
              onChange={(p, r) => {
                setPreset(p)
                setRange(r)
              }}
            />
          ) : (
            <Skeleton className="h-9 w-[520px] max-w-full" />
          )}
          <div className="flex items-center gap-2">
            <ResolutionSelect value={res} onChange={setRes} />
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-2 text-xs"
              disabled={!daily || !seriesQ.data}
              onClick={() => range && exportCsv(range, single, daily ?? [], seriesQ.data ?? [], resolution)}
            >
              <Download className="size-3.5" />
              Ekspor CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Produksi PV"
          icon={<SunMedium />}
          color="var(--solar)"
          loading={!daily}
          value={fmt.energy(totals.pv).value}
          unit={fmt.energy(totals.pv).unit}
          trend={daily?.map((d) => d.pvEnergyKwh)}
          footer={<span>Rata-rata {fmt.n2(totals.pv / Math.max(1, daily?.length ?? 1))} kWh/hari · puncak {fmt.powerText(totals.peakPv)}</span>}
        />
        <StatCard
          label="Total Konsumsi"
          icon={<Home />}
          color="var(--load)"
          loading={!daily}
          value={fmt.energy(totals.load).value}
          unit={fmt.energy(totals.load).unit}
          trend={daily?.map((d) => d.loadEnergyKwh)}
          badge={!SITE.loadMeter.installed && <Badge variant="outline" className="border-warn/40 text-[10px] text-warn">Estimasi</Badge>}
          footer={<span>Puncak beban {fmt.powerText(totals.peakLoad)}</span>}
        />
        <StatCard
          label="Siklus Baterai"
          icon={<BatteryCharging />}
          color="var(--battery)"
          loading={!daily}
          value={fmt.n2(totals.discharge)}
          unit="kWh keluar"
          trend={daily?.map((d) => d.socMin)}
          footer={
            <span>
              SOC terendah <span className="text-foreground">{fmt.pct(totals.socMin)}</span> · ≈ {fmt.n1(totals.discharge / (SITE.battery.capacityWh / 1000))} siklus penuh
            </span>
          }
        />
        <StatCard
          label="Penghematan"
          icon={<Coins />}
          color="var(--grid)"
          loading={!daily}
          value={fmt.idrCompact(totals.savings)}
          trend={daily?.map((d) => d.savingsIdr)}
          footer={
            <span className="flex items-center gap-1">
              <Leaf className="size-3 text-ok" /> {fmt.n1(totals.co2)} kg CO₂ dihindari · tarif {fmt.idr(SITE.tariffIdrPerKwh)}/kWh
            </span>
          }
        />
      </div>

      <Tabs defaultValue="power" className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="power">Daya & Energi</TabsTrigger>
          <TabsTrigger value="battery">Baterai</TabsTrigger>
          <TabsTrigger value="electrical">Tegangan & Suhu</TabsTrigger>
        </TabsList>

        <TabsContent value="power" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Profil Daya</CardTitle>
              <CardDescription>
                {range ? rangeLabel(range) : "—"} · rata-rata {RES_LABEL[resolution]} · baterai positif = mengisi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pointsReady ? <PowerChart data={seriesQ.data!} mode={mode} className="h-[340px]" /> : <Skeleton className="h-[340px] w-full" />}
            </CardContent>
          </Card>
          {!single && (
            <Card>
              <CardHeader>
                <CardTitle>Energi Harian</CardTitle>
                <CardDescription>Produksi PV vs konsumsi beban per hari (kWh)</CardDescription>
              </CardHeader>
              <CardContent>{daily ? <DailyEnergyChart data={daily} /> : <Skeleton className="h-[280px] w-full" />}</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="battery" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>State of Charge</CardTitle>
                <CardDescription>Persentase kapasitas baterai</CardDescription>
              </CardHeader>
              <CardContent>{pointsReady ? <SocChart data={seriesQ.data!} mode={mode} className="h-[260px]" /> : <Skeleton className="h-[260px] w-full" />}</CardContent>
            </Card>
            {single ? (
              <Card>
                <CardHeader>
                  <CardTitle>Tegangan Pack</CardTitle>
                  <CardDescription>Dibaca dari BMS</CardDescription>
                </CardHeader>
                <CardContent>
                  {pointsReady ? (
                    <MetricLineChart data={seriesQ.data!} dataKey="batteryVoltage" label="Tegangan pack" unit="V" color="var(--battery)" mode={mode} digits={2} className="h-[260px]" />
                  ) : (
                    <Skeleton className="h-[260px] w-full" />
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Rentang SOC Harian</CardTitle>
                  <CardDescription>SOC terendah hingga tertinggi tiap hari</CardDescription>
                </CardHeader>
                <CardContent>{daily ? <DailySocRangeChart data={daily} className="h-[260px]" /> : <Skeleton className="h-[260px] w-full" />}</CardContent>
              </Card>
            )}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Selisih Tegangan Sel</CardTitle>
              <CardDescription>Δ sel maks − min · ambang peringatan {SITE.battery.cellDeltaWarnMv} mV</CardDescription>
            </CardHeader>
            <CardContent>
              {pointsReady ? (
                <MetricLineChart
                  data={seriesQ.data!}
                  dataKey="cellDeltaMv"
                  label="Δ sel"
                  unit="mV"
                  color="var(--load)"
                  mode={mode}
                  digits={0}
                  domain={[0, "auto"]}
                  reference={{ y: SITE.battery.cellDeltaWarnMv, label: `Ambang ${SITE.battery.cellDeltaWarnMv} mV` }}
                />
              ) : (
                <Skeleton className="h-[200px] w-full" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="electrical" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(
            [
              { k: "pvVoltage", title: "Tegangan PV", unit: "V", color: "var(--solar)" },
              { k: "batteryVoltage", title: "Tegangan Baterai", unit: "V", color: "var(--battery)", digits: 2 },
              { k: "controllerTemp", title: "Suhu MPPT", unit: "°C", color: "var(--solar)" },
              { k: "batteryTemp", title: "Suhu Baterai", unit: "°C", color: "var(--battery)" },
            ] as const
          ).map((m) => (
            <Card key={m.k}>
              <CardHeader>
                <CardTitle>{m.title}</CardTitle>
                <CardDescription>Rata-rata {RES_LABEL[resolution]}</CardDescription>
              </CardHeader>
              <CardContent>
                {pointsReady ? (
                  <MetricLineChart data={seriesQ.data!} dataKey={m.k} label={m.title} unit={m.unit} color={m.color} mode={mode} digits={"digits" in m ? m.digits : 1} />
                ) : (
                  <Skeleton className="h-[200px] w-full" />
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {single ? <HourlyTable points={seriesQ.data} day={range?.from} /> : <DailyTable daily={daily} totals={totals} />}
    </>
  )
}

/* ------------------------------------------------------------------ */

function summarize(daily: DailySummary[]) {
  return daily.reduce(
    (a, d) => ({
      pv: a.pv + d.pvEnergyKwh,
      load: a.load + d.loadEnergyKwh,
      charge: a.charge + d.chargeKwh,
      discharge: a.discharge + d.dischargeKwh,
      savings: a.savings + d.savingsIdr,
      co2: a.co2 + d.co2AvoidedKg,
      peakPv: Math.max(a.peakPv, d.peakPvW),
      peakLoad: Math.max(a.peakLoad, d.peakLoadW),
      socMin: Math.min(a.socMin, d.socMin),
    }),
    { pv: 0, load: 0, charge: 0, discharge: 0, savings: 0, co2: 0, peakPv: 0, peakLoad: 0, socMin: 100 },
  )
}

function DailyTable({ daily, totals }: { daily: DailySummary[] | undefined; totals: ReturnType<typeof summarize> }) {
  const rows = daily ? [...daily].reverse() : undefined
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rekap Harian</CardTitle>
        <CardDescription>{rows ? `${rows.length} hari` : "Memuat…"}</CardDescription>
        <CardAction>
          <TrendingUp className="size-4 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <div className="max-h-[520px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card backdrop-blur">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Tanggal</TableHead>
                <TableHead>Cuaca</TableHead>
                <TableHead className="text-right">Produksi</TableHead>
                <TableHead className="text-right">Konsumsi</TableHead>
                <TableHead className="text-right">Isi baterai</TableHead>
                <TableHead className="text-right">Keluar baterai</TableHead>
                <TableHead className="text-right">SOC min–maks</TableHead>
                <TableHead className="text-right">Puncak PV</TableHead>
                <TableHead className="text-right">Jam puncak</TableHead>
                <TableHead className="pr-5 text-right">Hemat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="num">
              {rows?.map((d) => {
                const W = WEATHER[d.weather]
                return (
                  <TableRow key={d.date}>
                    <TableCell className="pl-5 font-sans">
                      <span className="font-medium">{keyLabel(d.date, true)}</span>
                      {!d.complete && <Badge variant="outline" className="ml-2 border-primary/40 text-[10px] text-primary">berjalan</Badge>}
                    </TableCell>
                    <TableCell className="font-sans">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <W.icon className="size-3.5" /> {W.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{fmt.n2(d.pvEnergyKwh)} kWh</TableCell>
                    <TableCell className="text-right">{fmt.n2(d.loadEnergyKwh)} kWh</TableCell>
                    <TableCell className="text-right">{fmt.n2(d.chargeKwh)}</TableCell>
                    <TableCell className="text-right">{fmt.n2(d.dischargeKwh)}</TableCell>
                    <TableCell className={`text-right ${d.socMin < SITE.battery.socLowAlarm ? "text-warn" : ""}`}>
                      {fmt.n0(d.socMin)}–{fmt.n0(d.socMax)}%
                    </TableCell>
                    <TableCell className="text-right">{fmt.powerText(d.peakPvW)}</TableCell>
                    <TableCell className="text-right">{fmt.n1(d.sunHours)} j</TableCell>
                    <TableCell className="pr-5 text-right">{fmt.idr(d.savingsIdr)}</TableCell>
                  </TableRow>
                )
              })}
              {!rows &&
                Array.from({ length: 6 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={10} className="px-5">
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
            {rows && rows.length > 1 && (
              <TableFooter className="num bg-muted/30">
                <TableRow>
                  <TableCell className="pl-5 font-sans font-medium" colSpan={2}>
                    Total
                  </TableCell>
                  <TableCell className="text-right">{fmt.n2(totals.pv)} kWh</TableCell>
                  <TableCell className="text-right">{fmt.n2(totals.load)} kWh</TableCell>
                  <TableCell className="text-right">{fmt.n2(totals.charge)}</TableCell>
                  <TableCell className="text-right">{fmt.n2(totals.discharge)}</TableCell>
                  <TableCell className="text-right">min {fmt.n0(totals.socMin)}%</TableCell>
                  <TableCell className="text-right">{fmt.powerText(totals.peakPv)}</TableCell>
                  <TableCell />
                  <TableCell className="pr-5 text-right">{fmt.idr(totals.savings)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function hourly(points: TelemetryPoint[]) {
  const groups = new Map<string, TelemetryPoint[]>()
  for (const p of points) {
    const h = wibFmt.time(p.ts).slice(0, 2)
    groups.set(h, [...(groups.get(h) ?? []), p])
  }
  return [...groups.entries()].map(([h, pts]) => {
    const avg = (k: keyof TelemetryPoint) => pts.reduce((a, p) => a + p[k], 0) / pts.length
    return {
      hour: `${h}:00`,
      pv: avg("pvPower"),
      load: avg("loadPower"),
      batt: avg("batteryPower"),
      soc: pts[pts.length - 1].soc,
      vbat: avg("batteryVoltage"),
      vpv: avg("pvVoltage"),
      temp: avg("controllerTemp"),
      kwh: (avg("pvPower") * pts.length * 5) / 60 / 1000,
    }
  })
}

function HourlyTable({ points, day }: { points: TelemetryPoint[] | undefined; day: string | undefined }) {
  const rows = points ? hourly(points) : undefined
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Per Jam</CardTitle>
        <CardDescription>{day ? keyLabel(day, true) : "—"} · rata-rata per jam</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="max-h-[520px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card backdrop-blur">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Jam</TableHead>
                <TableHead className="text-right">Daya PV</TableHead>
                <TableHead className="text-right">Energi PV</TableHead>
                <TableHead className="text-right">Beban</TableHead>
                <TableHead className="text-right">Baterai</TableHead>
                <TableHead className="text-right">SOC</TableHead>
                <TableHead className="text-right">V baterai</TableHead>
                <TableHead className="text-right">V PV</TableHead>
                <TableHead className="pr-5 text-right">Suhu MPPT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="num">
              {rows?.map((r) => (
                <TableRow key={r.hour}>
                  <TableCell className="pl-5 font-medium">{r.hour}</TableCell>
                  <TableCell className="text-right">{fmt.powerText(r.pv)}</TableCell>
                  <TableCell className="text-right">{fmt.n2(r.kwh)} kWh</TableCell>
                  <TableCell className="text-right">{fmt.powerText(r.load)}</TableCell>
                  <TableCell className={`text-right ${r.batt >= 0 ? "text-ok" : "text-muted-foreground"}`}>
                    {r.batt >= 0 ? "+" : "−"}
                    {fmt.powerText(Math.abs(r.batt))}
                  </TableCell>
                  <TableCell className="text-right">{fmt.n0(r.soc)}%</TableCell>
                  <TableCell className="text-right">{fmt.n2(r.vbat)} V</TableCell>
                  <TableCell className="text-right">{fmt.n1(r.vpv)} V</TableCell>
                  <TableCell className="pr-5 text-right">{fmt.n1(r.temp)} °C</TableCell>
                </TableRow>
              ))}
              {!rows &&
                Array.from({ length: 6 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9} className="px-5">
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function exportCsv(range: DayRange, single: boolean, daily: DailySummary[], points: TelemetryPoint[], resolution: Resolution) {
  const name = `plts_${range.from}_${range.to}`
  if (single || resolution !== "1d") {
    downloadCsv(
      `${name}_${resolution}.csv`,
      ["waktu_wib", "pv_w", "charge_w", "baterai_w", "beban_w", "soc_pct", "v_baterai", "v_pv", "suhu_mppt_c", "suhu_baterai_c", "delta_sel_mv"],
      points.map((p) => [
        `${new Date(p.ts + 7 * 3_600_000).toISOString().slice(0, 16).replace("T", " ")}`,
        +p.pvPower.toFixed(1),
        +p.chargePower.toFixed(1),
        +p.batteryPower.toFixed(1),
        +p.loadPower.toFixed(1),
        +p.soc.toFixed(2),
        +p.batteryVoltage.toFixed(2),
        +p.pvVoltage.toFixed(2),
        +p.controllerTemp.toFixed(1),
        +p.batteryTemp.toFixed(1),
        +p.cellDeltaMv.toFixed(0),
      ]),
    )
    return
  }
  downloadCsv(
    `${name}_harian.csv`,
    ["tanggal", "cuaca", "produksi_kwh", "konsumsi_kwh", "isi_baterai_kwh", "keluar_baterai_kwh", "soc_min", "soc_maks", "puncak_pv_w", "puncak_beban_w", "hemat_idr"],
    daily.map((d) => [
      d.date,
      d.weather,
      +d.pvEnergyKwh.toFixed(3),
      +d.loadEnergyKwh.toFixed(3),
      +d.chargeKwh.toFixed(3),
      +d.dischargeKwh.toFixed(3),
      +d.socMin.toFixed(1),
      +d.socMax.toFixed(1),
      Math.round(d.peakPvW),
      Math.round(d.peakLoadW),
      Math.round(d.savingsIdr),
    ]),
  )
}
