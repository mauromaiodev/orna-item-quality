import type { StatKey } from "@/lib/types"

export const STAT_LABELS: Record<StatKey, string> = {
  attack: "Ataque",
  magic: "Magia",
  mana: "Mana",
  hp: "HP",
  defense: "Defesa",
  resistance: "Resistência",
  dexterity: "Destreza",
  ward: "Guarda",
  crit: "Crítico",
  foresight: "Antevisão",
}

export const STAT_FIELDS: StatKey[] = [
  "attack",
  "magic",
  "mana",
  "defense",
  "resistance",
  "hp",
  "dexterity",
  "ward",
  "crit",
  "foresight",
]

export const SCALING_STATS: StatKey[] = [
  "attack",
  "magic",
  "mana",
  "hp",
  "defense",
  "resistance",
  "ward",
  "foresight",
]

const PERCENT_STATS = new Set<StatKey>(["ward", "crit", "foresight"])

export function isPercentStat(key: StatKey): boolean {
  return PERCENT_STATS.has(key)
}

const FACT_LABELS: Record<string, StatKey> = {
  attack: "attack",
  ataque: "attack",
  atq: "attack",
  magic: "magic",
  magia: "magic",
  mag: "magic",
  mana: "mana",
  hp: "hp",
  vida: "hp",
  defense: "defense",
  defesa: "defense",
  def: "defense",
  resistance: "resistance",
  resistência: "resistance",
  resistencia: "resistance",
  res: "resistance",
  dexterity: "dexterity",
  destreza: "dexterity",
  des: "dexterity",
  ward: "ward",
  guarda: "ward",
  crit: "crit",
  "critical chance": "crit",
  crítico: "crit",
  critico: "crit",
  foresight: "foresight",
  antevisão: "foresight",
  antevisao: "foresight",
}

export function statFromLabel(label: string): StatKey | null {
  return FACT_LABELS[label.trim().toLowerCase()] ?? null
}
