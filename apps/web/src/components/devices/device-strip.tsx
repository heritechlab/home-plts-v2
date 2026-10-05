import { LinkBadge } from "@/components/dashboard/status"
import { Card, CardContent } from "@/components/ui/card"
import { relativeAgo } from "@/lib/plts/format"
import type { DeviceStatus } from "@/lib/plts/types"

/** One-line connection summary shown at the top of each device page. */
export function DeviceStrip({ device, now }: { device: DeviceStatus | undefined; now: number | undefined }) {
  const items = device
    ? [
        { k: "Model", v: device.model },
        { k: "Port", v: device.port },
        { k: "Slave ID", v: device.slaveId ?? "–" },
        { k: "Serial", v: device.baud ? `${device.baud} ${device.frame}` : "–" },
        { k: "Polling", v: device.pollMs ? `${device.pollMs / 1000} dtk` : "–" },
        { k: "Latensi", v: device.latencyMs !== null ? `${device.latencyMs} ms` : "–" },
        {
          k: "Baca terakhir",
          v: device.lastReadAt && now ? relativeAgo(now - Date.parse(device.lastReadAt)) : "–",
        },
      ]
    : []
  return (
    <Card className="py-3">
      <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {device && <LinkBadge state={device.state} />}
        {items.map((i) => (
          <div key={i.k} className="text-xs">
            <span className="text-muted-foreground">{i.k} </span>
            <span className="num font-medium">{i.v}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
