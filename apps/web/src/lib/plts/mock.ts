/**
 * Deterministic PLTS simulator used until the Modbus gateway feeds real data.
 *
 * Every day is simulated in 5-minute steps from a seeded weather/load model,
 * and days are chained so the battery state of charge carries over midnight.
 * The same date always produces the same numbers, which keeps history
 * consistent across reloads, while the live snapshot adds a little jitter so
 * the dashboard feels alive.
 */
import { SITE } from "./config"
import {
  DAY_MS,
  STEP_MS,
  STEPS_PER_DAY,
  addDays,
  dayKey,
  dayStart,
  daysBetween,
} from "./time"
import type {
  BmsReading,
  ChargeStage,
  DailySummary,
  DeviceStatus,
  LiveSnapshot,
  LoadReading,
  MpptReading,
  PltsEvent,
  Resolution,
  TelemetryPoint,
} from "./types"

/* ------------------------------------------------------------------ */
/*  Seeded randomness                                                  */
/* ------------------------------------------------------------------ */

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: string) {
  let a = hash(seed)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Smooth value noise in [0, 1] with knots every `knotSteps` steps. */
function smoothNoise(seed: string, steps: number, knotSteps: number) {
  const r = rng(seed)
  const knots = Array.from({ length: Math.ceil(steps / knotSteps) + 2 }, r)
  return (i: number) => {
    const k = i / knotSteps
    const k0 = Math.floor(k)
    const t = k - k0
    const s = t * t * (3 - 2 * t)
    return knots[k0] * (1 - s) + knots[k0 + 1] * s
  }
}

/* ------------------------------------------------------------------ */
/*  Physical helpers                                                   */
/* ------------------------------------------------------------------ */

const CELL_OCV: [number, number][] = [
  [0, 2.95],
  [5, 3.1],
  [10, 3.18],
  [20, 3.22],
  [40, 3.26],
  [60, 3.29],
  [80, 3.32],
  [90, 3.34],
  [97, 3.38],
  [100, 3.45],
]

export function cellOcv(soc: number): number {
  const s = Math.min(100, Math.max(0, soc))
  for (let i = 1; i < CELL_OCV.length; i++) {
    const [s1, v1] = CELL_OCV[i]
    const [s0, v0] = CELL_OCV[i - 1]
    if (s <= s1) return v0 + ((s - s0) / (s1 - s0)) * (v1 - v0)
  }
  return CELL_OCV[CELL_OCV.length - 1][1]
}

const PACK_R = 0.025 // Ω, pack internal resistance

function packVoltage(soc: number, batteryPower: number) {
  const ocv = cellOcv(soc) * SITE.battery.series
  const current = batteryPower / ocv
  return { voltage: ocv + current * PACK_R, current }
}

function stageFor(pv: number, soc: number): ChargeStage {
  if (pv <= 0) return "night"
  if (soc < 95) return "bulk"
  if (soc < 99.6) return "absorption"
  return "float"
}

const SUNRISE = 5.75
const SUNSET = 17.95

function clearSky(h: number) {
  const x = (h - SUNRISE) / (SUNSET - SUNRISE)
  if (x <= 0 || x >= 1) return 0
  return Math.pow(Math.sin(Math.PI * x), 1.25)
}

function inWindow(h: number, from: number, to: number) {
  return h >= from && h < to
}

type Weather = DailySummary["weather"]

function weatherFor(key: string): { kind: Weather; base: number; variability: number } {
  const r = rng(`weather:${key}`)()
  if (r < 0.42) return { kind: "cerah", base: 0.94 + r * 0.1, variability: 0.12 }
  if (r < 0.74) return { kind: "berawan", base: 0.82, variability: 0.5 }
  if (r < 0.9) return { kind: "mendung", base: 0.4, variability: 0.35 }
  return { kind: "hujan", base: 0.2, variability: 0.3 }
}

/* ------------------------------------------------------------------ */
/*  Day simulation                                                     */
/* ------------------------------------------------------------------ */

interface SimDay {
  key: string
  weather: Weather
  points: TelemetryPoint[] // STEPS_PER_DAY entries
  startSoc: number
  endSoc: number
  events: PltsEvent[]
}

function simulateDay(key: string, startSoc: number): SimDay {
  const start = dayStart(key)
  const r = rng(`load:${key}`)
  const weather = weatherFor(key)
  const cloud = smoothNoise(`cloud:${key}`, STEPS_PER_DAY, 4)
  const flicker = smoothNoise(`flicker:${key}`, STEPS_PER_DAY, 1)
  const loadNoise = smoothNoise(`loadnoise:${key}`, STEPS_PER_DAY, 3)

  // A few appliance bursts per day (water pump, rice cooker, iron…)
  const bursts: { at: number; len: number; w: number }[] = []
  const burstCount = 2 + Math.floor(r() * 4)
  for (let i = 0; i < burstCount; i++) {
    bursts.push({
      at: Math.floor((5.5 + r() * 15) * 12),
      len: 1 + Math.floor(r() * 3),
      w: 200 + r() * 450,
    })
  }

  const weekday = new Date(start + DAY_MS / 2).getUTCDay()
  const dayFactor = (weekday === 0 || weekday === 6 ? 1.14 : 1) * (0.94 + r() * 0.12)

  const dtH = STEP_MS / 3_600_000
  const cap = SITE.battery.capacityWh
  const arrayW = SITE.pv.arrayWp * 0.82
  const effInv = SITE.inverter.efficiency
  const effMppt = SITE.mppt.efficiency
  const maxChargeW = SITE.mppt.maxChargeA * SITE.battery.nominalV

  let soc = startSoc
  const points: TelemetryPoint[] = []
  const events: PltsEvent[] = []
  let sawPv = false
  let lastPvStep = -1
  let sawFloat = false
  let lowSocFlag = false
  let critSocFlag = false
  let deltaFlag = false
  let tempFlag = false

  for (let i = 0; i < STEPS_PER_DAY; i++) {
    const ts = start + i * STEP_MS
    const h = (i * STEP_MS) / 3_600_000

    // --- PV -----------------------------------------------------------
    const cloudFactor = Math.max(0.05, weather.base * (1 - weather.variability * cloud(i)))
    const irr = clearSky(h)
    const pvAvail = arrayW * irr * cloudFactor * (0.97 + 0.06 * flicker(i))

    // --- Load ---------------------------------------------------------
    let load = 82 + (i % 8 < 3 ? 68 : 0) // base + fridge compressor
    if (inWindow(h, 4.5, 6.5)) load += 170
    if (inWindow(h, 6.5, 8)) load += 90
    if (inWindow(h, 10.5, 13)) load += 160
    if (inWindow(h, 13, 16.5)) load += 110
    if (inWindow(h, 17.5, 22.5)) load += 200
    if (inWindow(h, 18.75, 21.25)) load += 110
    if (h >= 22.5 || h < 4.5) load += 22
    for (const b of bursts) if (i >= b.at && i < b.at + b.len) load += b.w
    load *= dayFactor * (0.95 + 0.1 * loadNoise(i))
    if (soc <= 6) load = 0 // inverter low-voltage cut-off

    const dcDemand = load > 0 ? load / effInv + SITE.inverter.idleW : 0

    // --- MPPT / battery balance ----------------------------------------
    let acceptW = maxChargeW
    if (soc >= 95) acceptW = maxChargeW * Math.max(0.015, ((100 - soc) / 5) * 0.55)
    let mpptOut = pvAvail < 8 ? 0 : Math.min(pvAvail * effMppt, dcDemand + acceptW)
    if (soc >= 99.6) mpptOut = Math.min(mpptOut, dcDemand + 25)
    const pvPower = mpptOut / effMppt
    const batteryPower = mpptOut - dcDemand

    soc += ((batteryPower > 0 ? batteryPower * 0.97 : batteryPower) * dtH * 100) / cap
    soc = Math.min(100, Math.max(5, soc))

    const { voltage, current } = packVoltage(soc, batteryPower)
    const ambient = 25.5 + 5.5 * Math.max(0, Math.sin((Math.PI * (h - 8)) / 12))
    const controllerTemp = ambient + (mpptOut / 3000) * 19
    const batteryTemp = 26.4 + 3 * Math.max(0, Math.sin((Math.PI * (h - 9)) / 12)) + (Math.abs(batteryPower) / 3000) * 4
    const cellDeltaMv =
      7 +
      Math.abs(current) * 0.22 +
      (soc > 97 ? (soc - 97) * 7 : 0) +
      (soc < 15 ? (15 - soc) * 2.2 : 0) +
      flicker(i) * 3

    const pvVoltage = pvPower > 0 ? 74 + 10 * Math.sqrt(irr) - (controllerTemp - 25) * 0.12 : irr > 0 ? 66 * irr : 0.4

    points.push({
      ts,
      pvPower,
      chargePower: mpptOut,
      batteryPower,
      loadPower: load,
      soc,
      pvVoltage,
      batteryVoltage: voltage,
      controllerTemp,
      batteryTemp,
      cellDeltaMv,
    })

    // --- Events ---------------------------------------------------------
    if (pvPower > 0) {
      if (!sawPv) {
        sawPv = true
        events.push(ev(key, ts, "info", "MPPT", "Produksi PV dimulai", `Tegangan PV ${pvVoltage.toFixed(1)} V, mulai mengisi baterai.`))
      }
      lastPvStep = i
    }
    const stage = stageFor(pvPower, soc)
    if (stage === "float" && !sawFloat) {
      sawFloat = true
      events.push(ev(key, ts, "ok", "MPPT", "Baterai penuh — mode Float", `SOC ${soc.toFixed(0)}%, pengisian beralih ke float ${voltage.toFixed(1)} V.`))
    }
    if (soc < SITE.battery.socLowAlarm && !lowSocFlag) {
      lowSocFlag = true
      events.push(ev(key, ts, "warning", "BMS", "SOC baterai rendah", `SOC turun ke ${soc.toFixed(0)}% (ambang ${SITE.battery.socLowAlarm}%). Pertimbangkan mengurangi beban.`))
    }
    if (soc < 12 && !critSocFlag) {
      critSocFlag = true
      events.push(ev(key, ts, "critical", "BMS", "SOC kritis", `SOC ${soc.toFixed(0)}% — inverter mendekati batas low-voltage cut-off.`))
    }
    if (cellDeltaMv > SITE.battery.cellDeltaWarnMv && !deltaFlag) {
      deltaFlag = true
      events.push(ev(key, ts, "warning", "BMS", "Selisih tegangan sel tinggi", `Δ sel ${cellDeltaMv.toFixed(0)} mV, balancing aktif.`))
    }
    if (controllerTemp > 48 && !tempFlag) {
      tempFlag = true
      events.push(ev(key, ts, "warning", "MPPT", "Suhu MPPT tinggi", `Suhu controller ${controllerTemp.toFixed(1)} °C saat daya ${mpptOut.toFixed(0)} W.`))
    }
  }

  if (lastPvStep > 0) {
    events.push(ev(key, start + (lastPvStep + 1) * STEP_MS, "info", "MPPT", "Produksi PV selesai", "Matahari terbenam, sistem beralih ke baterai."))
  }

  // Occasional Modbus hiccups on the RS-485 bus
  const comm = rng(`comm:${key}`)
  const glitches = Math.floor(comm() * 3)
  for (let g = 0; g < glitches; g++) {
    const at = start + Math.floor(comm() * STEPS_PER_DAY) * STEP_MS + Math.floor(comm() * 280_000)
    const dev = comm() < 0.6 ? "BMS" : "MPPT"
    const port = dev === "BMS" ? "COM4" : "COM3"
    events.push(ev(key, at, "warning", "Gateway", `Timeout Modbus ${dev}`, `Tidak ada respons dari slave 1 di ${port} (3× percobaan, 1500 ms).`))
    events.push(ev(key, at + 6000 + Math.floor(comm() * 20_000), "ok", "Gateway", `Komunikasi ${dev} pulih`, `Pembacaan register kembali normal di ${port}.`))
  }

  events.sort((a, b) => a.ts - b.ts)
  return { key, weather: weather.kind, points, startSoc, endSoc: soc, events }
}

function ev(
  key: string,
  ts: number,
  severity: PltsEvent["severity"],
  source: PltsEvent["source"],
  title: string,
  detail: string,
): PltsEvent {
  return { id: `${key}-${ts}-${hash(title) % 9973}`, ts, severity, source, title, detail }
}

/* ------------------------------------------------------------------ */
/*  Day cache with SOC chaining                                        */
/* ------------------------------------------------------------------ */

const HISTORY_DAYS = 180
const cache = new Map<string, SimDay>()
let anchorKey: string | null = null

function anchor(): string {
  anchorKey ??= addDays(dayKey(Date.now()), -HISTORY_DAYS)
  return anchorKey
}

function getDay(key: string): SimDay {
  const hit = cache.get(key)
  if (hit) return hit

  const first = anchor()
  if (key <= first) {
    const day = simulateDay(key, 64)
    cache.set(key, day)
    return day
  }
  // Walk forward from the latest cached ancestor so SOC carries over.
  let k = addDays(key, -1)
  while (k > first && !cache.has(k)) k = addDays(k, -1)
  let prev = cache.get(k) ?? getDay(first)
  for (let d = addDays(prev.key, 1); d <= key; d = addDays(d, 1)) {
    const day = simulateDay(d, prev.endSoc)
    cache.set(d, day)
    prev = day
  }
  return prev
}

/** Earliest day key with simulated history. */
export function historyStartKey(): string {
  return addDays(anchor(), 1)
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

function pointsBetween(from: number, to: number): TelemetryPoint[] {
  const out: TelemetryPoint[] = []
  for (const key of daysBetween(dayKey(from), dayKey(to))) {
    for (const p of getDay(key).points) if (p.ts >= from && p.ts < to) out.push(p)
  }
  return out
}

function average(points: TelemetryPoint[], ts: number): TelemetryPoint {
  const n = points.length
  const acc: TelemetryPoint = {
    ts,
    pvPower: 0,
    chargePower: 0,
    batteryPower: 0,
    loadPower: 0,
    soc: 0,
    pvVoltage: 0,
    batteryVoltage: 0,
    controllerTemp: 0,
    batteryTemp: 0,
    cellDeltaMv: 0,
  }
  for (const p of points) {
    acc.pvPower += p.pvPower / n
    acc.chargePower += p.chargePower / n
    acc.batteryPower += p.batteryPower / n
    acc.loadPower += p.loadPower / n
    acc.soc += p.soc / n
    acc.pvVoltage += p.pvVoltage / n
    acc.batteryVoltage += p.batteryVoltage / n
    acc.controllerTemp += p.controllerTemp / n
    acc.batteryTemp += p.batteryTemp / n
    acc.cellDeltaMv += p.cellDeltaMv / n
  }
  return acc
}

export function series(from: number, to: number, resolution: Resolution, now = Date.now()): TelemetryPoint[] {
  const raw = pointsBetween(from, Math.min(to, now))
  if (resolution === "5m") return raw
  const bucket = resolution === "1h" ? 3_600_000 : DAY_MS
  const groups = new Map<number, TelemetryPoint[]>()
  for (const p of raw) {
    const b = resolution === "1d" ? dayStart(dayKey(p.ts)) : Math.floor(p.ts / bucket) * bucket
    const g = groups.get(b)
    if (g) g.push(p)
    else groups.set(b, [p])
  }
  return [...groups.entries()].map(([ts, pts]) => average(pts, ts))
}

export function dailySummary(key: string, now = Date.now()): DailySummary {
  const day = getDay(key)
  const pts = day.points.filter((p) => p.ts <= now)
  const dtH = STEP_MS / 3_600_000
  let pv = 0,
    loadE = 0,
    ch = 0,
    dis = 0,
    direct = 0,
    peakPv = 0,
    peakLoad = 0,
    socMin = 100,
    socMax = 0
  for (const p of pts) {
    pv += p.pvPower * dtH
    loadE += p.loadPower * dtH
    ch += Math.max(0, p.batteryPower) * dtH
    dis += Math.max(0, -p.batteryPower) * dtH
    direct += Math.min(p.loadPower, p.chargePower * SITE.inverter.efficiency) * dtH
    peakPv = Math.max(peakPv, p.pvPower)
    peakLoad = Math.max(peakLoad, p.loadPower)
    socMin = Math.min(socMin, p.soc)
    socMax = Math.max(socMax, p.soc)
  }
  const pvKwh = pv / 1000
  const loadKwh = loadE / 1000
  return {
    date: key,
    pvEnergyKwh: pvKwh,
    loadEnergyKwh: loadKwh,
    chargeKwh: ch / 1000,
    dischargeKwh: dis / 1000,
    peakPvW: peakPv,
    peakLoadW: peakLoad,
    socMin: pts.length ? socMin : 0,
    socMax: pts.length ? socMax : 0,
    socEnd: pts.length ? pts[pts.length - 1].soc : day.startSoc,
    sunHours: pvKwh / (SITE.pv.arrayWp / 1000),
    solarFraction: loadE > 0 ? direct / loadE : 0,
    savingsIdr: loadKwh * SITE.tariffIdrPerKwh,
    co2AvoidedKg: loadKwh * SITE.gridEmissionKgPerKwh,
    weather: day.weather,
    complete: pts.length === day.points.length,
  }
}

export function dailySummaries(fromKey: string, toKey: string, now = Date.now()): DailySummary[] {
  const todayKey = dayKey(now)
  const last = toKey > todayKey ? todayKey : toKey
  const first = fromKey < historyStartKey() ? historyStartKey() : fromKey
  return daysBetween(first, last).map((k) => dailySummary(k, now))
}

export function events(from: number, to: number, now = Date.now()): PltsEvent[] {
  const out: PltsEvent[] = []
  const end = Math.min(to, now)
  for (const key of daysBetween(dayKey(from), dayKey(end))) {
    for (const e of getDay(key).events) if (e.ts >= from && e.ts <= end) out.push(e)
  }
  return out.sort((a, b) => b.ts - a.ts)
}

/* ------------------------------------------------------------------ */
/*  Live snapshot                                                      */
/* ------------------------------------------------------------------ */

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function sampleAt(ts: number): TelemetryPoint {
  const key = dayKey(ts)
  const day = getDay(key)
  const idx = Math.floor((ts - dayStart(key)) / STEP_MS)
  const a = day.points[Math.min(idx, STEPS_PER_DAY - 1)]
  const b = idx + 1 < STEPS_PER_DAY ? day.points[idx + 1] : getDay(addDays(key, 1)).points[0]
  const t = (ts - a.ts) / STEP_MS
  return {
    ts,
    pvPower: lerp(a.pvPower, b.pvPower, t),
    chargePower: lerp(a.chargePower, b.chargePower, t),
    batteryPower: lerp(a.batteryPower, b.batteryPower, t),
    loadPower: lerp(a.loadPower, b.loadPower, t),
    soc: lerp(a.soc, b.soc, t),
    pvVoltage: lerp(a.pvVoltage, b.pvVoltage, t),
    batteryVoltage: lerp(a.batteryVoltage, b.batteryVoltage, t),
    controllerTemp: lerp(a.controllerTemp, b.controllerTemp, t),
    batteryTemp: lerp(a.batteryTemp, b.batteryTemp, t),
    cellDeltaMv: lerp(a.cellDeltaMv, b.cellDeltaMv, t),
  }
}

function lifetimeKwh(now: number) {
  let total = 1586.4 // energy before the simulated window
  for (const key of daysBetween(historyStartKey(), addDays(dayKey(now), -1))) {
    total += dailySummary(key, now).pvEnergyKwh
  }
  return total
}

export function devices(now = Date.now()): DeviceStatus[] {
  const iso = (ms: number) => new Date(now - ms).toISOString()
  return [
    {
      id: "mppt",
      name: SITE.mppt.name,
      model: SITE.mppt.model,
      role: "Charge controller PV → baterai",
      state: "online",
      port: "COM3 · USB-RS485",
      slaveId: 1,
      baud: 9600,
      frame: "8N1",
      pollMs: 2000,
      lastReadAt: iso(800 + (now % 1200)),
      latencyMs: 34 + (now % 17),
      successRate: 0.9984,
      errors24h: 2,
      firmware: "v2.14",
    },
    {
      id: "bms",
      name: "BMS Baterai 48 V",
      model: `${SITE.battery.chemistry} ${SITE.battery.series}S ${SITE.battery.capacityAh} Ah`,
      role: "Monitoring sel & proteksi baterai",
      state: "online",
      port: "COM4 · USB-RS485",
      slaveId: 1,
      baud: 9600,
      frame: "8N1",
      pollMs: 3000,
      lastReadAt: iso(1100 + (now % 1900)),
      latencyMs: 51 + (now % 23),
      successRate: 0.9912,
      errors24h: 9,
      firmware: "v4.3.1",
    },
    {
      id: "load-meter",
      name: "Meter Beban AC",
      model: SITE.loadMeter.model,
      role: "Daya beban di output inverter",
      state: SITE.loadMeter.installed ? "online" : "not_installed",
      port: "COM4 · RS485 (rencana)",
      slaveId: 2,
      baud: 9600,
      frame: "8N1",
      pollMs: 2000,
      lastReadAt: null,
      latencyMs: null,
      successRate: null,
      errors24h: null,
      firmware: null,
    },
    {
      id: "gateway",
      name: "Laptop Gateway",
      model: "Windows · Python Modbus RTU",
      role: "Polling Modbus & unggah ke server",
      state: "online",
      port: "USB ×2",
      slaveId: null,
      baud: null,
      frame: null,
      pollMs: 1000,
      lastReadAt: iso(400 + (now % 700)),
      latencyMs: 120 + (now % 60),
      successRate: 0.9997,
      errors24h: 0,
      firmware: "gateway 2.0.0-dev",
    },
  ]
}

export function liveSnapshot(now = Date.now(), jitter = true): LiveSnapshot {
  const s = sampleAt(now)
  const j = (amp: number) => (jitter ? (Math.random() - 0.5) * 2 * amp : 0)

  const pvPower = Math.max(0, s.pvPower * (1 + j(0.025)))
  const loadW = Math.max(0, s.loadPower * (1 + j(0.04)))
  const chargePower = pvPower * SITE.mppt.efficiency
  const dcDemand = loadW > 0 ? loadW / SITE.inverter.efficiency + SITE.inverter.idleW : 0
  const batteryPower = chargePower - dcDemand
  const { voltage, current } = packVoltage(s.soc, batteryPower)
  const today = dailySummary(dayKey(now), now)

  const mppt: MpptReading = {
    pvVoltage: s.pvVoltage + j(0.3),
    pvCurrent: s.pvVoltage > 5 ? pvPower / s.pvVoltage : 0,
    pvPower,
    batteryVoltage: voltage + 0.08,
    chargeCurrent: chargePower / voltage,
    chargePower,
    stage: stageFor(pvPower, s.soc),
    controllerTemp: s.controllerTemp + j(0.2),
    energyTodayKwh: today.pvEnergyKwh,
    energyTotalKwh: lifetimeKwh(now) + today.pvEnergyKwh,
  }

  const cellR = rng("cells")
  const offsets = Array.from({ length: SITE.battery.series }, () => cellR() - 0.5)
  const spread = s.cellDeltaMv / 1000
  const base = cellOcv(s.soc) + (current * PACK_R) / SITE.battery.series
  const cells = offsets.map((o) => base + o * spread + j(0.0008))
  const cellMax = Math.max(...cells)
  const cellMin = Math.min(...cells)

  const bms: BmsReading = {
    packVoltage: voltage,
    current,
    power: batteryPower,
    soc: s.soc,
    soh: 97.6,
    remainingAh: (s.soc / 100) * SITE.battery.capacityAh,
    fullCapacityAh: SITE.battery.capacityAh,
    cycles: 212 + Math.floor((now - dayStart(historyStartKey())) / DAY_MS / 1.4),
    cells,
    cellMax,
    cellMin,
    cellDeltaMv: (cellMax - cellMin) * 1000,
    tempMos: s.batteryTemp + 3.1 + Math.abs(current) * 0.05,
    tempCells: [s.batteryTemp + j(0.1), s.batteryTemp + 0.6 + j(0.1)],
    chargeMos: true,
    dischargeMos: true,
    balancing: s.soc > 94 && batteryPower > 0,
  }

  const load: LoadReading | null = SITE.loadMeter.installed
    ? {
        voltage: 220 + j(1.5),
        current: loadW / 220,
        power: loadW,
        frequency: 50 + j(0.03),
        powerFactor: 0.93,
        energyTodayKwh: today.loadEnergyKwh,
      }
    : null

  return {
    timestamp: new Date(now).toISOString(),
    mppt,
    bms,
    load,
    loadEstimatedW: loadW,
    devices: devices(now),
  }
}

/** Preview of the AC meter readings (used by the "simulate meter" toggle). */
export function simulatedLoadReading(now = Date.now()): LoadReading {
  const s = sampleAt(now)
  const w = s.loadPower * (1 + (Math.random() - 0.5) * 0.06)
  const v = 219 + Math.random() * 3
  return {
    voltage: v,
    current: w / v / 0.93,
    power: w,
    frequency: 49.97 + Math.random() * 0.06,
    powerFactor: 0.91 + Math.random() * 0.04,
    energyTodayKwh: dailySummary(dayKey(now), now).loadEnergyKwh,
  }
}
