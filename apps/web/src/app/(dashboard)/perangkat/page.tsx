import type { Metadata } from "next"

import { PageHeader } from "@/components/dashboard/page-header"
import { ConnectionsView } from "@/components/devices/connections-view"

export const metadata: Metadata = { title: "Koneksi Modbus" }

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Infrastruktur" title="Koneksi Modbus & Gateway" description="Kesehatan komunikasi RS-485 antara laptop gateway, MPPT, BMS dan meter beban." />
      <ConnectionsView />
    </>
  )
}
