/**
 * Domain model for the v2 setup:
 *   PV array → MPPT (Modbus RTU → laptop) → battery 48 V (BMS, Modbus RTU)
 *   → inverter → AC load meter at inverter output (Modbus RTU, planned).
 *
 * Sign convention for battery current/power: positive = charging,
 * negative = discharging.
 */

export type ChargeStage = "night" | "bulk" | "absorption" | "float"

export interface MpptReading {
  pvVoltage: number // V
  pvCurrent: number // A
  pvPower: number // W
  batteryVoltage: number // V (as seen by the MPPT)
  chargeCurrent: number // A
  chargePower: number // W (MPPT output)
  stage: ChargeStage
  controllerTemp: number // °C
  energyTodayKwh: number
  energyTotalKwh: number
}

export interface BmsReading {
  packVoltage: number // V
  current: number // A (+ charge / − discharge)
  power: number // W (+ charge / − discharge)
  soc: number // %
  soh: number // %
  remainingAh: number
  fullCapacityAh: number
  cycles: number
  cells: number[] // V, one per series cell
  cellMax: number
  cellMin: number
  cellDeltaMv: number
  tempMos: number // °C
  tempCells: [number, number] // °C, two probes
  chargeMos: boolean
  dischargeMos: boolean
  balancing: boolean
}

export interface LoadReading {
  voltage: number // V AC
  current: number // A
  power: number // W
  frequency: number // Hz
  powerFactor: number
  energyTodayKwh: number
}

export type LinkState = "online" | "degraded" | "offline" | "not_installed"

export interface DeviceStatus {
  id: "mppt" | "bms" | "load-meter" | "gateway"
  name: string
  model: string
  role: string
  state: LinkState
  port: string
  slaveId: number | null
  baud: number | null
  frame: string | null
  pollMs: number | null
  lastReadAt: string | null
  latencyMs: number | null
  successRate: number | null // 0..1 over the last 24h
  errors24h: number | null
  firmware: string | null
}

export interface LiveSnapshot {
  timestamp: string
  mppt: MpptReading
  bms: BmsReading
  /** null while the AC meter is not installed */
  load: LoadReading | null
  /** Load derived from the DC balance (MPPT output − battery charge) × inverter efficiency */
  loadEstimatedW: number
  devices: DeviceStatus[]
}

/** One aggregated sample of the time series (5-minute or hourly bucket). */
export interface TelemetryPoint {
  ts: number // epoch ms (bucket start)
  pvPower: number
  chargePower: number
  batteryPower: number
  loadPower: number
  soc: number
  pvVoltage: number
  batteryVoltage: number
  controllerTemp: number
  batteryTemp: number
  cellDeltaMv: number
}

export interface DailySummary {
  date: string // yyyy-MM-dd (Asia/Jakarta)
  pvEnergyKwh: number
  loadEnergyKwh: number
  chargeKwh: number
  dischargeKwh: number
  peakPvW: number
  peakLoadW: number
  socMin: number
  socMax: number
  socEnd: number
  sunHours: number
  solarFraction: number // 0..1 — share of load covered directly by PV
  savingsIdr: number
  co2AvoidedKg: number
  weather: "cerah" | "berawan" | "mendung" | "hujan"
  complete: boolean
}

export type Severity = "critical" | "warning" | "info" | "ok"

export interface PltsEvent {
  id: string
  ts: number
  severity: Severity
  source: "MPPT" | "BMS" | "Meter Beban" | "Gateway" | "Sistem"
  title: string
  detail: string
}

export interface RangeQuery {
  from: Date
  to: Date
}

export type Resolution = "5m" | "1h" | "1d"
