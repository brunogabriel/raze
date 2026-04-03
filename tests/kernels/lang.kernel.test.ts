import { describe, it, expect } from "bun:test"
import type { LangDefinition, LangContext } from "../../src/kernels/lang/lang.kernel"
import { LangKernel } from "../../src/kernels/lang/lang.kernel"
import { Logger } from "../../src/utils/logger"

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

const logger = new Logger({ verbose: false, dryRun: true })

const ctx: LangContext = {
  langs: [
    {
      name: "node",
      description: "JavaScript runtime",
      misePlugin: "node",
      miseVersion: "latest",
    },
    {
      name: "flutter",
      description: "Flutter SDK",
      misePlugin: "flutter",
      miseVersion: "latest",
      misePluginUrl: "https://github.com/oae/asdf-flutter",
    },
  ],
}

describe("LangKernel", () => {
  it("execute completes without throwing in dry-run mode", async () => {
    const kernel = new LangKernel(logger)
    await expect(kernel.execute(ctx)).resolves.toBeUndefined()
  })

  it("calls onLangProcessed for each lang in dry-run mode", async () => {
    const processed: string[] = []
    const kernel = new LangKernel(logger, { onLangProcessed: (n) => processed.push(n) })
    await kernel.execute(ctx)
    expect(processed).toContain("node")
    expect(processed).toContain("flutter")
  })
})
