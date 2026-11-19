import { SCALING_STATS, isPercentStat } from "./stats"
import type { Forge, StatKey, StatMap } from "./types"

const COARSE_STATS = new Set<StatKey>(["ward", "foresight"])

export type StatLine = {
  key: StatKey
  shown: number
  reference: number
  percent: number
  predicted: number
  matches: boolean
  percentStat: boolean
}

export type DexterityCheck = {
  shown: number
  predicted: number
  matches: boolean
}

export type QualityTier =
  | "broken"
  | "poor"
  | "common"
  | "superior"
  | "famed"
  | "legendary"
  | "ornate"

export type MilestoneId = "level10" | "master" | "demon" | "god"

export type ProjectionColumn = {
  label: MilestoneId
  stats: { key: StatKey; value: number }[]
}

export type Assessment = {
  quality: number
  tier: QualityTier
  boss: boolean
  curvesAgree: boolean
  level: number
  coarse: boolean
  lines: StatLine[]
  dexterity: DexterityCheck | null
  projection: ProjectionColumn[]
}

type CurveScore = {
  boss: boolean
  quality: number
  matches: number
  error: number
}

/** Nível interno: 1–10 no ferreiro, 11 MF, 12 DF, 13 GF. */
export function resolveLevel(level: number, forge: Forge): number {
  if (forge === "master") return 11
  if (forge === "demon") return 12
  if (forge === "god") return 13
  if (!Number.isFinite(level)) return 1
  return Math.min(10, Math.max(1, Math.round(level)))
}

/** Faixa de qualidade usada pela comunidade do Orna. */
export function qualityTier(quality: number): QualityTier {
  if (quality >= 170) return "ornate"
  if (quality >= 140) return "legendary"
  if (quality >= 120) return "famed"
  if (quality >= 101) return "superior"
  if (quality === 100) return "common"
  if (quality >= 90) return "poor"
  return "broken"
}

function baseDelta(base: number, boss: boolean): number {
  const posDiv = boss ? 8 : 10
  const negDiv = boss ? -600 : -75
  return Math.ceil(base / (base > 0 ? posDiv : negDiv))
}

function qualityDelta(level: number): number {
  return level > 10 ? level - 10 : 0
}

/** Status escalado pela fórmula do OrnaCodex, sem o bônus de Anguish. */
export function upgradedStat(input: {
  base: number
  level: number
  quality: number
  boss: boolean
}): number {
  const grown = input.base + (input.level === 1 ? 0 : input.level * baseDelta(input.base, input.boss))
  const percent = input.quality + qualityDelta(input.level)
  return Math.ceil((grown * percent) / 100)
}

/** Destreza sobe com o nível e não multiplica pela qualidade. */
export function dexterityAt(input: { base: number; level: number; boss: boolean }): number {
  const extra = input.level > 1 ? input.level * baseDelta(input.base, input.boss) : 0
  return Math.ceil(input.base + extra)
}

function approximate(input: {
  shown: number
  reference: number
  test: number
  quality: number
  statAt: (quality: number) => number
}): number {
  let test = input.test
  let quality = input.quality
  let direction = 0
  for (let depth = 0; depth < 10; depth += 1) {
    const delta = test - input.shown
    if (delta === 0) return quality
    const next = stepQuality({ ...input, test, quality, direction, delta })
    if (next.done) return next.quality
    direction = next.direction
    quality = next.quality
    test = next.test
  }
  return quality
}

function stepQuality(input: {
  shown: number
  reference: number
  test: number
  quality: number
  direction: number
  delta: number
  statAt: (quality: number) => number
}): { done: boolean; quality: number; direction: number; test: number } {
  const directionFix = input.reference > 0 !== input.delta > 0 ? 1 : -1
  const qualityFix = input.quality + directionFix
  const fix = input.statAt(qualityFix)
  const turned = input.direction !== 0 && input.direction !== directionFix
  if (!turned) {
    return { done: false, quality: qualityFix, direction: directionFix, test: fix }
  }
  const closer = Math.abs(fix - input.shown) < Math.abs(input.delta)
  return { done: true, quality: closer ? qualityFix : input.quality, direction: directionFix, test: fix }
}

/** Qualidade inteira que reproduz o status mostrado nesse nível. */
export function itemQuality(input: {
  shown: number
  base: number
  level: number
  boss: boolean
}): number {
  const delta = qualityDelta(input.level)
  const reference = upgradedStat({ ...input, quality: 100 })
  const rough = Math.round((input.shown / reference) * (100 + delta) - delta)
  const test = upgradedStat({ ...input, quality: rough })
  return approximate({
    shown: input.shown,
    reference,
    test,
    quality: rough,
    statAt: (quality) => upgradedStat({ ...input, quality }),
  })
}

function scalingKeys(shown: StatMap, base: StatMap): StatKey[] {
  return SCALING_STATS.filter((key) => {
    const value = shown[key]
    const origin = base[key]
    return typeof value === "number" && typeof origin === "number" && origin !== 0
  })
}

function primaryKey(keys: StatKey[], shown: StatMap): StatKey {
  return keys.reduce((best, key) =>
    Math.abs(shown[key] ?? 0) > Math.abs(shown[best] ?? 0) ? key : best,
  )
}

