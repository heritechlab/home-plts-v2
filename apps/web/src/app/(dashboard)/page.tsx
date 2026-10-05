import type { Metadata } from "next"

import { Overview } from "@/components/dashboard/overview"
import { PageHeader } from "@/components/dashboard/page-header"
import { SITE } from "@/lib/plts/config"

export const metadata: Metadata = { title: "Ringkasan" }

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pusat Kendali"
        title={`${SITE.name} — Status Real-time`}
        description="MPPT dan BMS dibaca via Modbus RTU oleh laptop gateway. Data saat ini adalah simulasi (mock) hingga gateway terhubung."
      />
      <Overview />
    </>
  )
}
