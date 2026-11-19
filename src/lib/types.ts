export type Lang = "pt" | "en"

export type Forge = "none" | "master" | "demon" | "god"

export type StatKey =
  | "hp"
  | "mana"
  | "attack"
  | "magic"
  | "defense"
  | "resistance"
  | "dexterity"
  | "ward"
  | "crit"
  | "foresight"

export type StatMap = Partial<Record<StatKey, number>>

export type CodexItem = {
  name: string
  url: string
  place: string | null
  upgradable: boolean
  bossLikely: boolean
  stats: StatMap
}

export type CatalogItem = {
  name: string
  url: string
}

export type CodexCandidate = {
  name: string
  url: string
}

export type CodexResponse = {
  item: CodexItem | null
  candidates: CodexCandidate[]
}

export type ReadItem = {
  name: string
  level: number | null
  forge: Forge
  language: Lang | null
  stats: StatMap
}
