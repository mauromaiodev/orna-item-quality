"use client"

import { useEffect, useRef, useState } from "react"
import { ItemSelect } from "@/components/item-select"
import { LoadingOverlay } from "@/components/loading-overlay"
import { ResultPanel } from "@/components/result-panel"
import { SavedLookups } from "@/components/saved-lookups"
import {
  emptyFields,
  fetchCatalog,
  fetchCodex,
  fetchCodexByUrl,
  fieldsFromStats,
  fileToDataUrl,
  readImage,
  statsFromFields,
} from "@/lib/form"
import {
  forgetLookup,
  readLookups,
  rememberLookup,
  writeLookups,
  type LookupDraft,
  type SavedLookup,
} from "@/lib/history"
import { isFresh, readShare, shareSearch, type SharePayload } from "@/lib/share"
import { messages, persistLang, storedLang, translateError, type Messages } from "@/lib/i18n"
import { matchCatalog } from "@/lib/match-item"
import { assess, type Assessment } from "@/lib/quality"
import { STAT_FIELDS } from "@/lib/stats"
import type { CatalogItem, CodexItem, Forge, Lang, ReadItem, StatKey } from "@/lib/types"

/** Tela para colar o print, escolher o item e ver a qualidade. */
export function QualityApp() {
  const [lang, setLang] = useState<Lang>("pt")
  const [preview, setPreview] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [query, setQuery] = useState("")
  const [selectedUrl, setSelectedUrl] = useState("")
  const [level, setLevel] = useState("1")
  const [levelAssumed, setLevelAssumed] = useState(false)
  const [forge, setForge] = useState<Forge>("none")
  const [fields, setFields] = useState(emptyFields)
  const [item, setItem] = useState<CodexItem | null>(null)
  const [result, setResult] = useState<Assessment | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<"read" | "calc" | "list" | null>("list")
  const [scrollToken, setScrollToken] = useState(0)
  const [saved, setSaved] = useState<SavedLookup[]>([])
  const [copied, setCopied] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const savedRef = useRef<SavedLookup[]>([])
  const outcomeRef = useRef<HTMLElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollStop = useRef<() => void>(() => {})
  const acceptRef = useRef<(file: File) => void>(() => {})
  const text = messages(lang)

  useEffect(() => {
    const initial = storedLang()
    const loaded = readLookups()
    savedRef.current = loaded
    setSaved(loaded)
    setLang(initial)
    persistLang(initial)
    const shared = readShare(window.location.search)
    if (shared) openShared(shared, messages(initial))
    void fetchCatalog()
      .then(setCatalog)
      .catch((reason: unknown) => setMessage(errorText(reason, messages(initial))))
      .finally(() => setBusy(null))
  }, [])

  useEffect(() => {
    if (busy !== null || scrollToken === 0) return
    const element = outcomeRef.current
    if (!element) return
    const frame = requestAnimationFrame(() => {
      scrollStop.current = scrollToResult(element)
    })
    return () => cancelAnimationFrame(frame)
  }, [busy, scrollToken])

  useEffect(() => {
    function onScroll() {
      const next = window.scrollY > 320
      setShowTop((current) => (current === next ? current : next))
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const file = imageFile(event.clipboardData?.files)
      if (!file) return
      event.preventDefault()
      acceptRef.current(file)
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [])

  acceptRef.current = (file) => {
    void acceptFile(file)
  }

  async function acceptFile(file: File) {
    setBusy("read")
    setMessage(null)
    setResult(null)
    try {
      const dataUrl = await fileToDataUrl(file)
      setPreview(dataUrl)
      const read = await readImage(dataUrl, file.type || "image/png")
      const nextLang = read.language ?? lang
      if (read.language) chooseLang(read.language)
      applyRead(read)
      const items = catalog.length > 0 ? catalog : await fetchCatalog().then((loaded) => {
        setCatalog(loaded)
        return loaded
      })
      await resolveRead(read, nextLang, items)
    } catch (reason) {
      setMessage(errorText(reason, text))
      setScrollToken((token) => token + 1)
    } finally {
      setBusy((current) => (current === "read" ? null : current))
    }
  }

  function applyRead(read: ReadItem) {
    setForge(read.forge)
    setLevel(String(read.level ?? 1))
    setLevelAssumed(read.level === null && read.forge === "none")
    setFields(fieldsFromStats(read.stats))
  }

  async function resolveRead(read: ReadItem, active: Lang, items: CatalogItem[]) {
    const known = matchCatalog(read.name, items)
    if (known) {
      setQuery(known.name)
      setSelectedUrl(known.url)
      await solve(known.url, read.stats, read.level ?? 1, read.forge, read.level === null, messages(active))
      return
    }
    const found = await fetchCodex(read.name)
    if (found.item) {
      setQuery(found.item.name)
      setSelectedUrl(found.item.url)
      publish(found.item, read.stats, read.level ?? 1, read.forge, read.level === null, messages(active))
      return
    }
    setQuery(read.name)
    setSelectedUrl("")
    setMessage(found.candidates.length > 0 ? messages(active).severalItems : messages(active).pickItem)
    setScrollToken((token) => token + 1)
  }

  async function calculate() {
    const active = messages(lang)
    if (!selectedUrl) {
      setMessage(active.pickItem)
      return
    }
    setBusy("calc")
    setMessage(null)
    setLevelAssumed(false)
    try {
      await solve(selectedUrl, statsFromFields(fields), Number(level), forge, false, active)
    } catch (reason) {
      setMessage(errorText(reason, active))
      setScrollToken((token) => token + 1)
    } finally {
      setBusy((current) => (current === "calc" ? null : current))
    }
  }

  async function solve(
    url: string,
    shown: ReadItem["stats"],
    itemLevel: number,
    itemForge: Forge,
    assumed: boolean,
    active: Messages,
  ) {
    const found = await fetchCodexByUrl(url)
    if (!found.item) {
      setItem(null)
      setResult(null)
      setMessage(active.pickItem)
      return
    }
    publish(found.item, shown, itemLevel, itemForge, assumed, active)
  }

  function publish(
    codex: CodexItem,
    shown: ReadItem["stats"],
    itemLevel: number,
    itemForge: Forge,
    assumed: boolean,
    active: Messages,
    sharedAt?: number,
  ) {
    const next = assess({
      shown,
      base: codex.stats,
      level: itemLevel,
      forge: itemForge,
      upgradable: codex.upgradable,
      preferBoss: codex.bossLikely,
    })
    setItem(codex)
    if (!next) {
      setResult(null)
      setMessage(active.noScaling)
      setScrollToken((token) => token + 1)
      return
    }
    const assumedLevel = assumed && itemForge === "none"
    setLevelAssumed(assumedLevel)
    setResult(next)
    setMessage(null)
    storeLookup({
      item: codex,
      shown,
      level: itemLevel,
      forge: itemForge,
      levelAssumed: assumedLevel,
      result: next,
    })
    writeShareUrl({
      item: codex,
      shown,
      level: itemLevel,
      forge: itemForge,
      assumed: assumedLevel,
      at: sharedAt ?? Date.now(),
    })
    setScrollToken((token) => token + 1)
  }

  function openShared(payload: SharePayload, active: Messages) {
    setQuery(payload.item.name)
    setSelectedUrl(payload.item.url)
    setLevel(String(payload.level))
    setForge(payload.forge)
    setFields(fieldsFromStats(payload.shown))
    publish(payload.item, payload.shown, payload.level, payload.forge, payload.assumed, active, payload.at)
    if (isFresh(payload.at)) return
    void refreshShared(payload, active)
  }

  async function refreshShared(payload: SharePayload, active: Messages) {
    try {
      const found = await fetchCodexByUrl(payload.item.url)
      if (!found.item) return
      publish(found.item, payload.shown, payload.level, payload.forge, payload.assumed, active)
    } catch {
      return
    }
  }

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setMessage(text.shareFailed)
    }
  }

  function removeSaved(id: string) {
    const next = forgetLookup(savedRef.current, id)
    savedRef.current = next
    writeLookups(next)
    setSaved(next)
  }

  function storeLookup(draft: LookupDraft) {
    const next = rememberLookup(savedRef.current, draft)
    savedRef.current = next
    writeLookups(next)
    setSaved(next)
  }

  function openSaved(entry: SavedLookup) {
    setQuery(entry.item.name)
    setSelectedUrl(entry.item.url)
    setLevel(String(entry.level))
    setForge(entry.forge)
    setLevelAssumed(entry.levelAssumed)
    setFields(fieldsFromStats(entry.shown))
    setItem(entry.item)
    setResult(entry.result)
    setMessage(null)
    writeShareUrl({
      item: entry.item,
      shown: entry.shown,
      level: entry.level,
      forge: entry.forge,
      assumed: entry.levelAssumed,
      at: entry.savedAt,
    })
    setScrollToken((token) => token + 1)
  }

  function chooseLang(next: Lang) {
    setLang(next)
    persistLang(next)
  }

  function clearForm() {
    setPreview(null)
    setQuery("")
    setSelectedUrl("")
    setLevel("1")
    setLevelAssumed(false)
    setForge("none")
    setFields(emptyFields())
    setItem(null)
    setResult(null)
    setMessage(null)
    setCopied(false)
    if (fileRef.current) fileRef.current.value = ""
    forgetShare()
  }

  function backToTop() {
    scrollStop.current = scrollLinear(0)
  }

  function changeField(key: StatKey, value: string) {
    setFields((current) => ({ ...current, [key]: value }))
    setResult(null)
    forgetShare()
  }

  const forged = forge !== "none"

  return (
    <>
    <nav className="nav">
      <p className="wordmark">Orna <span>Codex</span></p>
      <div className="langs" role="group" aria-label="Language">
        <button type="button" className="nav-item" aria-pressed={lang === "pt"} onClick={() => chooseLang("pt")}>
          Português
        </button>
        <button type="button" className="nav-item" aria-pressed={lang === "en"} onClick={() => chooseLang("en")}>
          English
        </button>
      </div>
    </nav>
    <main className="page" aria-busy={busy !== null}>
      <header className="heading">
        <p className="eyebrow">Orna</p>
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </header>
      <label
        className="drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          const file = imageFile(event.dataTransfer.files)
          if (file) void acceptFile(file)
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void acceptFile(file)
          }}
        />
        {preview ? <img src={preview} alt={text.pasteAlt} /> : <span>{text.paste}</span>}
      </label>
      {busy ? <LoadingOverlay label={busyLabel(busy, text)} /> : null}
      <SavedLookups items={saved} text={text} onOpen={openSaved} onRemove={removeSaved} />
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          void calculate()
        }}
      >
        <label>
          {text.item}
          <ItemSelect
            items={catalog}
            query={query}
            disabled={busy === "list"}
            placeholder={busy === "list" ? text.loadingItems : text.itemPlaceholder}
            emptyLabel={text.noMatches}
            onQuery={(value) => {
              setQuery(value)
              setSelectedUrl("")
              setResult(null)
              forgetShare()
            }}
            onPick={(picked) => {
              setQuery(picked.name)
              setSelectedUrl(picked.url)
              setResult(null)
              forgetShare()
            }}
          />
        </label>
        <label>
          {text.level}
          <input
            type="number"
            min={1}
            max={10}
            value={level}
            disabled={forged || item?.upgradable === false}
            onChange={(event) => {
              setLevel(event.target.value)
              setLevelAssumed(false)
              setResult(null)
              forgetShare()
            }}
          />
        </label>
        <label>
          {text.forge}
          <select
            value={forge}
            disabled={item?.upgradable === false}
            onChange={(event) => {
              setForge(event.target.value as Forge)
              setResult(null)
              forgetShare()
            }}
          >
            <option value="none">{text.forgeNone}</option>
            <option value="master">Masterforged</option>
            <option value="demon">Demonforged</option>
            <option value="god">Godforged</option>
          </select>
        </label>
        <div className="stats">
          {STAT_FIELDS.map((key) => (
            <label key={key}>
              {text.stat[key]}
              <input
                inputMode="decimal"
                value={fields[key]}
                onChange={(event) => changeField(key, event.target.value)}
              />
            </label>
          ))}
        </div>
        <div className="actions">
          <button className="button-cta" type="submit" disabled={busy !== null}>
            {busy === "calc" ? <span className="spinner spinner-small" aria-hidden="true" /> : null}
            {busy === "calc" ? text.calculating : text.calculate}
          </button>
          <button className="button-quiet" type="button" onClick={clearForm} disabled={busy !== null}>
            {text.clear}
          </button>
        </div>
      </form>
      <section ref={outcomeRef} className="outcome">
        {message ? <p className="warn">{message}</p> : null}
        {result && item ? (
          <ResultPanel
            result={result}
            item={item}
            levelAssumed={levelAssumed}
            text={text}
            copied={copied}
            onShare={() => void copyShare()}
          />
        ) : null}
      </section>
    </main>
    {showTop ? (
      <button className="to-top" type="button" onClick={backToTop}>
        {text.backToTop}
      </button>
    ) : null}
    </>
  )
}

