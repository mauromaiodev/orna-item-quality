import type { QualityTier, MilestoneId } from "./quality"
import type { Lang, StatKey } from "./types"

type Copy = {
  title: string
  intro: string
  paste: string
  pasteAlt: string
  reading: string
  item: string
  itemPlaceholder: string
  noMatches: string
  loadingItems: string
  level: string
  forge: string
  forgeNone: string
  calculate: string
  calculating: string
  pickItem: string
  severalItems: string
  noScaling: string
  readFailed: string
  calcFailed: string
  missingKey: string
  geminiBusy: string
  imageTooBig: string
  noImage: string
  codexFailed: string
  levelAssumed: string
  coarse: string
  notUpgradable: string
  bossCurve: string
  bossSameAtLevel1: string
  bossFit: string
  normalFit: string
  projectionCaption: string
  statColumn: string
  codexLink: string
  savedTitle: string
  compare: (name: string) => string
  headline: (quality: number, tier: string) => string
  ratio: (label: string, shown: number, reference: number, percent: number) => string
  ratioMismatch: (label: string, shown: number, reference: number, percent: number) => string
  percentOk: (label: string, shown: number, quality: number, reference: number) => string
  percentBad: (label: string, shown: number, quality: number, predicted: number) => string
  dexOk: (label: string, shown: number) => string
  dexBad: (label: string, shown: number, predicted: number) => string
  tier: Record<QualityTier, string>
  stat: Record<StatKey, string>
  milestone: Record<MilestoneId, string>
}

