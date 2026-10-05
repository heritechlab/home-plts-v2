"use client"

import { Activity, Gauge, SunMedium, Thermometer, Zap } from "lucide-react"

import { MetricLineChart, PowerChart } from "@/components/charts/telemetry-charts"
import { MiniStat, Readout } from "@/components/dashboard/metric"
import { StatCard } from "@/components/dashboard/stat-card"
import { DeviceStrip } from "@/components/devices/device-strip"
import { RegisterTable } from "@/components/devices/register-table"
import { useLive } from "@/components/layout/live-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useNow, usePltsQuery } from "@/hooks/use-plts"
import { pltsApi } from "@/lib/plts/api"
import { SITE } from "@/lib/plts/config"
import { STAGE_LABEL, fmt, wibFmt } from "@/lib/plts/format"
import type { ChargeStage } from "@/lib/plts/types"
import { cn } from "@/lib/utils"

const STAGES: { id: ChargeStage; label: string; desc: string }[] = [
  { id: "night", label: "Standby", desc: "Tidak ada PV" },
  { id: "bulk", label: "Bulk", desc: "Arus maksimum" },
  { id: "absorption", label: "Absorption", desc: "Tegangan konstan" },
  { id: "float", label: "Float", desc: "Baterai penuh" },
]

export function MpptView() {
  const { snapshot: s, trail } = useLive()
  const now = useNow(60_000)
  const today = now ? pltsApi.today() : undefined
  const series = usePltsQuery(`mppt-${today}`, () => (today ? pltsApi.series(today, today, "5m") : Promise.resolve([])), 60_000)
  const m = s?.mppt
  const device = s?.devices.find((d) => d.id === "mppt")
  const peak = series.data?.reduce((a, p) => (p.pvPower > a.pvPower ? p : a), series.data[0])

  return (
    <>
      <DeviceStrip device={device} now={now} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Daya PV" icon={<SunMedium />} color="var(--solar)" loading={!m} value={m && fmt.power(m.pvPower).value} unit={m && fmt.power(m.pvPower).unit} trend={trail.map((t) => t.mppt.pvPower)} footer={m && <span>{fmt.n0((m.pvPower / SITE.pv.arrayWp) * 100)}% dari kapasitas array</span>} />
        <StatCard label="Tegangan PV" icon={<Gauge />} color="var(--solar)" loading={!m} value={m && fmt.n1(m.pvVoltage)} unit="V" trend={trail.map((t) => t.mppt.pvVoltage)} footer={m && <span>Arus PV {fmt.n2(m.pvCurrent)} A · {SITE.pv.configuration}</span>} />
        <StatCard label="Arus Pengisian" icon={<Zap />} color="var(--battery)" loading={!m} value={m && fmt.n1(m.chargeCurrent)} unit="A" trend={trail.map((t) => t.mppt.chargeCurrent)} footer={m && <span>Maks {SITE.mppt.maxChargeA} A · {fmt.n2(m.batteryVoltage)} V</span>} />
        <StatCard label="Suhu Controller" icon={<Thermometer />} color="var(--load)" loading={!m} value={m && fmt.n1(m.controllerTemp)} unit="°C" trend={trail.map((t) => t.mppt.controllerTemp)} footer={<span>Batas aman &lt; 60 °C</span>} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tahap Pengisian</CardTitle>
            <CardDescription>Algoritma 3-tahap MPPT untuk LiFePO₄</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STAGES.map((st, i) => {
                const active = m?.stage === st.id
                return (
                  <div
                    key={st.id}
                    className={cn(
                      "relative overflow-hidden rounded-lg border p-3 transition-colors",
                      active ? "border-solar/60 bg-solar/10" : "border-border/60 bg-background/40",
                    )}
                  >
                    {active && <div className="absolute inset-x-0 top-0 h-0.5 bg-solar shadow-[0_0_12px_var(--solar)]" />}
                    <p className="hud-label">Tahap {i}</p>
                    <p className={cn("mt-1 font-display font-semibold", active && "text-solar")}>{st.label}</p>
                    <p className="text-xs text-muted-foreground">{st.desc}</p>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Energi hari ini" value={m && fmt.n2(m.energyTodayKwh)} unit="kWh" loading={!m} />
              <MiniStat label="Total produksi" value={m && fmt.n0(m.energyTotalKwh)} unit="kWh" loading={!m} />
              <MiniStat label="Puncak hari ini" value={peak && fmt.powerText(peak.pvPower)} loading={!peak} />
              <MiniStat label="Jam puncak" value={peak && wibFmt.time(peak.ts)} unit="WIB" loading={!peak} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spesifikasi</CardTitle>
            <CardDescription>Konfigurasi array & controller</CardDescription>
          </CardHeader>
          <CardContent>
            <Readout label="Panel" value={`${SITE.pv.panels} × ${SITE.pv.panelWp} Wp`} />
            <Readout label="Konfigurasi" value={SITE.pv.configuration} />
            <Readout label="Kapasitas array" value={fmt.n2(SITE.pv.arrayWp / 1000)} unit="kWp" />
            <Readout label="Controller" value={SITE.mppt.model} />
            <Readout label="Efisiensi" value={`${SITE.mppt.efficiency * 100}%`} />
            <Readout label="Status" value={m ? STAGE_LABEL[m.stage] : "–"} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daya PV Hari Ini</CardTitle>
            <CardDescription>Produksi vs beban · interval 5 menit</CardDescription>
          </CardHeader>
          <CardContent>{series.data ? <PowerChart data={series.data} showBattery={false} className="h-[260px]" /> : <Skeleton className="h-[260px]" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tegangan PV Hari Ini</CardTitle>
            <CardDescription>Titik kerja MPPT (Vmp)</CardDescription>
          </CardHeader>
          <CardContent>
            {series.data ? (
              <MetricLineChart data={series.data} dataKey="pvVoltage" label="Tegangan PV" unit="V" color="var(--solar)" className="h-[260px]" />
            ) : (
              <Skeleton className="h-[260px]" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4 text-primary" /> Register Modbus (live)
          </CardTitle>
          <CardDescription>Contoh peta register — sesuaikan alamat dengan manual MPPT yang dipakai.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <RegisterTable
            rows={[
              { address: 0x3100, fc: "04", name: "Tegangan PV", scale: "÷100", value: m && fmt.n2(m.pvVoltage), unit: "V" },
              { address: 0x3101, fc: "04", name: "Arus PV", scale: "÷100", value: m && fmt.n2(m.pvCurrent), unit: "A" },
              { address: 0x3102, fc: "04", name: "Daya PV (L/H)", scale: "÷100", value: m && fmt.n2(m.pvPower), unit: "W" },
              { address: 0x3104, fc: "04", name: "Tegangan baterai", scale: "÷100", value: m && fmt.n2(m.batteryVoltage), unit: "V" },
              { address: 0x3105, fc: "04", name: "Arus pengisian", scale: "÷100", value: m && fmt.n2(m.chargeCurrent), unit: "A" },
              { address: 0x3111, fc: "04", name: "Suhu controller", scale: "÷100", value: m && fmt.n2(m.controllerTemp), unit: "°C" },
              { address: 0x3201, fc: "04", name: "Status pengisian", scale: "bitfield", value: m && STAGE_LABEL[m.stage] },
              { address: 0x330c, fc: "04", name: "Energi hari ini (L/H)", scale: "÷100", value: m && fmt.n2(m.energyTodayKwh), unit: "kWh" },
              { address: 0x3312, fc: "04", name: "Energi total (L/H)", scale: "÷100", value: m && fmt.n2(m.energyTotalKwh), unit: "kWh" },
            ]}
          />
        </CardContent>
      </Card>
    </>
  )
}
