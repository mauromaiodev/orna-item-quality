import { cleanItemName, forgeFromName } from "./item-name"
import { STAT_FIELDS } from "./stats"
import type { Forge, Lang, ReadItem, StatKey, StatMap } from "./types"

const FREE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
]

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  error?: { message?: string }
}

type GeminiAttempt = { ok: true; raw: RawRead } | { ok: false; status: number; message: string }

type RawRead = {
  name?: unknown
  level?: unknown
  forge?: unknown
  language?: unknown
  stats?: unknown
}

type RaceState = {
  pending: number
  lastMessage: string
  empty: ReadItem | null
  settled: boolean
}

/** Lê nome, nível, forja e a linha branca de status a partir do print. */
export async function readItemImage(input: { data: string; mimeType: string }): Promise<ReadItem> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error("Defina GEMINI_API_KEY no arquivo .env.local.")
  return raceModels({ ...input, key })
}

/** Dispara os modelos juntos e devolve a primeira leitura que achou o item. */
function raceModels(input: { data: string; mimeType: string; key: string }): Promise<ReadItem> {
  const models = modelsToTry()
  const controllers = models.map(() => new AbortController())
  const timers = controllers.map((controller) => setTimeout(() => controller.abort(), 30_000))
  const stop = () => {
    timers.forEach(clearTimeout)
    controllers.forEach((controller) => controller.abort())
  }
  return new Promise((resolve, reject) => {
    const state: RaceState = {
      pending: models.length,
      lastMessage: "O Gemini não respondeu.",
      empty: null,
      settled: false,
    }
    models.forEach((model, index) => {
      requestGemini({ ...input, model, signal: controllers[index].signal })
        .then((attempt) => settleAttempt(state, attempt, stop, resolve, reject))
        .catch((reason: unknown) => settleThrow(state, reason, stop, resolve, reject))
    })
  })
}

function settleAttempt(
  state: RaceState,
  attempt: GeminiAttempt,
  stop: () => void,
  resolve: (read: ReadItem) => void,
  reject: (error: Error) => void,
) {
  if (state.settled) return
  if (attempt.ok) return keepRead(state, normalizeRead(attempt.raw), stop, resolve, reject)
  if (!canTryAnother(attempt.status, attempt.message)) return closeError(state, stop, reject, attempt.message)
  state.lastMessage = attempt.message
  noteFinished(state, stop, resolve, reject)
}

function keepRead(
  state: RaceState,
  read: ReadItem,
  stop: () => void,
  resolve: (read: ReadItem) => void,
  reject: (error: Error) => void,
) {
  if (isUseful(read)) return closeRead(state, stop, resolve, read)
  state.empty = read
  noteFinished(state, stop, resolve, reject)
}

function settleThrow(
  state: RaceState,
  reason: unknown,
  stop: () => void,
  resolve: (read: ReadItem) => void,
  reject: (error: Error) => void,
) {
  if (state.settled) return
  if (!isAbort(reason)) state.lastMessage = messageFrom(reason, state.lastMessage)
  else if (state.lastMessage === "O Gemini não respondeu.") state.lastMessage = busyMessage("high demand")
  noteFinished(state, stop, resolve, reject)
}

function noteFinished(
  state: RaceState,
  stop: () => void,
  resolve: (read: ReadItem) => void,
  reject: (error: Error) => void,
) {
  state.pending -= 1
  if (state.pending > 0) return
  if (state.empty) closeRead(state, stop, resolve, state.empty)
  else closeError(state, stop, reject, busyMessage(state.lastMessage))
}

function closeRead(state: RaceState, stop: () => void, resolve: (read: ReadItem) => void, read: ReadItem) {
  state.settled = true
  stop()
  resolve(read)
}

function closeError(state: RaceState, stop: () => void, reject: (error: Error) => void, message: string) {
  state.settled = true
  stop()
  reject(new Error(message))
}

function isUseful(read: ReadItem): boolean {
  return read.name.length > 0 || Object.keys(read.stats).length > 0
}

function isAbort(reason: unknown): boolean {
  return reason instanceof Error && reason.name === "AbortError"
}

function messageFrom(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback
}

function modelsToTry(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim()
  const models = preferred ? [preferred, ...FREE_MODELS] : FREE_MODELS
  return [...new Set(models)]
}

function canTryAnother(status: number, message: string): boolean {
  if (/api key|unauthenticated|permission/i.test(message)) return false
  if (status === 404 || status === 429 || status === 500 || status === 503) return true
  return /high demand|try again later|unavailable|overloaded|resource exhausted|not found|not supported|não devolveu JSON/i.test(
    message,
  )
}

