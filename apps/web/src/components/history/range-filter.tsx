"use client"

import { id as localeId } from "date-fns/locale"
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { keyLabel } from "@/lib/plts/format"
import { PRESETS, type DayRange, type PresetId, presetRange } from "@/lib/plts/ranges"
import { addDays, keyFromLocalDate, localDateFromKey } from "@/lib/plts/time"
import { cn } from "@/lib/utils"

export function rangeLabel(r: DayRange) {
  if (r.from === r.to) return keyLabel(r.from, true)
  return `${keyLabel(r.from)} – ${keyLabel(r.to, true)}`
}

export function RangeFilter({
  today,
  minKey,
  preset,
  range,
  onChange,
  presets = PRESETS.map((p) => p.id),
  className,
}: {
  today: string
  minKey: string
  preset: PresetId
  range: DayRange
  onChange: (preset: PresetId, range: DayRange) => void
  presets?: Exclude<PresetId, "custom">[]
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<DateRange | undefined>()
  const single = range.from === range.to

  const shift = (n: number) => {
    const d = addDays(range.from, n)
    if (d < minKey || d > today) return
    onChange("custom", { from: d, to: d })
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-background/40 p-1">
        {PRESETS.filter((p) => presets.includes(p.id)).map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={preset === p.id ? "secondary" : "ghost"}
            className={cn("h-7 px-2.5 text-xs", preset === p.id && "text-primary ring-1 ring-primary/40")}
            onClick={() => onChange(p.id, presetRange(p.id, today))}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        {single && (
          <Button size="icon" variant="outline" className="size-8" aria-label="Hari sebelumnya" disabled={range.from <= minKey} onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
        )}
        <Popover
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (o) setDraft({ from: localDateFromKey(range.from), to: localDateFromKey(range.to) })
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-8 gap-2 text-xs", preset === "custom" && "border-primary/50 text-primary")}>
              <CalendarRange className="size-3.5" />
              <span className="num">{rangeLabel(range)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              locale={localeId}
              numberOfMonths={2}
              defaultMonth={localDateFromKey(addDays(range.to, -28))}
              selected={draft}
              onSelect={setDraft}
              disabled={[{ before: localDateFromKey(minKey) }, { after: localDateFromKey(today) }]}
              startMonth={localDateFromKey(minKey)}
              endMonth={localDateFromKey(today)}
            />
            <div className="flex items-center justify-between gap-2 border-t border-border/60 p-3">
              <p className="text-xs text-muted-foreground">
                {draft?.from ? rangeLabel({ from: keyFromLocalDate(draft.from), to: keyFromLocalDate(draft.to ?? draft.from) }) : "Pilih tanggal"}
              </p>
              <Button
                size="sm"
                disabled={!draft?.from}
                onClick={() => {
                  if (!draft?.from) return
                  onChange("custom", { from: keyFromLocalDate(draft.from), to: keyFromLocalDate(draft.to ?? draft.from) })
                  setOpen(false)
                }}
              >
                Terapkan
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        {single && (
          <Button size="icon" variant="outline" className="size-8" aria-label="Hari berikutnya" disabled={range.from >= today} onClick={() => shift(1)}>
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function ResolutionSelect({
  value,
  onChange,
}: {
  value: "auto" | "5m" | "1h" | "1d"
  onChange: (v: "auto" | "5m" | "1h" | "1d") => void
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as typeof value)}>
      <SelectTrigger size="sm" className="h-8 w-[178px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">Resolusi: Otomatis</SelectItem>
        <SelectItem value="5m">Resolusi: 5 menit</SelectItem>
        <SelectItem value="1h">Resolusi: 1 jam</SelectItem>
        <SelectItem value="1d">Resolusi: Harian</SelectItem>
      </SelectContent>
    </Select>
  )
}
