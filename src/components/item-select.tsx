"use client"

import { useMemo, useState } from "react"
import type { CatalogItem } from "@/lib/types"

/** Lista pesquisável com todos os itens do Codex. */
export function ItemSelect(props: {
  items: CatalogItem[]
  query: string
  onQuery: (query: string) => void
  onPick: (item: CatalogItem) => void
  placeholder: string
  emptyLabel: string
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const matches = useMemo(() => filterItems(props.items, props.query), [props.items, props.query])

  return (
    <div className="combo">
      <input
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={props.query}
        placeholder={props.placeholder}
        disabled={props.disabled}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          props.onQuery(event.target.value)
          setOpen(true)
        }}
      />
      {open && !props.disabled ? (
        <ul className="combo-list" role="listbox">
          {matches.length === 0 ? <li className="combo-empty">{props.emptyLabel}</li> : null}
          {matches.map((item) => (
            <li key={item.url}>
              <button
                type="button"
                role="option"
                onMouseDown={(event) => {
                  event.preventDefault()
                  props.onPick(item)
                  setOpen(false)
                }}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function filterItems(items: CatalogItem[], query: string): CatalogItem[] {
  const text = query.trim().toLowerCase()
  const source = text ? items.filter((item) => item.name.toLowerCase().includes(text)) : items
  return source.slice(0, 40)
}
