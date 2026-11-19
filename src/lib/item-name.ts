import type { Forge } from "@/lib/types"

const QUALITY_WORD =
  /^(ornado|ornate|lendário|lendario|legendary|famoso|famed|superior|comum|common|ruim|poor|pobre|quebrado|broken|masterforjado|masterforged|demonforjado|demonforged|godforjado|godforged)$/i

/** Tira do nome as palavras de qualidade e de forja, no começo ou no fim. */
export function cleanItemName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  while (parts.length > 1 && QUALITY_WORD.test(parts[0])) parts.shift()
  while (parts.length > 1 && QUALITY_WORD.test(parts[parts.length - 1])) parts.pop()
  return parts.join(" ")
}

/** Lê Masterforged, Demonforged ou Godforged no nome do item. */
export function forgeFromName(name: string): Forge {
  if (/godforged|godforjado/i.test(name)) return "god"
  if (/demonforged|demonforjado/i.test(name)) return "demon"
  if (/masterforged|masterforjado/i.test(name)) return "master"
  return "none"
}
