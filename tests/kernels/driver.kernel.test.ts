import { describe, it, expect } from "bun:test"
import { DriverKernel } from "../../src/kernels/driver/driver.kernel"
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
        name: "nvidia-driver",
        description: "NVIDIA driver",
        tags: ["driver"],
        packages: { pacman: { install: "nvidia" } },
      },
      {
        name: "neovim",
        description: "Editor",
        tags: ["terminal"],
        packages: { pacman: { install: "neovim" } },
      },
    ],
  },
}

describe("DriverKernel", () => {
  it("canHandle returns true when there are driver-tagged apps", () => {
    const kernel = new DriverKernel(logger)
    expect(kernel.canHandle(archCtx)).toBe(true)
  })

  it("canHandle returns false when there are no driver-tagged apps", () => {
    const kernel = new DriverKernel(logger)
    const ctx: RuntimeContext = {
      ...archCtx,
      config: { apps: [archCtx.config.apps[1]!] },
    }
    expect(kernel.canHandle(ctx)).toBe(false)
  })

  it("execute completes without throwing in dry-run mode", async () => {
    const kernel = new DriverKernel(logger)
    await expect(kernel.execute(archCtx)).resolves.toBeUndefined()
  })

  it("only processes driver-tagged apps", async () => {
    const processed: string[] = []
    const kernel = new DriverKernel(logger, { onAppProcessed: (n) => processed.push(n) })
    await kernel.execute(archCtx)
    expect(processed).toContain("nvidia-driver")
    expect(processed).not.toContain("neovim")
  })
})
