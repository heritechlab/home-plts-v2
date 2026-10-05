"use client"

import { Cable, Cpu, Laptop, Server, Usb } from "lucide-react"
import * as React from "react"

import { Readout } from "@/components/dashboard/metric"
import { LinkBadge, StatusDot } from "@/components/dashboard/status"
import { useLive } from "@/components/layout/live-provider"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useNow } from "@/hooks/use-plts"
import { fmt, relativeAgo, wibFmt } from "@/lib/plts/format"
import type { DeviceStatus, LinkState } from "@/lib/plts/types"
import { cn } from "@/lib/utils"

interface PollEntry {
  id: number
  ts: number
  device: string
  port: string
  request: string
  bytes: number
  ok: boolean
  latency: number
}

const POLLS = [
  { device: "MPPT", port: "COM3", request: "01 04 3100 0012", bytes: 41 },
  { device: "BMS", port: "COM4", request: "01 03 0000 0034", bytes: 109 },
  { device: "MPPT", port: "COM3", request: "01 04 3300 0014", bytes: 45 },
  { device: "BMS", port: "COM4", request: "01 03 0030 0004", bytes: 13 },
]

function usePollLog() {
  const [log, setLog] = React.useState<PollEntry[]>([])
  React.useEffect(() => {
    let n = 0
    const tick = () => {
      const p = POLLS[n % POLLS.length]
      const ok = Math.random() > 0.015
      const entry: PollEntry = {
        id: n++,
        ts: Date.now(),
        ...p,
        ok,
        latency: ok ? Math.round((p.device === "BMS" ? 48 : 30) + Math.random() * 25) : 1500,
      }
      setLog((l) => [entry, ...l].slice(0, 14))
    }
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, 900)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [])
  return log
}

const ICON: Record<DeviceStatus["id"], typeof Cpu> = {
  mppt: Cpu,
  bms: Server,
  "load-meter": Cable,
  gateway: Laptop,
}

export function ConnectionsView() {
  const { snapshot: s } = useLive()
  const now = useNow(1000)
  const log = usePollLog()
  const devices = s?.devices

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Topologi Bus RS-485</CardTitle>
          <CardDescription>Laptop gateway membaca tiap perangkat via adaptor USB-RS485 (Modbus RTU master)</CardDescription>
        </CardHeader>
        <CardContent>
          <Topology devices={devices} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(devices ?? Array.from({ length: 4 }, () => undefined)).map((d, i) =>
          d ? (
            <DeviceCard key={d.id} d={d} now={now} />
          ) : (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ),
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary" />
              <span className="relative size-2 rounded-full bg-primary" />
            </span>
            Log Polling Modbus
          </CardTitle>
          <CardDescription>Permintaan terakhir dari gateway (simulasi)</CardDescription>
          <CardAction>
            <Badge variant="outline" className="font-mono text-[10px]">
              9600 8N1 · timeout 1500 ms
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Waktu</TableHead>
                  <TableHead>Perangkat</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Request (hex)</TableHead>
                  <TableHead className="text-right">Respons</TableHead>
                  <TableHead className="text-right">Latensi</TableHead>
                  <TableHead className="pr-5 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="num text-xs">
                {log.map((e) => (
                  <TableRow key={e.id} className="animate-in fade-in-0 slide-in-from-top-1">
                    <TableCell className="pl-5 text-muted-foreground">{wibFmt.timeSec(e.ts)}</TableCell>
                    <TableCell className="font-sans font-medium">{e.device}</TableCell>
                    <TableCell>{e.port}</TableCell>
                    <TableCell className="text-primary">{e.request}</TableCell>
                    <TableCell className="text-right">{e.ok ? `${e.bytes} B` : "–"}</TableCell>
                    <TableCell className="text-right">{e.latency} ms</TableCell>
                    <TableCell className="pr-5 text-right">
                      <span className={cn("font-sans text-xs font-medium", e.ok ? "text-ok" : "text-warn")}>{e.ok ? "OK · CRC valid" : "Timeout"}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function DeviceCard({ d, now }: { d: DeviceStatus; now: number | undefined }) {
  const Icon = ICON[d.id]
  const missing = d.state === "not_installed"
  return (
    <Card className={cn(missing && "border-dashed opacity-80")}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg border border-border/60 bg-background/50 text-primary">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate text-sm">{d.name}</CardTitle>
            <CardDescription className="truncate text-xs">{d.model}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <LinkBadge state={d.state} />
          {d.firmware && <span className="num text-[11px] text-muted-foreground">{d.firmware}</span>}
        </div>
        <p className="mb-2 text-xs text-muted-foreground">{d.role}</p>
        <Readout label="Port" value={d.port} />
        <Readout label="Slave / Serial" value={d.slaveId !== null ? `#${d.slaveId} · ${d.baud} ${d.frame}` : "–"} />
        <Readout label="Interval polling" value={d.pollMs ? `${d.pollMs} ms` : "–"} />
        <Readout label="Baca terakhir" value={d.lastReadAt && now ? relativeAgo(now - Date.parse(d.lastReadAt)) : "–"} />
        <Readout label="Error 24 jam" value={d.errors24h ?? "–"} />
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Keberhasilan baca 24 jam</span>
            <span className="num font-medium">{d.successRate !== null ? fmt.pct(d.successRate * 100, 2) : "–"}</span>
          </div>
          <Progress value={(d.successRate ?? 0) * 100} className="mt-1.5 h-1.5" />
        </div>
      </CardContent>
    </Card>
  )
}

function TopoNode({ icon: I, title, sub, state }: { icon: typeof Cpu; title: string; sub: string; state: LinkState }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-background/50 px-3 py-2.5",
        state === "not_installed" ? "border-dashed border-border" : "border-border/70",
      )}
    >
      <I className="size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{sub}</p>
      </div>
      <StatusDot state={state} />
    </div>
  )
}

function TopoLink({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1 pl-6 md:flex-col md:gap-1 md:py-0 md:pl-0">
      <div className="h-6 w-px bg-primary/50 md:h-px md:w-full" />
      <span className="num text-[10px] whitespace-nowrap text-muted-foreground">{label}</span>
    </div>
  )
}

function Topology({ devices }: { devices: DeviceStatus[] | undefined }) {
  const st = (id: DeviceStatus["id"]): LinkState => devices?.find((d) => d.id === id)?.state ?? "offline"
  return (
    <div className="grid items-center gap-1 md:grid-cols-[1fr_70px_1fr_110px_1fr] md:gap-3">
      <TopoNode icon={Laptop} title="Laptop Gateway" sub="Python · Modbus master" state={st("gateway")} />
      <TopoLink label="USB" />
      <div className="flex flex-col gap-2">
        <TopoNode icon={Usb} title="USB-RS485 #1" sub="COM3 · CH340" state={st("gateway")} />
        <TopoNode icon={Usb} title="USB-RS485 #2" sub="COM4 · CH340" state={st("gateway")} />
      </div>
      <div className="flex flex-col gap-6">
        <TopoLink label="A/B · RS-485" />
        <TopoLink label="A/B · bus bersama" />
      </div>
      <div className="flex flex-col gap-2">
        <TopoNode icon={Cpu} title="MPPT" sub="COM3 · slave 1 · FC04" state={st("mppt")} />
        <TopoNode icon={Server} title="BMS 48 V" sub="COM4 · slave 1 · FC03" state={st("bms")} />
        <TopoNode icon={Cable} title="Meter beban AC" sub="COM4 · slave 2 · FC04 (rencana)" state={st("load-meter")} />
      </div>
    </div>
  )
}
