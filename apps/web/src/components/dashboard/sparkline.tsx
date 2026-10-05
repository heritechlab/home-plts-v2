import * as React from "react"

/** Tiny decorative trend line for KPI tiles (values carry no axis). */
export function Sparkline({
  data,
  color,
  className,
  height = 36,
}: {
  data: number[]
  color: string
  className?: string
  height?: number
}) {
  const id = React.useId().replace(/:/g, "")
  if (data.length < 2) return <div style={{ height }} className={className} />
  const w = 120
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, height - 3 - ((v - min) / span) * (height - 6)])
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const area = `${line} L${w},${height} L0,${height} Z`
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={className} style={{ height }} aria-hidden>
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
