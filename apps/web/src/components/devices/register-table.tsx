import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export interface RegisterRow {
  address: number
  name: string
  fc: "03" | "04"
  scale: string
  value: string | undefined
  unit?: string
}

/** Live view of the Modbus registers polled for a device. */
export function RegisterTable({ rows }: { rows: RegisterRow[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Alamat</TableHead>
            <TableHead>FC</TableHead>
            <TableHead>Parameter</TableHead>
            <TableHead>Skala</TableHead>
            <TableHead className="pr-5 text-right">Nilai</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.address}>
              <TableCell className="num pl-5 text-primary">0x{r.address.toString(16).toUpperCase().padStart(4, "0")}</TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {r.fc}
                </Badge>
              </TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell className="num text-muted-foreground">{r.scale}</TableCell>
              <TableCell className="num pr-5 text-right font-medium">
                {r.value ?? "–"}
                {r.unit && <span className="ml-1 text-xs text-muted-foreground">{r.unit}</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
