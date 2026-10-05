import type { Metadata } from "next"

import { PageHeader } from "@/components/dashboard/page-header"
import { HistoryView } from "@/components/history/history-view"

export const metadata: Metadata = { title: "Riwayat" }

export default function HistoryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Analitik"
        title="Riwayat Data PLTS"
        description="Telusuri produksi, konsumsi dan kondisi baterai per hari atau rentang tanggal. Data dapat diekspor ke CSV."
      />
      <HistoryView />
    </>
  )
}
