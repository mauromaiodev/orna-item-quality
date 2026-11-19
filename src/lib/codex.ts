import { cleanItemName } from "./item-name"
import { statFromLabel } from "./stats"
import type { CatalogItem, CodexCandidate, CodexItem, CodexResponse, StatMap } from "./types"

const CODEX_ORIGIN = "https://playorna.com"

type CodexCard = {
  name?: string
  url?: string
}

type CodexFact = {
  label?: string
  value?: string
}

type CodexSection = {
  title?: string
  entries?: { category?: string }[]
}

type CodexDetail = {
  name?: string
  url?: string
  arisen?: boolean
  facts?: CodexFact[]
  sections?: CodexSection[]
}

type CodexBootstrap = {
  results?: CodexCard[]
  pages?: number
  detail?: CodexDetail | null
}

/** Busca a ficha 100% do item no Codex oficial. */
export async function findCodexItem(name: string): Promise<CodexResponse> {
  const query = cleanItemName(name)
  if (!query) return { item: null, candidates: [] }
  const cards = await searchCards(query)
  const chosen = pickCard(cards, query)
  if (!chosen?.url) return { item: null, candidates: toCandidates(cards) }
  const item = await readItem(chosen.url, chosen.name ?? query)
  return { item, candidates: item ? [] : toCandidates(cards) }
}

/** Abre a ficha pelo caminho já escolhido na lista. */
export async function findCodexItemByUrl(url: string): Promise<CodexItem | null> {
  if (!url.startsWith("/codex/items/")) return null
  return readItem(url, url)
}

let catalogRequest: Promise<CatalogItem[]> | null = null

/** Lista todos os itens do Codex, uma vez por processo. */
export function listCatalog(): Promise<CatalogItem[]> {
  catalogRequest ??= loadCatalog().catch((error: unknown) => {
    catalogRequest = null
    throw error
  })
  return catalogRequest
}

async function loadCatalog(): Promise<CatalogItem[]> {
  const first = await fetchCatalogPage(1)
  const pages = Array.from({ length: Math.max(0, first.pages - 1) }, (_, index) => index + 2)
  const rest = await mapInBatches(pages, 8, fetchCatalogPage)
  return [first, ...rest]
    .flatMap((page) => page.items)
    .sort((left, right) => left.name.localeCompare(right.name))
}

async function fetchCatalogPage(page: number): Promise<{ pages: number; items: CatalogItem[] }> {
  const data = readBootstrap(await fetchHtml(`${CODEX_ORIGIN}/codex/items/?p=${page}`))
  return { pages: data?.pages ?? 1, items: toCandidates(data?.results ?? []) }
}

async function mapInBatches<T, R>(items: T[], size: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  for (let index = 0; index < items.length; index += size) {
    const batch = await Promise.all(items.slice(index, index + size).map(task))
    results.push(...batch)
  }
  return results
}

async function searchCards(query: string): Promise<CodexCard[]> {
  const page = await fetchHtml(`${CODEX_ORIGIN}/codex/items/?q=${encodeURIComponent(query)}`)
  return readBootstrap(page)?.results ?? []
}

function pickCard(cards: CodexCard[], query: string): CodexCard | null {
  const exact = cards.filter((card) => card.name?.toLowerCase() === query.toLowerCase())
  if (exact.length === 1) return exact[0]
  if (cards.length === 1) return cards[0]
  return null
}

function toCandidates(cards: CodexCard[]): CodexCandidate[] {
  return cards.flatMap((card) =>
    card.name && card.url ? [{ name: card.name, url: card.url }] : [],
  )
}

async function readItem(url: string, fallbackName: string): Promise<CodexItem | null> {
  const page = await fetchHtml(`${CODEX_ORIGIN}${url}`)
  const detail = readBootstrap(page)?.detail
  if (!detail?.facts) return null
  const stats = readStats(detail.facts)
  const place = readPlace(detail.facts)
  return {
    name: detail.name ?? fallbackName,
    url,
    place,
    upgradable: isUpgradable(place),
    bossLikely: usesBossCurve(detail),
    stats,
  }
}

function usesBossCurve(detail: CodexDetail): boolean {
  if (detail.arisen) return true
  const dropped = detail.sections?.find((section) => /dropped by|derrubado/i.test(section.title ?? ""))
  return dropped?.entries?.some((entry) => entry.category === "bosses" || entry.category === "raids") ?? false
}

function readStats(facts: CodexFact[]): StatMap {
  const stats: StatMap = {}
  for (const fact of facts) {
    const key = statFromLabel(fact.label ?? "")
    const value = parseFactValue(fact.value ?? "")
    if (key && value !== null) stats[key] = value
  }
  return stats
}

function readPlace(facts: CodexFact[]): string | null {
  const place = facts.find((fact) => /^(place|lugar)$/i.test(fact.label ?? ""))
  return place?.value ?? null
}

function isUpgradable(place: string | null): boolean {
  if (!place) return true
  return !/accessory|adornment|acessório|acessorio|adorno/i.test(place)
}

function parseFactValue(value: string): number | null {
  const match = value.match(/-?\d+(\.\d+)?/)
  if (!match) return null
  return Number(match[0])
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { Accept: "text/html", "User-Agent": "orna-qualidade" },
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`O Codex respondeu ${response.status}.`)
  return response.text()
}

function readBootstrap(html: string): CodexBootstrap | null {
  const match = html.match(
    /<script id="codex-bootstrap" type="application\/json">([\s\S]*?)<\/script>/,
  )
  if (!match) return null
  return JSON.parse(match[1]) as CodexBootstrap
}
