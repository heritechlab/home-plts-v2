"use client"

import { Activity, CheckCircle2, ShieldCheck, Thermometer } from "lucide-react"

import { CellVoltageChart, MetricLineChart, SocChart } from "@/components/charts/telemetry-charts"
import { MiniStat, Readout } from "@/components/dashboard/metric"
import { SocRing } from "@/components/dashboard/soc-ring"
import { DeviceStrip } from "@/components/devices/device-strip"
import { RegisterTable } from "@/components/devices/register-table"
import { useLive } from "@/components/layout/live-provider"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useNow, usePltsQuery } from "@/hooks/use-plts"
import { pltsApi } from "@/lib/plts/api"
import { SITE } from "@/lib/plts/config"
import { fmt } from "@/lib/plts/format"
import { cn } from "@/lib/utils"

const PROTECTIONS = [
  "Tegangan sel lebih (OVP)",
  "Tegangan sel kurang (UVP)",
  "Arus charge lebih",
  "Arus discharge lebih",
  "Hubung singkat",
  "Suhu charge",
  "Suhu discharge",
  "Suhu MOS",
]

export function BatteryView() {
  const { snapshot: s } = useLive()
  const now = useNow(60_000)
  const today = now ? pltsApi.today() : undefined
  const series = usePltsQuery(`bat-${today}`, () => (today ? pltsApi.series(today, today, "5m") : Promise.resolve([])), 60_000)
  const b = s?.bms
  const device = s?.devices.find((d) => d.id === "bms")

  return (
    <>
      <DeviceStrip device={device} now={now} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Kondisi Pack</CardTitle>
            <CardDescription>
              {SITE.battery.chemistry} {SITE.battery.series}S · {SITE.battery.nominalV} V {SITE.battery.capacityAh} Ah
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <SocRing soc={b?.soc} size={200} sub={b ? (b.power > 5 ? "Mengisi" : b.power < -5 ? "Mengosongkan" : "Idle") : undefined} />
            <div className="grid w-full grid-cols-2 gap-3">
              <MiniStat label="Tegangan" value={b && fmt.n2(b.packVoltage)} unit="V" loading={!b} />
              <MiniStat label="Arus" value={b && `${b.current >= 0 ? "+" : ""}${fmt.n1(b.current)}`} unit="A" loading={!b} />
              <MiniStat label="Daya" value={b && fmt.powerText(b.power)} loading={!b} />
              <MiniStat label="Sisa" value={b && fmt.n1(b.remainingAh)} unit="Ah" loading={!b} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tegangan Sel</CardTitle>
            <CardDescription>
              {SITE.battery.series} sel seri · <span className="text-solar">■</span> tertinggi · <span className="text-load">■</span> terendah
            </CardDescription>
            <CardAction>
              {b && (
                <Badge
                  variant="outline"
                  className={cn("font-mono", b.cellDeltaMv > SITE.battery.cellDeltaWarnMv ? "border-warn/40 text-warn" : "border-ok/30 text-ok")}
                >
                  Δ {fmt.n0(b.cellDeltaMv)} mV
                </Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {b ? <CellVoltageChart cells={b.cells} /> : <Skeleton className="h-[220px]" />}
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {(b?.cells ?? Array.from({ length: SITE.battery.series }, () => undefined)).map((v, i) => {
                const isMax = b && v === b.cellMax
                const isMin = b && v === b.cellMin
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-center",
                      isMax ? "border-solar/50 bg-solar/10" : isMin ? "border-load/50 bg-load/10" : "border-border/60 bg-background/40",
                    )}
                  >
                    <p className="hud-label !text-[9px]">C{i + 1}</p>
                    <p className="num text-xs font-medium">{v ? fmt.n3(v) : "–"}</p>
                  </div>
                )
              })}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Sel maks" value={b && fmt.n3(b.cellMax)} unit="V" loading={!b} />
              <MiniStat label="Sel min" value={b && fmt.n3(b.cellMin)} unit="V" loading={!b} />
              <MiniStat label="Rata-rata" value={b && fmt.n3(b.cells.reduce((a, c) => a + c, 0) / b.cells.length)} unit="V" loading={!b} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="size-4 text-muted-foreground" /> Suhu & Kesehatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Readout label="Suhu MOSFET" value={b && fmt.n1(b.tempMos)} unit="°C" loading={!b} />
            <Readout label="Sensor sel 1" value={b && fmt.n1(b.tempCells[0])} unit="°C" loading={!b} />
            <Readout label="Sensor sel 2" value={b && fmt.n1(b.tempCells[1])} unit="°C" loading={!b} />
            <Readout label="State of Health" value={b && fmt.n1(b.soh)} unit="%" loading={!b} />
            <Readout label="Siklus" value={b && fmt.n0(b.cycles)} loading={!b} />
            <Readout label="Kapasitas penuh" value={b && fmt.n0(b.fullCapacityAh)} unit="Ah" loading={!b} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-ok" /> Proteksi BMS
            </CardTitle>
            <CardDescription>Semua proteksi dalam kondisi normal</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: "Charge MOS", on: b?.chargeMos },
                { k: "Discharge MOS", on: b?.dischargeMos },
                { k: "Balancing", on: b?.balancing },
              ].map((x) => (
                <div key={x.k} className="rounded-md border border-border/60 bg-background/40 p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">{x.k}</p>
                  <p className={cn("num text-sm font-semibold", x.on ? "text-ok" : "text-muted-foreground")}>{x.on === undefined ? "–" : x.on ? "ON" : "OFF"}</p>
                </div>
              ))}
            </div>
            <ul className="grid gap-1.5">
              {PROTECTIONS.map((p) => (
                <li key={p} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{p}</span>
                  <span className="flex items-center gap-1 text-xs text-ok">
                    <CheckCircle2 className="size-3.5" /> Normal
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SOC Hari Ini</CardTitle>
            <CardDescription>Ambang peringatan {SITE.battery.socLowAlarm}%</CardDescription>
          </CardHeader>
          <CardContent>{series.data ? <SocChart data={series.data} className="h-[300px]" /> : <Skeleton className="h-[300px]" />}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tegangan Pack Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            {series.data ? (
              <MetricLineChart data={series.data} dataKey="batteryVoltage" label="Tegangan" unit="V" color="var(--battery)" digits={2} className="h-[240px]" />
            ) : (
              <Skeleton className="h-[240px]" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daya Baterai Hari Ini</CardTitle>
            <CardDescription>Positif = mengisi, negatif = mengosongkan</CardDescription>
          </CardHeader>
          <CardContent>
            {series.data ? (
              <MetricLineChart data={series.data} dataKey="batteryPower" label="Daya baterai" unit="W" color="var(--battery)" digits={0} className="h-[240px]" reference={{ y: 0, label: "" }} />
            ) : (
              <Skeleton className="h-[240px]" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4 text-primary" /> Register Modbus BMS (live)
          </CardTitle>
          <CardDescription>Contoh peta register — sesuaikan dengan protokol BMS (JK / Daly / Seplos, dsb.).</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <RegisterTable
            rows={[
              { address: 0x0000, fc: "03", name: "Tegangan pack", scale: "÷100", value: b && fmt.n2(b.packVoltage), unit: "V" },
              { address: 0x0001, fc: "03", name: "Arus (signed)", scale: "÷100", value: b && fmt.n2(b.current), unit: "A" },
              { address: 0x0002, fc: "03", name: "SOC", scale: "×1", value: b && fmt.n0(b.soc), unit: "%" },
              { address: 0x0003, fc: "03", name: "SOH", scale: "×1", value: b && fmt.n0(b.soh), unit: "%" },
              { address: 0x0004, fc: "03", name: "Sisa kapasitas", scale: "÷100", value: b && fmt.n2(b.remainingAh), unit: "Ah" },
              { address: 0x0006, fc: "03", name: "Jumlah siklus", scale: "×1", value: b && fmt.n0(b.cycles) },
              { address: 0x0010, fc: "03", name: "Sel 1 … Sel 16", scale: "÷1000", value: b && `${fmt.n3(b.cellMin)}–${fmt.n3(b.cellMax)}`, unit: "V" },
              { address: 0x0020, fc: "03", name: "Suhu MOS / T1 / T2", scale: "÷10", value: b && `${fmt.n1(b.tempMos)} / ${fmt.n1(b.tempCells[0])} / ${fmt.n1(b.tempCells[1])}`, unit: "°C" },
              { address: 0x0030, fc: "03", name: "Status MOS & alarm", scale: "bitfield", value: b && (b.chargeMos && b.dischargeMos ? "0x0003 · OK" : "0x0000") },
            ]}
          />
        </CardContent>
      </Card>
    </>
  )
}