function busyMessage(message: string): string {
  if (/high demand|try again later|unavailable|overloaded|congest/i.test(message)) {
    return "O Gemini está congestionado. Tente de novo em instantes."
  }
  return message
}

async function requestGemini(input: {
  data: string
  mimeType: string
  key: string
  model: string
  signal: AbortSignal
}): Promise<GeminiAttempt> {
  const response = await fetch(geminiUrl(input.model), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": input.key,
    },
    body: JSON.stringify(geminiBody(input)),
    signal: input.signal,
  })
  const body = (await response.json().catch(() => ({}))) as GeminiResponse
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: body.error?.message ?? `O Gemini respondeu ${response.status}.`,
    }
  }
  try {
    return { ok: true, raw: parseModelJson(textFrom(body)) }
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "A leitura falhou."
    return { ok: false, status: 502, message }
  }
}

function geminiUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
}

function geminiBody(input: { data: string; mimeType: string }) {
  return {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: input.mimeType, data: input.data } },
          { text: PROMPT },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  }
}

function textFrom(body: GeminiResponse): string {
  const parts = body.candidates?.[0]?.content?.parts ?? []
  return parts.map((part) => part.text ?? "").join("")
}

function parseModelJson(text: string): RawRead {
  const trimmed = text.trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start < 0 || end < start) throw new Error("A leitura não devolveu JSON.")
  return JSON.parse(trimmed.slice(start, end + 1)) as RawRead
}

function normalizeRead(raw: RawRead): ReadItem {
  const original = typeof raw.name === "string" ? raw.name : ""
  const forge = readForge(raw.forge, original)
  return {
    name: cleanItemName(original),
    level: readLevel(raw.level),
    forge,
    language: readLanguage(raw.language),
    stats: readStats(raw.stats),
  }
}

function readForge(value: unknown, name: string): Forge {
  if (value === "master" || value === "demon" || value === "god") return value
  return forgeFromName(name)
}

function readLanguage(value: unknown): Lang | null {
  if (typeof value !== "string") return null
  const text = value.toLowerCase()
  if (text.startsWith("pt")) return "pt"
  if (text.startsWith("en")) return "en"
  return null
}

function readLevel(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  const level = Math.round(value)
  if (level < 1 || level > 10) return null
  return level
}

function readStats(value: unknown): StatMap {
  if (!value || typeof value !== "object") return {}
  const source = value as Record<string, unknown>
  const stats: StatMap = {}
  for (const key of STAT_FIELDS) {
    const parsed = readStat(source[key])
    if (parsed !== null) stats[key as StatKey] = parsed
  }
  return stats
}

function readStat(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return value
}

const PROMPT = `Leia o print de um item do jogo Orna. Responda só JSON:
{
  "name": "nome base do item, sem palavra de qualidade ou forja",
  "level": 1,
  "forge": "none",
  "language": "pt",
  "stats": {
    "attack": null,
    "magic": null,
    "mana": null,
    "hp": null,
    "defense": null,
    "resistance": null,
    "dexterity": null,
    "ward": null,
    "crit": null,
    "foresight": null
  }
}
Regras:
- language é "pt" se a interface do print estiver em português (Atq, Guarda, Ornado, Destreza, Nível) e "en" se estiver em inglês (Atk, Ward, Ornate, Dexterity, Level). Se não der para saber, null.
- Use somente a primeira linha de status, a branca. Ignore a linha colorida de Anguish.
- Ignore números entre parênteses, como (+70). Eles comparam com o item equipado.
- Anguished N não é o nível do item. level é o nível do item de 1 a 10, ou null se não aparecer.
- Guarda, Ward e Crítico são a porcentagem inteira (4, não 0.04).
- Mapeie Atq/Ataque/Atk/Attack=attack, Mag/Magia/Magic=magic, Mana=mana, Des/Destreza/Dex/Dexterity=dexterity, Def/Defesa/Defense=defense, Res/Resistência/Resistance=resistance, HP/Vida=hp, Guarda/Ward=ward, Crítico/Crit=crit.
- forge: master para Masterforged/Masterforjado, demon para Demonforged/Demonforjado, god para Godforged/Godforjado, senão none.
- Tire do nome: Ornado, Ornate, Lendário, Legendary, Famoso, Famed, Superior, Comum, Common, Ruim, Poor, Quebrado, Broken e as palavras de forja.`
