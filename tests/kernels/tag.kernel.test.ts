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
        name: "fake-terminal-app",
        description: "Fake terminal app for testing",
        tags: ["terminal"],
        packages: { pacman: { install: "fake-terminal-app-xyz" } },
      },
      {
        name: "fake-desktop-app",
        description: "Fake desktop app for testing",
        tags: ["desktop"],
        packages: { pacman: { install: "fake-desktop-app-xyz" } },
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
    expect(processed).toContain("fake-terminal-app")
    expect(processed).not.toContain("fake-desktop-app")
  })

  it("calls onAppSkipped when package manager entry is missing", async () => {
    const skipped: string[] = []
    const missingCtx: RuntimeContext = {
      ...ctx,
      packageManager: "dnf",
    }
    const kernel = new TestKernel(logger, { onAppSkipped: (n) => skipped.push(n) })
    await kernel.execute(missingCtx)
    expect(skipped).toContain("fake-terminal-app")
  })

  it("installMessage defaults to 'Installing <name>...'", () => {
    const kernel = new TestKernel(logger)
    expect((kernel as any).installMessage("fake-terminal-app")).toBe("Installing fake-terminal-app...")
  })

  it("continues installing remaining apps when one fails", async () => {
    const failLogger = new Logger({ verbose: false, dryRun: false })
    const failCtx: RuntimeContext = {
      ...ctx,
      packageManager: "pacman",
      config: {
        apps: [
          {
            name: "will-fail",
            description: "Fails on install",
            tags: ["terminal"],
            packages: { pacman: { install: "this-package-does-not-exist-xyz" } },
          },
          {
            name: "will-succeed",
            description: "Succeeds (dry-run via null install)",
            tags: ["terminal"],
            packages: { pacman: { install: null } },
          },
        ],
      },
    }
    const processed: string[] = []
    const failed: string[] = []
    const kernel = new TestKernel(failLogger, {
      onAppProcessed: (n) => processed.push(n),
      onAppFailed: (n) => failed.push(n),
    })
    await expect(kernel.execute(failCtx)).rejects.toThrow()
    expect(failed).toContain("will-fail")
    expect(processed).toContain("will-succeed")
  })

  it("throws a consolidated error listing all failed apps", async () => {
    const failLogger = new Logger({ verbose: false, dryRun: false })
    const failCtx: RuntimeContext = {
      ...ctx,
      packageManager: "pacman",
      config: {
        apps: [
          {
            name: "app-a",
            description: "Fails",
            tags: ["terminal"],
            packages: { pacman: { install: "nonexistent-app-a" } },
          },
          {
            name: "app-b",
            description: "Fails",
            tags: ["terminal"],
            packages: { pacman: { install: "nonexistent-app-b" } },
          },
        ],
      },
    }
    const kernel = new TestKernel(failLogger)
    await expect(kernel.execute(failCtx)).rejects.toThrow(/app-a.*app-b|app-b.*app-a/s)
  })

  it("skips app and logs when binary is found in PATH", async () => {
    const skipped: string[] = []
    // 'sh' is guaranteed to be in PATH on any unix system
    const ctxWithBinary: RuntimeContext = {
      ...ctx,
      config: {
        apps: [
          {
            name: "myapp",
            description: "App with known binary",
            tags: ["terminal"],
            binary: "sh",
            packages: { pacman: { install: "myapp" } },
          },
        ],
      },
    }
    const kernel = new TestKernel(logger, { onAppSkipped: (n) => skipped.push(n) })
    await kernel.execute(ctxWithBinary)
    expect(skipped).toContain("myapp")
  })

  it("skips app and logs when package is registered in PM", async () => {
    const skipped: string[] = []
    // 'bun' is installed on this machine via pacman or directly — use a real installed package
    // We use 'which' to find a real installed package name: bash is always present
    const ctxWithPkg: RuntimeContext = {
      ...ctx,
      packageManager: "pacman",
      config: {
        apps: [
          {
            name: "bash",
            description: "Already installed shell",
            tags: ["terminal"],
            packages: { pacman: { install: "bash" } },
          },
        ],
      },
    }
    const kernel = new TestKernel(logger, { onAppSkipped: (n) => skipped.push(n) })
    await kernel.execute(ctxWithPkg)
    expect(skipped).toContain("bash")
  })
})
