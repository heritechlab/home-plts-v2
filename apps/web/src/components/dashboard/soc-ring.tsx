import { SITE } from "@/lib/plts/config"
import { fmt } from "@/lib/plts/format"
import { cn } from "@/lib/utils"

const round = (v: number) => Math.round(v * 100) / 100

export function socTone(soc: number) {
  if (soc < 12) return "var(--crit)"
  if (soc < SITE.battery.socLowAlarm) return "var(--warn)"
  return "var(--battery)"
}

/** Segmented radial gauge for state of charge. */
export function SocRing({
  soc,
  size = 180,
  label = "SOC",
  sub,
  className,
}: {
  soc: number | undefined
  size?: number
  label?: string
  sub?: string
  className?: string
}) {
  const r = 70
  const c = 2 * Math.PI * r
  const arc = 0.78 // portion of the circle used by the gauge
  const value = Math.max(0, Math.min(100, soc ?? 0))
  const color = socTone(value)
  const ticks = Array.from({ length: 41 }, (_, i) => i / 40)

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 180 180" className="absolute inset-0 size-full rotate-[129.6deg]" aria-hidden>
        {ticks.map((t) => {
          const a = t * arc * 2 * Math.PI
          const major = Math.round(t * 40) % 10 === 0
          const r1 = 86
          const r2 = major ? 80 : 83
          return (
            <line
              key={t}
              x1={round(90 + r1 * Math.cos(a))}
              y1={round(90 + r1 * Math.sin(a))}
              x2={round(90 + r2 * Math.cos(a))}
              y2={round(90 + r2 * Math.sin(a))}
              stroke={t * 100 <= value ? color : "var(--border)"}
              strokeWidth={major ? 1.6 : 1}
              opacity={t * 100 <= value ? 0.9 : 1}
            />
          )
        })}
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--muted)" strokeWidth="9" strokeDasharray={`${round(c * arc)} ${round(c)}`} strokeLinecap="round" />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${round((c * arc * value) / 100)} ${round(c)}`}
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="relative text-center">
        <p className="hud-label">{label}</p>
        <p className="num text-4xl leading-tight font-semibold">
          {soc === undefined ? "--" : fmt.n0(value)}
          <span className="text-lg text-muted-foreground">%</span>
        </p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}
