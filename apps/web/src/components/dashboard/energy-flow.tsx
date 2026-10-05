"use client"

import { BatteryMedium, Cpu, Home, SunMedium, Zap } from "lucide-react"
import type * as React from "react"

import { Badge } from "@/components/ui/badge"
import { SITE } from "@/lib/plts/config"
import { STAGE_LABEL, fmt } from "@/lib/plts/format"
import type { LiveSnapshot } from "@/lib/plts/types"
import { cn } from "@/lib/utils"

const W = 1000
const H = 390
const Y = 92
const NODES = {
  pv: { x: 90, y: Y },
  mppt: { x: 300, y: Y },
  bus: { x: 500, y: Y },
  inverter: { x: 700, y: Y },
  load: { x: 910, y: Y },
  battery: { x: 500, y: 290 },
}

type Dir = 1 | -1 | 0

function Wire({ d, color, dir, power }: { d: string; color: string; dir: Dir; power: number }) {
  // Faster dash animation for higher power; static when idle.
  const duration = Math.max(0.35, 2.2 - Math.min(power, 3000) / 1600)
  return (
    <g>
      <path d={d} fill="none" stroke="var(--border)" strokeWidth="6" strokeLinecap="round" />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeOpacity={dir === 0 ? 0.18 : 0.35}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {dir !== 0 && (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 22"
          className="animate-flow"
          style={{
            animationDuration: `${duration}s`,
            animationDirection: dir === 1 ? "normal" : "reverse",
            filter: `drop-shadow(0 0 4px ${color})`,
          }}
        />
      )}
    </g>
  )
}

function Node({
  at,
  color,
  icon,
  label,
  value,
  sub,
  active,
  badge,
}: {
  at: { x: number; y: number }
  color: string
  icon: React.ReactNode
  label: string
  value: string
  sub?: React.ReactNode
  active: boolean
  badge?: React.ReactNode
}) {
  return (
    <div
      className="absolute flex flex-col items-center text-center"
      style={{ left: `${(at.x / W) * 100}%`, top: `${(at.y / H) * 100}%`, transform: "translate(-50%, -32px)" }}
    >
      <div className="relative">
        {active && (
          <span
            className="absolute inset-0 animate-pulse-ring rounded-2xl"
            style={{ background: `color-mix(in oklch, ${color} 30%, transparent)` }}
          />
        )}
        <div
          className="relative grid size-11 place-items-center rounded-2xl border bg-background/80 backdrop-blur sm:size-16 [&_svg]:size-5 sm:[&_svg]:size-7"
          style={{
            color,
            borderColor: `color-mix(in oklch, ${color} 45%, transparent)`,
            boxShadow: active ? `0 0 24px -4px ${color}, inset 0 0 14px -6px ${color}` : undefined,
          }}
        >
          {icon}
        </div>
      </div>
      <p className="hud-label mt-2 !text-[8px] whitespace-nowrap sm:!text-[10px]">{label}</p>
      <p className="num text-xs font-semibold whitespace-nowrap sm:text-base">{value}</p>
      {sub && <div className="hidden text-[11px] whitespace-nowrap text-muted-foreground sm:block">{sub}</div>}
      {badge && <div className="mt-1">{badge}</div>}
    </div>
  )
}

