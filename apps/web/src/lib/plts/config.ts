/**
 * Static description of the installation. Values here drive both the UI
 * labels and the mock simulator, so the dashboard stays coherent when the
 * real Modbus feed replaces the mock.
 */
export const SITE = {
  name: "PLTS Rumah",
  location: "Rumah Utama",
  timezone: "Asia/Jakarta",
  tzLabel: "WIB",

  pv: {
    panels: 6,
    panelWp: 550,
    get arrayWp() {
      return this.panels * this.panelWp
    },
    configuration: "2S3P",
  },

  mppt: {
    name: "MPPT Solar Charger",
    model: "MPPT 60 A · 48 V",
    maxChargeA: 60,
    efficiency: 0.97,
  },

  battery: {
    chemistry: "LiFePO₄",
    series: 16,
    nominalV: 51.2,
    capacityAh: 100,
    get capacityWh() {
      return this.nominalV * this.capacityAh
    },
    socLowAlarm: 20,
    cellDeltaWarnMv: 40,
  },

  inverter: {
    name: "Inverter Off-Grid",
    ratedW: 3000,
    efficiency: 0.92,
    idleW: 30,
  },

  loadMeter: {
    /** Flip to true once the AC meter on the inverter output is wired. */
    installed: false,
    model: "PZEM-016 (rencana)",
  },

  tariffIdrPerKwh: 1444.7, // PLN R-1 ≥ 1.300 VA
  gridEmissionKgPerKwh: 0.85,
} as const

export const SERIES = {
  pv: { label: "Produksi PV", color: "var(--solar)" },
  battery: { label: "Baterai", color: "var(--battery)" },
  load: { label: "Beban", color: "var(--load)" },
  soc: { label: "SOC", color: "var(--battery)" },
} as const
