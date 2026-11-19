import { cleanItemName } from "./item-name"
import type { CatalogItem } from "./types"

/** Acha o item da lista pelo nome lido no print. */
export function matchCatalog(name: string, items: CatalogItem[]): CatalogItem | null {
  const query = cleanItemName(name).toLowerCase()
  if (!query) return null
  const exact = items.find((item) => item.name.toLowerCase() === query)
  if (exact) return exact
  const partial = items.filter((item) => item.name.toLowerCase().includes(query))
  return partial.length === 1 ? partial[0] : null
}
