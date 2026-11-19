import assert from "node:assert/strict"
import test from "node:test"
import { assess, dexterityAt, resolveLevel, upgradedStat } from "./quality"

const ballistaBase = {
  attack: 295,
  magic: 150,
  mana: 110,
  dexterity: 80,
  ward: 2,
  crit: 0,
}

const ballistaShown = {
  attack: 543,
  magic: 276,
  mana: 203,
  dexterity: 80,
  ward: 4,
  crit: 0,
}

test("a ballista do print é 184% ornado no nível 1", () => {
  const result = assess({
    shown: ballistaShown,
    base: ballistaBase,
    level: 1,
    forge: "none",
    upgradable: true,
  })
  assert.ok(result)
  assert.equal(result.quality, 184)
  assert.equal(result.tier, "ornate")
  assert.equal(result.lines.find((line) => line.key === "attack")?.reference, 295)
  assert.equal(result.lines.find((line) => line.key === "magic")?.matches, true)
  assert.equal(result.lines.find((line) => line.key === "mana")?.matches, true)
  assert.equal(result.lines.find((line) => line.key === "ward")?.matches, true)
  assert.equal(result.dexterity?.matches, true)
  const bossDrop = assess({
    shown: ballistaShown,
    base: ballistaBase,
    level: 1,
    forge: "none",
    upgradable: true,
    preferBoss: true,
  })
  assert.equal(bossDrop?.quality, 184)
  assert.equal(bossDrop?.boss, true)
  assert.equal(
    bossDrop?.projection[0]?.stats.find((stat) => stat.key === "attack")?.value,
    upgradedStat({ base: 295, level: 10, quality: 184, boss: true }),
  )
})

test("nível 10, masterforged, demonforged e godforged voltam para a mesma qualidade", () => {
  for (const level of [10, 11, 12, 13]) {
    const shown = {
      attack: upgradedStat({ base: 295, level, quality: 184, boss: true }),
      magic: upgradedStat({ base: 150, level, quality: 184, boss: true }),
      mana: upgradedStat({ base: 110, level, quality: 184, boss: true }),
    }
    const forge = level === 11 ? "master" : level === 12 ? "demon" : level === 13 ? "god" : "none"
    const result = assess({
      shown,
      base: ballistaBase,
      level: level === 10 ? 10 : 1,
      forge,
      upgradable: true,
    })
    assert.equal(result?.quality, 184)
    assert.equal(result?.boss, true)
    assert.equal(result?.level, level)
  }
})

test("a curva normal não é confundida com a de boss no nível 10", () => {
  const shown = {
    attack: upgradedStat({ base: 295, level: 10, quality: 170, boss: false }),
    magic: upgradedStat({ base: 150, level: 10, quality: 170, boss: false }),
  }
  const result = assess({
    shown,
    base: ballistaBase,
    level: 10,
    forge: "none",
    upgradable: true,
  })
  assert.equal(result?.quality, 170)
  assert.equal(result?.boss, false)
  assert.equal(result?.tier, "ornate")
})

test("destreza no nível 10 não usa a qualidade", () => {
  const withQuality = upgradedStat({ base: 80, level: 10, quality: 184, boss: false })
  const dex = dexterityAt({ base: 80, level: 10, boss: false })
  assert.notEqual(dex, withQuality)
  assert.equal(resolveLevel(4, "demon"), 12)
})