let scrollRun = 0

/** Desce ou sobe em linha reta até a posição pedida. */
function scrollLinear(destination: number): () => void {
  const run = ++scrollRun
  const root = document.documentElement
  const previous = root.style.scrollBehavior
  root.style.scrollBehavior = "auto"
  const start = window.scrollY
  const distance = destination - start
  const restore = () => {
    if (run === scrollRun) root.style.scrollBehavior = previous
  }
  if (Math.abs(distance) < 2) {
    restore()
    return () => undefined
  }
  const duration = Math.min(1600, Math.max(1100, Math.abs(distance)))
  let started = 0
  let frame = 0
  const step = (now: number) => {
    if (run !== scrollRun) return
    if (started === 0) started = now
    const progress = Math.min(1, (now - started) / duration)
    root.scrollTop = start + distance * progress
    if (progress < 1) frame = requestAnimationFrame(step)
    else restore()
  }
  frame = requestAnimationFrame(step)
  return () => {
    if (run !== scrollRun) return
    scrollRun += 1
    cancelAnimationFrame(frame)
    restore()
  }
}

/** Leva o resultado para baixo do menu, com o botão de calcular fora da tela. */
function scrollToResult(element: HTMLElement): () => void {
  const navHeight = document.querySelector(".nav")?.getBoundingClientRect().height ?? 0
  const destination = Math.max(0, window.scrollY + element.getBoundingClientRect().top - navHeight)
  return scrollLinear(destination)
}

function writeShareUrl(payload: SharePayload) {
  const next = `${window.location.pathname}${shareSearch(payload)}`
  if (`${window.location.pathname}${window.location.search}` === next) return
  window.history.replaceState(null, "", next)
}

function forgetShare() {
  if (!window.location.search.includes("s=")) return
  window.history.replaceState(null, "", window.location.pathname)
}

function busyLabel(busy: "read" | "calc" | "list", text: Messages): string {
  if (busy === "read") return text.reading
  if (busy === "calc") return text.calculating
  return text.loadingItems
}

function errorText(reason: unknown, text: Messages): string {
  const message = reason instanceof Error ? reason.message : text.calcFailed
  return translateError(message, text)
}

function imageFile(files: FileList | undefined): File | null {
  return [...(files ?? [])].find((file) => file.type.startsWith("image/")) ?? null
}
