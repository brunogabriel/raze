import { describe, it, expect } from "bun:test"
import { TagKernel, type TagKernelOptions } from "../../src/kernels/tag.kernel"
import { Logger } from "../../src/utils/logger"
import type { RuntimeContext, AppTag } from "../../src/kernels/base.kernel"

const logger = new Logger({ verbose: false, dryRun: true })

const ctx: RuntimeContext = {
  os: "linux",
  distro: "arch",
  packageManager: "pacman",
  hasDesktop: false,
  config: {
    apps: [
      {
        name: "neovim",
        description: "Editor",
        tags: ["terminal"],
        packages: { pacman: { install: "neovim" } },
      },
      {
        name: "alacritty",
        description: "Terminal emulator",
        tags: ["desktop"],
        packages: { pacman: { install: "alacritty" } },
      },
    ],
  },
}

class TestKernel extends TagKernel {
  name = "TestKernel"
  tag: AppTag = "terminal"
  canHandle(_ctx: RuntimeContext) { return true }
}

describe("TagKernel", () => {
  it("execute only processes apps matching the declared tag", async () => {
    const processed: string[] = []
    const kernel = new TestKernel(logger, { onAppProcessed: (n) => processed.push(n) })
    await kernel.execute(ctx)
    expect(processed).toContain("neovim")
    expect(processed).not.toContain("alacritty")
  })

  it("calls onAppSkipped when package manager entry is missing", async () => {
    const skipped: string[] = []
    const missingCtx: RuntimeContext = {
      ...ctx,
      packageManager: "dnf",
    }
    const kernel = new TestKernel(logger, { onAppSkipped: (n) => skipped.push(n) })
    await kernel.execute(missingCtx)
    expect(skipped).toContain("neovim")
  })

  it("installMessage defaults to 'Installing <name>...'", () => {
    const kernel = new TestKernel(logger)
    expect((kernel as any).installMessage("neovim")).toBe("Installing neovim...")
  })
})
