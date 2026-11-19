import type { CodexItem, Forge, StatKey, StatMap } from "./types"

const STAT_KEYS: StatKey[] = [
  "hp",
  "mana",
  "attack",
  "magic",
  "defense",
  "resistance",
  "dexterity",
  "ward",
  "crit",
  "foresight",
]

export const FRESH_MS = 24 * 60 * 60 * 1000

export type SharePayload = {
  item: CodexItem
  shown: StatMap
  level: number
  forge: Forge
  assumed: boolean
  at: number
}

/** A ficha ainda vale e a consulta pode abrir sem chamar o Codex. */
export function isFresh(at: number, now = Date.now()): boolean {
  return Number.isFinite(at) && now >= at && now - at < FRESH_MS
}

/** Monta a query do link que outro usuário abre. */
export function shareSearch(payload: SharePayload): string {
  return `?s=${encodeURIComponent(encodeShare(payload))}`
}

/** Lê a consulta gravada no link. */
export function readShare(search: string): SharePayload | null {
  const raw = new URLSearchParams(search).get("s")
  if (!raw || raw.length > 6000) return null
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(raw))
    return parseShare(JSON.parse(json))
  } catch {
    return null
  }
}

function encodeShare(payload: SharePayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function parseShare(value: unknown): SharePayload | null {
  if (!isRecord(value)) return null
  const item = parseItem(value.item)
  const shown = parseStats(value.shown)
  if (!item || !shown || !isForge(value.forge)) return null
  if (typeof value.level !== "number" || typeof value.at !== "number") return null
  return {
    item,
    shown,
    level: value.level,
    forge: value.forge,
    assumed: value.assumed === true,
    at: value.at,
  }
}

function parseItem(value: unknown): CodexItem | null {
  if (!isRecord(value) || typeof value.name !== "string") return null
  if (typeof value.url !== "string" || !value.url.startsWith("/codex/items/")) return null
  const stats = parseStats(value.stats)
  if (!stats) return null
  return {
    name: value.name,
    url: value.url,
    place: typeof value.place === "string" ? value.place : null,
    upgradable: value.upgradable !== false,
    bossLikely: value.bossLikely === true,
    stats,
  }
}

function parseStats(value: unknown): StatMap | null {
  if (!isRecord(value)) return null
  const stats: StatMap = {}
  for (const key of STAT_KEYS) {
    const stat = value[key]
    if (stat === undefined) continue
    if (typeof stat !== "number" || !Number.isFinite(stat)) return null
    stats[key] = stat
  }
  return stats
}

function isForge(value: unknown): value is Forge {
  return value === "none" || value === "master" || value === "demon" || value === "god"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
