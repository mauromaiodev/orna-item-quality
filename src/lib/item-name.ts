import type { Forge } from "@/lib/types"

const QUALITY_WORD =
  /^(ornado|ornate|lendário|lendario|legendary|famoso|famed|superior|comum|common|ruim|poor|pobre|quebrado|broken|masterforjado|masterforged|demonforjado|demonforged|godforjado|godforged|anguished|angustiado|angustiada)$/i

const ENCHANTMENT_WORD =
  /^(infernal|flaming|fiery|burning|frozen|frigid|tidal|oceanic|shocking|voltaic|earthen|hallowed|sacred|holy|dark|umbral|cursed|arcane|draconic|flamejante|congelante|sagrado|sombrio|amaldiçoado|amaldiçoada|arcano)$/i

/** Tira do nome as palavras de qualidade e de forja, no começo ou no fim. */
export function cleanItemName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  while (parts.length > 1 && QUALITY_WORD.test(parts[0])) parts.shift()
  while (parts.length > 1 && QUALITY_WORD.test(parts[parts.length - 1])) parts.pop()
  return parts.join(" ")
}

/** Tira um adjetivo de elemento só quando o nome encantado não existe no Codex. */
export function withoutEnchantment(name: string): string | null {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return null
  if (ENCHANTMENT_WORD.test(parts[0])) return parts.slice(1).join(" ")
  if (ENCHANTMENT_WORD.test(parts[parts.length - 1])) return parts.slice(0, -1).join(" ")
  return null
}

/** Lê Masterforged, Demonforged ou Godforged no nome do item. */
export function forgeFromName(name: string): Forge {
  if (/godforged|godforjado/i.test(name)) return "god"
  if (/demonforged|demonforjado/i.test(name)) return "demon"
  if (/masterforged|masterforjado/i.test(name)) return "master"
  return "none"
}
