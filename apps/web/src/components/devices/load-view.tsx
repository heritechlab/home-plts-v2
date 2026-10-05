"use client"

import { Activity, Cable, CheckCircle2, Circle, Eye, Gauge, PlugZap, Waves, Zap } from "lucide-react"
import * as React from "react"

import { MetricLineChart } from "@/components/charts/telemetry-charts"
import { MiniStat } from "@/components/dashboard/metric"
import { StatCard } from "@/components/dashboard/stat-card"
import { LinkBadge } from "@/components/dashboard/status"
import { RegisterTable } from "@/components/devices/register-table"
import { LIVE_REFRESH_MS, useLive } from "@/components/layout/live-provider"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useNow, usePltsQuery } from "@/hooks/use-plts"
import { pltsApi, simulatedLoadReading } from "@/lib/plts/api"
import { SITE } from "@/lib/plts/config"
import { fmt } from "@/lib/plts/format"
import type { LoadReading } from "@/lib/plts/types"

const STEPS = [
  { done: true, title: "Tentukan meter AC Modbus", desc: `${SITE.loadMeter.model} — 80 A dengan CT split-core, RS-485 Modbus RTU.` },
  { done: true, title: "Siapkan slot di dashboard & gateway", desc: "Halaman ini, kontrak data LoadReading, dan slave ID 2 sudah dialokasikan." },
  { done: false, title: "Pasang CT di kabel fasa output inverter", desc: "Tegangan diambil dari terminal L–N output inverter (220 V AC)." },
  { done: false, title: "Hubungkan A/B ke bus RS-485", desc: "Paralel dengan BMS di COM4, set alamat slave 2 dan baud 9600 8N1." },
  { done: false, title: "Aktifkan di konfigurasi", desc: "Set loadMeter.installed = true — badge 'Estimasi' otomatis hilang." },
]

export function LoadView() {
  const { snapshot: s, trail } = useLive()
  const [preview, setPreview] = React.useState(false)
  const [reading, setReading] = React.useState<LoadReading>()
  const now = useNow(60_000)
  const today = now ? pltsApi.today() : undefined
  const series = usePltsQuery(`load-${today}`, () => (today ? pltsApi.series(today, today, "5m") : Promise.resolve([])), 60_000)
  const meter = s?.devices.find((d) => d.id === "load-meter")

  React.useEffect(() => {
    if (!preview) return
    const tick = () => setReading(simulatedLoadReading())
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, LIVE_REFRESH_MS)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [preview])

  const r = s?.load ?? (preview ? reading : undefined)

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden lg:col-span-2">
          <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-load/20 blur-3xl" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlugZap className="size-4 text-load" /> Meter Beban di Output Inverter
            </CardTitle>
            <CardDescription>Mengukur daya aktual yang dipakai rumah, langsung di sisi AC.</CardDescription>
            <CardAction>{meter && <LinkBadge state={meter.state} />}</CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <ol className="relative grid gap-4">
              {STEPS.map((st, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5">
                    {st.done ? <CheckCircle2 className="size-5 text-ok" /> : <Circle className="size-5 text-muted-foreground/60" />}
                  </span>
                  <div>
                    <p className={st.done ? "font-medium" : "font-medium text-muted-foreground"}>{st.title}</p>
                    <p className="text-sm text-muted-foreground">{st.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-load/40 bg-load/5 p-3">
              <div className="flex items-center gap-3">
                <Eye className="size-4 text-load" />
                <div>
                  <Label htmlFor="preview" className="font-medium">
                    Pratinjau dengan data simulasi
                  </Label>
                  <p className="text-xs text-muted-foreground">Lihat tampilan halaman ini setelah meter terpasang.</p>
                </div>
              </div>
              <Switch id="preview" checked={preview || Boolean(s?.load)} disabled={Boolean(s?.load)} onCheckedChange={setPreview} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
        <StatCard
          label="Beban Saat Ini (estimasi)"
          icon={<Activity />}
          color="var(--load)"
          loading={!s}
          value={s && fmt.power(s.loadEstimatedW).value}
          unit={s && fmt.power(s.loadEstimatedW).unit}
          trend={trail.map((t) => t.loadEstimatedW)}
          badge={<Badge variant="outline" className="border-warn/40 text-[10px] text-warn">Neraca DC</Badge>}
          footer={
            <span>
              (P<sub>MPPT</sub> − P<sub>baterai</sub> − idle {SITE.inverter.idleW} W) × η {SITE.inverter.efficiency * 100}%
            </span>
          }
        />
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-sm">Kenapa perlu meter AC?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5 text-sm text-muted-foreground">
            {[
              "Efisiensi inverter berubah terhadap beban — estimasi bisa meleset 5–15%.",
              "Faktor daya, frekuensi dan tegangan AC hanya terbaca dari meter.",
              "Konsumsi kWh harian jadi akurat untuk hitungan penghematan.",
              "Deteksi beban berlebih sebelum inverter trip.",
            ].map((t) => (
              <p key={t} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-load" />
                {t}
              </p>
            ))}
          </CardContent>
        </Card>
        </div>
      </div>

      {r ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Daya aktif", value: fmt.n0(r.power), unit: "W", icon: <Zap /> },
            { label: "Tegangan", value: fmt.n1(r.voltage), unit: "V", icon: <Gauge /> },
            { label: "Arus", value: fmt.n2(r.current), unit: "A", icon: <Cable /> },
            { label: "Frekuensi", value: fmt.n2(r.frequency), unit: "Hz", icon: <Waves /> },
            { label: "Faktor daya", value: fmt.n2(r.powerFactor), unit: "", icon: <Activity /> },
            { label: "Energi hari ini", value: fmt.n2(r.energyTodayKwh), unit: "kWh", icon: <PlugZap /> },
          ].map((m) => (
            <Card key={m.label} className="py-0">
              <CardContent className="p-0">
                <MiniStat label={m.label} value={m.value} unit={m.unit} icon={m.icon} tone="text-load" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profil Beban Hari Ini</CardTitle>
            <CardDescription>{s?.load ? "Terukur dari meter AC" : "Estimasi dari neraca DC (MPPT − baterai)"}</CardDescription>
          </CardHeader>
          <CardContent>
            {series.data ? (
              <MetricLineChart data={series.data} dataKey="loadPower" label="Beban" unit="W" color="var(--load)" digits={0} domain={[0, "auto"]} className="h-[280px]" />
            ) : (
              <Skeleton className="h-[280px]" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Register Meter (rencana)</CardTitle>
            <CardDescription>PZEM-016 · FC04 · slave 2</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <RegisterTable
              rows={[
                { address: 0x0000, fc: "04", name: "Tegangan", scale: "÷10", value: r && fmt.n1(r.voltage), unit: "V" },
                { address: 0x0001, fc: "04", name: "Arus (L/H)", scale: "÷1000", value: r && fmt.n3(r.current), unit: "A" },
                { address: 0x0003, fc: "04", name: "Daya (L/H)", scale: "÷10", value: r && fmt.n1(r.power), unit: "W" },
                { address: 0x0005, fc: "04", name: "Energi (L/H)", scale: "Wh", value: r && fmt.n0(r.energyTodayKwh * 1000), unit: "Wh" },
                { address: 0x0007, fc: "04", name: "Frekuensi", scale: "÷10", value: r && fmt.n1(r.frequency), unit: "Hz" },
                { address: 0x0008, fc: "04", name: "Faktor daya", scale: "÷100", value: r && fmt.n2(r.powerFactor) },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
