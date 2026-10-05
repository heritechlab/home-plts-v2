import type { Metadata } from "next"

import { PageHeader } from "@/components/dashboard/page-header"
import { EventsView } from "@/components/devices/events-view"

export const metadata: Metadata = { title: "Peringatan" }

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Monitoring" title="Peringatan & Log Kejadian" description="Alarm baterai, status pengisian dan gangguan komunikasi Modbus. Klik kartu tingkat untuk memfilter." />
      <EventsView />
    </>
  )
}
