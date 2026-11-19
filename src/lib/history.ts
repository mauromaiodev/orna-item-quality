import type { Assessment } from "./quality"
import type { CodexItem, Forge, StatMap } from "./types"

const STORAGE_KEY = "orna-qualidade-lookups"
const LIMIT = 20

export type SavedLookup = {
  id: string
  savedAt: number
  item: CodexItem
  shown: StatMap
  level: number
  forge: Forge
  levelAssumed: boolean
  result: Assessment
}

export type LookupDraft = Omit<SavedLookup, "id" | "savedAt">

/** Guarda a consulta que deu resultado e substitui a mesma conta. */
export function rememberLookup(current: SavedLookup[], draft: LookupDraft, savedAt = Date.now()): SavedLookup[] {
  const next = { ...draft, id: lookupId(draft), savedAt }
  return [next, ...current.filter((item) => item.id !== next.id)].slice(0, LIMIT)
}

/** Lê as consultas salvas e ignora o que não for uma conta válida. */
export function readLookups(): SavedLookup[] {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isLookup).slice(0, LIMIT)
  } catch {
    return []
  }
}

/** Persiste a lista de consultas no navegador. */
export function writeLookups(items: SavedLookup[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    return
  }
}

function lookupId(draft: LookupDraft): string {
  const stats = Object.entries(draft.shown)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join(",")
  return [draft.item.url, draft.level, draft.forge, stats].join("|")
}

function isLookup(value: unknown): value is SavedLookup {
  if (!value || typeof value !== "object") return false
  const row = value as SavedLookup
  return typeof row.id === "string" && typeof row.item?.url === "string" && typeof row.result?.quality === "number"
}
