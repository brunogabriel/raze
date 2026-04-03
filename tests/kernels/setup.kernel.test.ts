import { describe, it, expect } from "bun:test"
import { SetupKernel } from "../../src/kernels/setup/setup.kernel"
import { Logger } from "../../src/utils/logger"
import type { RuntimeContext } from "../../src/kernels/base.kernel"

const logger = new Logger({ verbose: false, dryRun: true })

const ctx: RuntimeContext = {
  os: "linux",
  distro: "arch",
  packageManager: "pacman",
  hasDesktop: false,
  config: { apps: [] },
}

describe("SetupKernel", () => {
  it("canHandle always returns true", () => {
    const kernel = new SetupKernel(logger)
    expect(kernel.canHandle(ctx)).toBe(true)
  })

  it("execute completes without throwing in dry-run mode", async () => {
    const kernel = new SetupKernel(logger)
    await expect(kernel.execute(ctx)).resolves.toBeUndefined()
  })
})