function scoreCurve(input: {
  boss: boolean
  shown: StatMap
  base: StatMap
  level: number
  keys: StatKey[]
}): CurveScore {
  const primary = primaryKey(input.keys, input.shown)
  const quality = itemQuality({
    shown: input.shown[primary] ?? 0,
    base: input.base[primary] ?? 0,
    level: input.level,
    boss: input.boss,
  })
  return input.keys.reduce<CurveScore>(
    (score, key) => addStatError(score, input, quality, key),
    { boss: input.boss, quality, matches: 0, error: 0 },
  )
}

function addStatError(
  score: CurveScore,
  input: { shown: StatMap; base: StatMap; level: number; boss: boolean },
  quality: number,
  key: StatKey,
): CurveScore {
  const predicted = upgradedStat({
    base: input.base[key] ?? 0,
    level: input.level,
    quality,
    boss: input.boss,
  })
  const delta = predicted - (input.shown[key] ?? 0)
  return {
    ...score,
    error: score.error + Math.abs(delta),
    matches: score.matches + (delta === 0 ? 1 : 0),
  }
}

function chooseCurve(normal: CurveScore, boss: CurveScore, preferBoss: boolean): CurveScore {
  if (boss.matches !== normal.matches) return boss.matches > normal.matches ? boss : normal
  if (boss.error !== normal.error) return boss.error < normal.error ? boss : normal
  return preferBoss ? boss : normal
}

function buildLine(input: {
  key: StatKey
  shown: number
  base: number
  level: number
  boss: boolean
  quality: number
}): StatLine {
  const reference = upgradedStat({ base: input.base, level: input.level, quality: 100, boss: input.boss })
  const predicted = upgradedStat({
    base: input.base,
    level: input.level,
    quality: input.quality,
    boss: input.boss,
  })
  const percent = itemQuality({
    shown: input.shown,
    base: input.base,
    level: input.level,
    boss: input.boss,
  })
  return {
    key: input.key,
    shown: input.shown,
    reference,
    percent: predicted === input.shown ? input.quality : percent,
    predicted,
    matches: predicted === input.shown,
    percentStat: isPercentStat(input.key),
  }
}

function dexterityCheck(input: {
  shown: StatMap
  base: StatMap
  level: number
  boss: boolean
}): DexterityCheck | null {
  const shown = input.shown.dexterity
  const base = input.base.dexterity
  if (typeof shown !== "number" || typeof base !== "number") return null
  const predicted = dexterityAt({ base, level: input.level, boss: input.boss })
  return { shown, predicted, matches: predicted === shown }
}

const MILESTONES: { label: MilestoneId; level: number }[] = [
  { label: "level10", level: 10 },
  { label: "master", level: 11 },
  { label: "demon", level: 12 },
  { label: "god", level: 13 },
]

function projectStat(input: {
  key: StatKey
  base: number
  level: number
  quality: number
  boss: boolean
}): number {
  if (input.key === "dexterity") {
    return dexterityAt({ base: input.base, level: input.level, boss: input.boss })
  }
  if (input.key === "crit") return input.base
  return upgradedStat(input)
}

function projection(input: {
  base: StatMap
  quality: number
  boss: boolean
}): ProjectionColumn[] {
  const keys = projectionKeys(input.base)
  return MILESTONES.map((milestone) => ({
    label: milestone.label,
    stats: keys.map((key) => ({
      key,
      value: projectStat({
        key,
        base: input.base[key] ?? 0,
        level: milestone.level,
        quality: input.quality,
        boss: input.boss,
      }),
    })),
  }))
}

function projectionKeys(base: StatMap): StatKey[] {
  return SCALING_STATS.filter((key) => typeof base[key] === "number" && base[key] !== 0).concat(
    typeof base.dexterity === "number" ? ["dexterity"] : [],
  )
}

/** Compara o print com a base 100% e escolhe a curva normal ou a de boss. */
export function assess(input: {
  shown: StatMap
  base: StatMap
  level: number
  forge: Forge
  upgradable: boolean
  preferBoss?: boolean
}): Assessment | null {
  const level = input.upgradable ? resolveLevel(input.level, input.forge) : 1
  const keys = scalingKeys(input.shown, input.base)
  if (keys.length === 0) return null
  const normal = scoreCurve({ ...input, boss: false, level, keys })
  const boss = scoreCurve({ ...input, boss: true, level, keys })
  const chosen = chooseCurve(normal, boss, input.preferBoss ?? false)
  return {
    quality: chosen.quality,
    tier: qualityTier(chosen.quality),
    boss: chosen.boss,
    curvesAgree: normal.quality === boss.quality && normal.matches === boss.matches,
    level,
    coarse: keys.every((key) => COARSE_STATS.has(key)),
    lines: keys.map((key) =>
      buildLine({
        key,
        shown: input.shown[key] ?? 0,
        base: input.base[key] ?? 0,
        level,
        boss: chosen.boss,
        quality: chosen.quality,
      }),
    ),
    dexterity: dexterityCheck({ ...input, level, boss: chosen.boss }),
    projection: input.upgradable ? projection({ base: input.base, quality: chosen.quality, boss: chosen.boss }) : [],
  }
}
