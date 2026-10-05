import type { Metadata } from "next"

import { PageHeader } from "@/components/dashboard/page-header"
import { BatteryView } from "@/components/devices/battery-view"

export const metadata: Metadata = { title: "Baterai & BMS" }

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Perangkat · Modbus RTU" title="Baterai 48 V & BMS" description="State of charge, tegangan tiap sel, suhu dan status proteksi dari battery management system." />
      <BatteryView />
    </>
  )
}