export function EnergyFlow({ snapshot, className }: { snapshot: LiveSnapshot | undefined; className?: string }) {
  const pv = snapshot?.mppt.pvPower ?? 0
  const charge = snapshot?.mppt.chargePower ?? 0
  const batt = snapshot?.bms.power ?? 0
  const load = snapshot?.load?.power ?? snapshot?.loadEstimatedW ?? 0
  const dcToInverter = Math.max(0, charge - batt)
  const measured = Boolean(snapshot?.load)

  const on = (w: number): Dir => (w > 5 ? 1 : 0)
  const battDir: Dir = batt > 5 ? 1 : batt < -5 ? -1 : 0

  const p = NODES
  const mode = !snapshot
    ? "Menghubungkan…"
    : pv > 5 && batt > 5
      ? "PV menyuplai beban & mengisi baterai"
      : pv > 5
        ? "PV + baterai menyuplai beban"
        : "Baterai menyuplai beban"

  return (
    <div className={cn("relative w-full", className)} style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <radialGradient id="ef-bus" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="var(--primary)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <Wire d={`M${p.pv.x + 40},${Y} H${p.mppt.x - 40}`} color="var(--solar)" dir={on(pv)} power={pv} />
        <Wire d={`M${p.mppt.x + 40},${Y} H${p.bus.x - 12}`} color="var(--solar)" dir={on(charge)} power={charge} />
        <Wire d={`M${p.bus.x + 12},${Y} H${p.inverter.x - 40}`} color="var(--load)" dir={on(dcToInverter)} power={dcToInverter} />
        <Wire d={`M${p.inverter.x + 40},${Y} H${p.load.x - 40}`} color="var(--load)" dir={on(load)} power={load} />
        <Wire d={`M${p.bus.x},${Y + 12} V${p.battery.y - 40}`} color="var(--battery)" dir={battDir} power={Math.abs(batt)} />

        {/* DC bus junction */}
        <circle cx={p.bus.x} cy={Y} r="34" fill="url(#ef-bus)" />
        <circle cx={p.bus.x} cy={Y} r="9" fill="var(--background)" stroke="var(--primary)" strokeWidth="2" />
        <circle cx={p.bus.x} cy={Y} r="3.5" fill="var(--primary)" />
        <text x={p.bus.x} y={Y - 26} textAnchor="middle" className="fill-muted-foreground font-mono text-[15px] tracking-[0.2em]">
          DC BUS {snapshot ? `${fmt.n1(snapshot.bms.packVoltage)} V` : ""}
        </text>
      </svg>

      <Node
        at={p.pv}
        color="var(--solar)"
        icon={<SunMedium />}
        label="Panel Surya"
        value={fmt.powerText(pv)}
        sub={snapshot ? `${fmt.n1(snapshot.mppt.pvVoltage)} V · ${fmt.n1(snapshot.mppt.pvCurrent)} A` : "—"}
        active={pv > 5}
      />
      <Node
        at={p.mppt}
        color="var(--solar)"
        icon={<Cpu />}
        label="MPPT"
        value={snapshot ? STAGE_LABEL[snapshot.mppt.stage].split(" ")[0] : "—"}
        sub={snapshot ? `${fmt.n1(snapshot.mppt.chargeCurrent)} A · ${fmt.n0(snapshot.mppt.controllerTemp)} °C` : "—"}
        active={charge > 5}
      />
      <Node
        at={p.inverter}
        color="var(--load)"
        icon={<Zap />}
        label="Inverter"
        value={fmt.powerText(dcToInverter)}
        sub={`${SITE.inverter.ratedW / 1000} kW · η ${Math.round(SITE.inverter.efficiency * 100)}%`}
        active={dcToInverter > 5}
      />
      <Node
        at={p.load}
        color="var(--load)"
        icon={<Home />}
        label="Beban Rumah"
        value={fmt.powerText(load)}
        sub={measured ? "Meter AC" : "Neraca DC"}
        active={load > 5}
        badge={
          !measured && (
            <Badge variant="outline" className="h-4 border-warn/40 px-1.5 text-[9px] text-warn">
              ESTIMASI
            </Badge>
          )
        }
      />
      <Node
        at={p.battery}
        color="var(--battery)"
        icon={<BatteryMedium />}
        label={`Baterai ${SITE.battery.nominalV} V`}
        value={snapshot ? `${fmt.n0(snapshot.bms.soc)}% · ${fmt.powerText(Math.abs(batt))}` : "—"}
        sub={batt > 5 ? "Mengisi" : batt < -5 ? "Mengosongkan" : "Idle"}
        active={Math.abs(batt) > 5}
      />

      <div className="absolute bottom-0 left-0 hidden max-w-[34%] sm:block">
        <p className="hud-label">Mode operasi</p>
        <p className="text-sm font-medium">{mode}</p>
      </div>
      <div className="absolute right-0 bottom-0 hidden text-right sm:block">
        <p className="hud-label">Kapasitas sistem</p>
        <p className="num text-sm">
          {fmt.n1(SITE.pv.arrayWp / 1000)} kWp · {fmt.n1(SITE.battery.capacityWh / 1000)} kWh
        </p>
      </div>
    </div>
  )
}
