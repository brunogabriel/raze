import { describe, it, expect } from "bun:test"
import type { LangDefinition, LangContext } from "../../src/kernels/lang/lang.kernel"

describe("LangDefinition types", () => {
  it("LangDefinition has required fields", () => {
    const lang: LangDefinition = {
      name: "node",
      description: "JavaScript runtime",
      misePlugin: "node",
      miseVersion: "latest",
    }
    expect(lang.name).toBe("node")
    expect(lang.misePlugin).toBe("node")
    expect(lang.miseVersion).toBe("latest")
    expect(lang.misePluginUrl).toBeUndefined()
  })

  it("LangDefinition accepts optional misePluginUrl", () => {
    const lang: LangDefinition = {
      name: "flutter",
      description: "Flutter SDK",
      misePlugin: "flutter",
      miseVersion: "latest",
      misePluginUrl: "https://github.com/oae/asdf-flutter",
    }
    expect(lang.misePluginUrl).toBe("https://github.com/oae/asdf-flutter")
  })

  it("LangContext has langs array", () => {
    const ctx: LangContext = {
      langs: [],
    }
    expect(Array.isArray(ctx.langs)).toBe(true)
  })
})
