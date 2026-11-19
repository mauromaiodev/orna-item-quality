import { STAT_FIELDS } from "./stats"
import type { CatalogItem, CodexResponse, ReadItem, StatKey, StatMap } from "./types"

/** Envia o print para a rota que chama o Gemini. */
export async function readImage(dataUrl: string, mimeType: string): Promise<ReadItem> {
  const response = await fetch("/api/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: dataUrl.split(",")[1] ?? "", mimeType }),
  })
  return readJson<ReadItem>(response, "Falha ao ler a imagem.")
}

/** Busca a ficha 100% do item no Codex. */
export async function fetchCodex(name: string): Promise<CodexResponse> {
  const response = await fetch(`/api/codex?name=${encodeURIComponent(name)}`)
  return readJson<CodexResponse>(response, "Falha ao consultar o Codex.")
}

/** Abre a ficha do item escolhido na lista. */
export async function fetchCodexByUrl(url: string): Promise<CodexResponse> {
  const response = await fetch(`/api/codex?url=${encodeURIComponent(url)}`)
  return readJson<CodexResponse>(response, "Falha ao consultar o Codex.")
}

/** Carrega o nome de todos os itens do Codex. */
export async function fetchCatalog(): Promise<CatalogItem[]> {
  const response = await fetch("/api/catalog")
  const body = await readJson<{ items: CatalogItem[] }>(response, "Falha ao consultar o Codex.")
  return body.items
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const body = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? fallback)
  return body
}

/** Converte os campos da tela em números, ignorando o que ficou vazio. */
export function statsFromFields(fields: Record<StatKey, string>): StatMap {
  const stats: StatMap = {}
  for (const key of STAT_FIELDS) {
    const raw = fields[key].trim().replace(",", ".")
    if (!raw) continue
    const value = Number(raw)
    if (Number.isFinite(value)) stats[key] = value
  }
  return stats
}

/** Preenche os campos da tela com os números lidos do print. */
export function fieldsFromStats(stats: StatMap): Record<StatKey, string> {
  const fields = emptyFields()
  for (const key of STAT_FIELDS) {
    const value = stats[key]
    if (typeof value === "number") fields[key] = String(value)
  }
  return fields
}

export function emptyFields(): Record<StatKey, string> {
  return {
    attack: "",
    magic: "",
    mana: "",
    hp: "",
    defense: "",
    resistance: "",
    dexterity: "",
    ward: "",
    crit: "",
    foresight: "",
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."))
    reader.readAsDataURL(file)
  })
}
