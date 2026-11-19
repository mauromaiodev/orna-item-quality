import { cleanItemName, withoutEnchantment } from "./item-name"
import type { CatalogItem } from "./types"

/** Acha o item da lista pelo nome lido no print. */
export function matchCatalog(name: string, items: CatalogItem[]): CatalogItem | null {
  const query = cleanItemName(name)
  return findName(query, items) ?? findName(withoutEnchantment(query) ?? "", items)
}

function findName(query: string, items: CatalogItem[]): CatalogItem | null {
  const text = query.trim().toLowerCase()
  if (!text) return null
  const exact = items.find((item) => item.name.toLowerCase() === text)
  if (exact) return exact
  const partial = items.filter((item) => item.name.toLowerCase().includes(text))
  return partial.length === 1 ? partial[0] : null
}
