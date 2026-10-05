import type { Metadata } from "next"

import { PageHeader } from "@/components/dashboard/page-header"
import { LoadView } from "@/components/devices/load-view"

export const metadata: Metadata = { title: "Beban Inverter" }

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Perangkat · Disiapkan" title="Beban di Output Inverter" description="Meter daya AC belum terpasang. Sementara ini beban diestimasi dari neraca daya DC." />
      <LoadView />
    </>
  )
}
