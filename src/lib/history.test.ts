import assert from "node:assert/strict"
import test from "node:test"
import { rememberLookup, type LookupDraft } from "./history"

const item = {
  name: "Wyrmquill Ballista",
  url: "/codex/items/wyrmquill-ballista/",
  place: "Weapon",
  upgradable: true,
  bossLikely: true,
  stats: { attack: 295 },
}

function draft(attack: number): LookupDraft {
  return {
    item,
    shown: { attack },
    level: 1,
    forge: "none",
    levelAssumed: false,
    result: {
      quality: attack === 543 ? 184 : 170,
      tier: "ornate",
      boss: true,
      curvesAgree: true,
      level: 1,
      coarse: false,
      lines: [],
      dexterity: null,
      projection: [],
    },
  }
}

test("a mesma conta substitui a anterior e outra conta fica na lista", () => {
  const first = rememberLookup([], draft(543), 1)
  const repeated = rememberLookup(first, draft(543), 2)
  const second = rememberLookup(repeated, draft(400), 3)
  assert.equal(repeated.length, 1)
  assert.equal(repeated[0]?.savedAt, 2)
  assert.equal(second.length, 2)
  assert.equal(second[0]?.shown.attack, 400)
  assert.equal(second[1]?.shown.attack, 543)
})

test("a lista guarda no máximo vinte consultas", () => {
  let saved = rememberLookup([], draft(1), 1)
  for (let attack = 2; attack <= 25; attack += 1) saved = rememberLookup(saved, draft(attack), attack)
  assert.equal(saved.length, 20)
  assert.equal(saved[0]?.shown.attack, 25)
  assert.equal(saved.some((entry) => entry.shown.attack === 1), false)
})
