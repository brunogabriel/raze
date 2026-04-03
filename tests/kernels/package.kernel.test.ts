import { describe, it, expect } from "bun:test"
import { PackageKernel } from "../../src/kernels/package/package.kernel"
import { Logger } from "../../src/utils/logger"
import type { RuntimeContext } from "../../src/kernels/base.kernel"

const logger = new Logger({ verbose: false, dryRun: true })

const archCtx: RuntimeContext = {
  os: "linux",
  distro: "arch",
  packageManager: "pacman",
  hasDesktop: false,
  config: {
    apps: [
      {
        name: "fake-terminal-app",
        description: "Fake terminal app for testing",
        category: ["terminal"],
        packages: {
          pacman: { install: "fake-terminal-app-xyz" },
          apt: { install: "fake-terminal-app-xyz" },
        },
      },
      {
        name: "fake-desktop-app",
        description: "Fake desktop app for testing",
        category: ["desktop"],
        packages: { pacman: { install: "fake-desktop-app-xyz" } },
      },
    ],
  },
}

describe("PackageKernel", () => {
  it("canHandle returns true for any OS with known package manager", () => {
    const kernel = new PackageKernel(logger)
    expect(kernel.canHandle(archCtx)).toBe(true)
  })

  it("canHandle returns false when package manager is unknown", () => {
    const kernel = new PackageKernel(logger)
    const ctx: RuntimeContext = { ...archCtx, packageManager: "unknown" }
    expect(kernel.canHandle(ctx)).toBe(false)
  })

  it("execute completes without throwing in dry-run mode", async () => {
    const kernel = new PackageKernel(logger)
    await expect(kernel.execute(archCtx)).resolves.toBeUndefined()
  })

  it("only processes terminal-tagged apps (not desktop)", async () => {
    const processed: string[] = []
    const kernel = new PackageKernel(logger, {
      onAppProcessed: (name) => processed.push(name),
    })
    await kernel.execute(archCtx)
    expect(processed).toContain("fake-terminal-app")
    expect(processed).not.toContain("fake-desktop-app")
  })

  it("skips app when package manager entry is missing", async () => {
    const skipped: string[] = []
    const ctx: RuntimeContext = {
      ...archCtx,
      packageManager: "dnf",
      config: {
        apps: [
          {
            name: "arch-only",
            description: "Arch only",
            category: ["terminal"],
            packages: { pacman: { install: "arch-only" } },
          },
        ],
      },
    }
    const kernel = new PackageKernel(logger, { onAppSkipped: (name) => skipped.push(name) })
    await kernel.execute(ctx)
    expect(skipped).toContain("arch-only")
  })
})
