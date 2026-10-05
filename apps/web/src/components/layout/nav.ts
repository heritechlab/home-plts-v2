import {
  BatteryCharging,
  Bell,
  Cable,
  History,
  LayoutDashboard,
  PlugZap,
  SunMedium,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  description: string
  badge?: string
}

export const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Monitoring",
    items: [
      { title: "Ringkasan", href: "/", icon: LayoutDashboard, description: "Status PLTS secara real-time" },
      { title: "Riwayat", href: "/riwayat", icon: History, description: "Data harian, mingguan dan bulanan" },
      { title: "Peringatan", href: "/peringatan", icon: Bell, description: "Log kejadian & alarm sistem" },
    ],
  },
  {
    label: "Perangkat",
    items: [
      { title: "MPPT", href: "/mppt", icon: SunMedium, description: "Solar charge controller" },
      { title: "Baterai & BMS", href: "/baterai", icon: BatteryCharging, description: "Baterai 48 V & battery management system" },
      { title: "Beban Inverter", href: "/beban", icon: PlugZap, description: "Meter daya di output inverter", badge: "Segera" },
      { title: "Koneksi Modbus", href: "/perangkat", icon: Cable, description: "Status bus RS-485 & gateway" },
    ],
  },
]

export const ALL_NAV = NAV.flatMap((g) => g.items)

export function navFor(pathname: string): NavItem | undefined {
  return ALL_NAV.find((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)))
}

