import { describe, it, expect } from "bun:test"
import { loadLangs } from "../../src/config/langs-loader"
import { writeFileSync, mkdirSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

describe("loadLangs", () => {
  it("returns langs from default suite", async () => {
    const config = await loadLangs()
    expect(config.langs.length).toBeGreaterThan(0)
  })

  it("default suite contains node", async () => {
    const config = await loadLangs()
    expect(config.langs.some((l) => l.name === "node")).toBe(true)
  })

  it("default suite contains flutter with misePluginUrl", async () => {
    const config = await loadLangs()
    const flutter = config.langs.find((l) => l.name === "flutter")
    expect(flutter).toBeDefined()
    expect(flutter!.misePluginUrl).toBe("https://github.com/oae/asdf-flutter")
  })

  it("default suite all langs have misePlugin and miseVersion", async () => {
    const config = await loadLangs()
    for (const lang of config.langs) {
      expect(lang.misePlugin).toBeTruthy()
      expect(lang.miseVersion).toBeTruthy()
    }
  })

  it("override file merges and replaces langs by name", async () => {
    const dir = join(tmpdir(), "raze-langs-test-" + Date.now())
    mkdirSync(dir, { recursive: true })
    const overridePath = join(dir, "langs.yaml")
    writeFileSync(overridePath, `
langs:
  - name: node
    description: My custom node
    misePlugin: node
    miseVersion: "22"
`)
    const config = await loadLangs(overridePath)
    const node = config.langs.find((l) => l.name === "node")
    expect(node?.miseVersion).toBe("22")
    expect(config.langs.some((l) => l.name === "java")).toBe(true)
  })

  it("falls back to defaults when override YAML is malformed", async () => {
    const dir = join(tmpdir(), "raze-langs-test-" + Date.now())
    mkdirSync(dir, { recursive: true })
    const overridePath = join(dir, "langs.yaml")
    writeFileSync(overridePath, "this: is: not: valid: yaml: :::")
    const config = await loadLangs(overridePath)
    expect(config.langs.some((l) => l.name === "node")).toBe(true)
  })
})
