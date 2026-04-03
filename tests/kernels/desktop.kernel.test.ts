import { describe, it, expect } from "bun:test"
import { DesktopKernel } from "../../src/kernels/desktop/desktop.kernel"
import { Logger } from "../../src/utils/logger"
import type { RuntimeContext } from "../../src/kernels/base.kernel"

const logger = new Logger({ verbose: false, dryRun: true })

const desktopCtx: RuntimeContext = {
  os: "linux",
  distro: "arch",
  packageManager: "pacman",
  hasDesktop: true,
  config: {
    apps: [
      {
        name: "fake-desktop-app",
        description: "Fake desktop app for testing",
        category: ["desktop"],
        packages: { pacman: { install: "fake-desktop-app-xyz" } },
      },
      {
        name: "fake-terminal-app",
        description: "Fake terminal app for testing",
        category: ["terminal"],
        packages: { pacman: { install: "fake-terminal-app-xyz" } },
      },
    ],
  },
}

describe("DesktopKernel", () => {
  it("canHandle returns true when hasDesktop is true", () => {
    const kernel = new DesktopKernel(logger)
    expect(kernel.canHandle(desktopCtx)).toBe(true)
  })

  it("canHandle returns false when hasDesktop is false", () => {
    const kernel = new DesktopKernel(logger)
    const ctx: RuntimeContext = { ...desktopCtx, hasDesktop: false }
    expect(kernel.canHandle(ctx)).toBe(false)
  })

  it("execute completes without throwing in dry-run mode", async () => {
    const kernel = new DesktopKernel(logger)
    await expect(kernel.execute(desktopCtx)).resolves.toBeUndefined()
  })

  it("only processes desktop-tagged apps", async () => {
    const processed: string[] = []
    const kernel = new DesktopKernel(logger, { onAppProcessed: (n) => processed.push(n) })
    await kernel.execute(desktopCtx)
    expect(processed).toContain("fake-desktop-app")
    expect(processed).not.toContain("fake-terminal-app")
  })
})
