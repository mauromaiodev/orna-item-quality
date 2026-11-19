import type { Messages } from "@/lib/i18n"
import type { SavedLookup } from "@/lib/history"

/** Lista das consultas que já deram resultado. */
export function SavedLookups(props: {
  items: SavedLookup[]
  text: Messages
  onOpen: (item: SavedLookup) => void
  onRemove: (id: string) => void
}) {
  if (props.items.length === 0) return null
  return (
    <section className="saved">
      <h2>{props.text.savedTitle}</h2>
      <ul>
        {props.items.map((entry) => (
          <li key={entry.id}>
            <button className="saved-open" type="button" onClick={() => props.onOpen(entry)}>
              <span>{entry.item.name}</span>
              <span>{summary(entry, props.text)}</span>
            </button>
            <button
              className="saved-remove"
              type="button"
              aria-label={props.text.removeSaved}
              onClick={() => props.onRemove(entry.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function summary(entry: SavedLookup, text: Messages): string {
  const forge = entry.forge === "none" ? "" : ` · ${entry.forge}`
  return `${entry.result.quality}% ${text.tier[entry.result.tier]} · ${text.level} ${entry.level}${forge}`
}