const statPt: Record<StatKey, string> = {
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

const statEn: Record<StatKey, string> = {
  attack: "Attack",
  magic: "Magic",
  mana: "Mana",
  hp: "HP",
  defense: "Defense",
  resistance: "Resistance",
  dexterity: "Dexterity",
  ward: "Ward",
  crit: "Crit",
  foresight: "Foresight",
}

const copy: Record<Lang, Copy> = {
  pt: {
    title: "Qualidade do item no Orna",
    intro: "Cole o print do item. A conta usa a linha branca e a ficha 100% do Codex.",
    paste: "Ctrl+V, arraste ou clique",
    pasteAlt: "Print do item",
    reading: "Lendo o print…",
    item: "Item",
    itemPlaceholder: "Buscar item",
    noMatches: "Nenhum item com esse texto.",
    loadingItems: "Carregando itens do Codex…",
    level: "Nível",
    forge: "Aprimoramento",
    forgeNone: "Nenhum",
    calculate: "Calcular",
    calculating: "Calculando…",
    pickItem: "Escolha o item na lista.",
    severalItems: "Tem mais de um item parecido. Escolha na lista.",
    noScaling: "Informe um status que escale, como ataque, magia ou mana.",
    readFailed: "Falha ao ler a imagem.",
    calcFailed: "Falha ao calcular.",
    missingKey: "Defina GEMINI_API_KEY no arquivo .env.local.",
    geminiBusy: "O Gemini está congestionado. Tente de novo em instantes.",
    imageTooBig: "A imagem passou de 8 MB.",
    noImage: "Envie uma imagem do item.",
    codexFailed: "Não foi possível consultar o Codex.",
    levelAssumed:
      "O print não mostrou o nível. A conta usou o nível 1. Se o item já subiu no ferreiro, ajuste o nível e calcule de novo.",
    coarse: "Só a guarda ou a antevisão não fecham a porcentagem exata. Informe ataque, magia ou mana.",
    notUpgradable: "Acessório e adorno não sobem de nível. A conta usa o status base.",
    bossCurve: "A projeção usa a curva de boss, porque o item cai de chefe.",
    bossSameAtLevel1: " No nível 1 as duas curvas dão a mesma porcentagem.",
    bossFit: "Curva de boss: o incremento por nível é maior.",
    normalFit: "Curva normal: o incremento por nível é o de item comum.",
    projectionCaption: "Status desta qualidade no nível 10 e nas forjas",
    statColumn: "Status",
    codexLink: "Ficha no Codex",
    savedTitle: "Consultas salvas",
    compare: (name) =>
      `A porcentagem compara a linha branca com ${name} a 100% no mesmo nível. A linha de Anguish e os números entre parênteses ficam de fora.`,
    headline: (quality, tier) => `Esse item tem ${quality}% de qualidade ${tier}.`,
    ratio: (label, shown, reference, percent) => `${label}: ${shown} ÷ ${reference} = ${percent}%`,
    ratioMismatch: (label, shown, reference, percent) =>
      `${label}: ${shown} ÷ ${reference} = ${percent}% (não fecha com o restante)`,
    percentOk: (label, shown, quality, reference) =>
      `${label}: ${shown}% confere com ${quality}% (base ${reference}%)`,
    percentBad: (label, shown, quality, predicted) =>
      `${label}: ${shown}% não fecha; ${quality}% preveria ${predicted}%`,
    dexOk: (label, shown) => `${label}: ${shown} (não entra na qualidade)`,
    dexBad: (label, shown, predicted) =>
      `${label}: ${shown} no print; neste nível a fórmula espera ${predicted}`,
    tier: {
      broken: "Quebrado",
      poor: "Ruim",
      common: "Comum",
      superior: "Superior",
      famed: "Famoso",
      legendary: "Lendário",
      ornate: "Ornado",
    },
    stat: statPt,
    milestone: { level10: "Nível 10", master: "Masterforged", demon: "Demonforged", god: "Godforged" },
  },
  en: {
    title: "Orna item quality",
    intro: "Paste the item screenshot. The math uses the white stat line and the 100% Codex entry.",
    paste: "Ctrl+V, drop, or click",
    pasteAlt: "Item screenshot",
    reading: "Reading the screenshot…",
    item: "Item",
    itemPlaceholder: "Search item",
    noMatches: "No item matches that text.",
    loadingItems: "Loading Codex items…",
    level: "Level",
    forge: "Upgrade",
    forgeNone: "None",
    calculate: "Calculate",
    calculating: "Calculating…",
    pickItem: "Choose the item from the list.",
    severalItems: "More than one item looks similar. Pick it from the list.",
    noScaling: "Enter a stat that scales, such as attack, magic, or mana.",
    readFailed: "Could not read the image.",
    calcFailed: "Could not calculate.",
    missingKey: "Set GEMINI_API_KEY in .env.local.",
    geminiBusy: "Gemini is busy. Try again in a moment.",
    imageTooBig: "The image is over 8 MB.",
    noImage: "Send an item image.",
    codexFailed: "Could not reach the Codex.",
    levelAssumed:
      "The screenshot did not show the item level. The math used level 1. If it was upgraded, set the level and calculate again.",
    coarse: "Ward or foresight alone cannot pin the exact percent. Enter attack, magic, or mana.",
    notUpgradable: "Accessories and adornments do not gain levels. The math uses the base stats.",
    bossCurve: "The projection uses the boss curve, because this item drops from a boss.",
    bossSameAtLevel1: " At level 1 both curves give the same percent.",
    bossFit: "Boss curve: each level adds a larger step.",
    normalFit: "Normal curve: each level adds the regular step.",
    projectionCaption: "Stats for this quality at level 10 and at each forge",
    statColumn: "Stat",
    codexLink: "Codex entry",
    savedTitle: "Saved lookups",
    compare: (name) =>
      `The percent compares the white stats with ${name} at 100% on the same level. The Anguish line and the numbers in parentheses are left out.`,
    headline: (quality, tier) => `This item is ${quality}% ${tier} quality.`,
    ratio: (label, shown, reference, percent) => `${label}: ${shown} ÷ ${reference} = ${percent}%`,
    ratioMismatch: (label, shown, reference, percent) =>
      `${label}: ${shown} ÷ ${reference} = ${percent}% (does not match the rest)`,
    percentOk: (label, shown, quality, reference) =>
      `${label}: ${shown}% matches ${quality}% (base ${reference}%)`,
    percentBad: (label, shown, quality, predicted) =>
      `${label}: ${shown}% does not match; ${quality}% would be ${predicted}%`,
    dexOk: (label, shown) => `${label}: ${shown} (not part of quality)`,
    dexBad: (label, shown, predicted) =>
      `${label}: ${shown} on the screenshot; at this level the formula expects ${predicted}`,
    tier: {
      broken: "Broken",
      poor: "Poor",
      common: "Common",
      superior: "Superior",
      famed: "Famed",
      legendary: "Legendary",
      ornate: "Ornate",
    },
    stat: statEn,
    milestone: { level10: "Level 10", master: "Masterforged", demon: "Demonforged", god: "Godforged" },
  },
}

const STORAGE_KEY = "orna-qualidade-lang"

export type Messages = Copy

/** Textos da tela no idioma escolhido. */
export function messages(lang: Lang): Copy {
  return copy[lang]
}

/** Traduz o erro vindo da API para o idioma da tela. */
export function translateError(message: string, text: Copy): string {
  if (message.includes("GEMINI_API_KEY")) return text.missingKey
  if (/congestionado|high demand|try again later|unavailable/i.test(message)) return text.geminiBusy
  if (message.includes("8 MB")) return text.imageTooBig
  if (/imagem do item|send an item image/i.test(message)) return text.noImage
  if (/Codex/i.test(message)) return text.codexFailed
  if (/ler a imagem|read the image/i.test(message)) return text.readFailed
  return message
}

/** Idioma salvo, ou o do navegador na primeira visita. */
export function storedLang(): Lang {
  if (typeof window === "undefined") return "pt"
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === "en" || saved === "pt") return saved
  return window.navigator.language.toLowerCase().startsWith("en") ? "en" : "pt"
}

/** Guarda o idioma e atualiza a tag html. */
export function persistLang(lang: Lang): void {
  window.localStorage.setItem(STORAGE_KEY, lang)
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en"
}
