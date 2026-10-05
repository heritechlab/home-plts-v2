import type { Metadata } from "next"

import { PageHeader } from "@/components/dashboard/page-header"
import { MpptView } from "@/components/devices/mppt-view"

export const metadata: Metadata = { title: "MPPT" }

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Perangkat · Modbus RTU" title="MPPT Solar Charge Controller" description="Produksi panel surya, tahap pengisian dan register live dari controller." />
      <MpptView />
    </>
  )
}
