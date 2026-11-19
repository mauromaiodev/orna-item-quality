import assert from "node:assert/strict"
import test from "node:test"
import { FRESH_MS, isFresh, readShare, shareSearch, type SharePayload } from "./share"

const payload: SharePayload = {
  item: {
    name: "Wyrmquill Ballista",
    url: "/codex/items/wyrmquill-ballista/",
    place: "Weapon",
    upgradable: true,
    bossLikely: true,
    stats: { attack: 295, magic: 150 },
  },
  shown: { attack: 543 },
  level: 1,
  forge: "none",
  assumed: false,
  at: 1_700_000_000_000,
}

test("o link guarda a consulta e abre de volta", () => {
  const opened = readShare(shareSearch(payload))
  assert.deepEqual(opened, payload)
})

test("um link quebrado não vira consulta", () => {
  assert.equal(readShare("?s=%%%"), null)
  assert.equal(readShare(""), null)
})

test("a consulta recente não precisa de nova requisição", () => {
  assert.equal(isFresh(payload.at, payload.at + 1000), true)
  assert.equal(isFresh(payload.at, payload.at + FRESH_MS), false)
})
