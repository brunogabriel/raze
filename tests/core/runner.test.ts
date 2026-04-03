import { describe, it, expect } from "bun:test"
import { Runner } from "../../src/core/runner"
import { Logger } from "../../src/utils/logger"
import type { IKernel, RuntimeContext } from "../../src/kernels/base.kernel"

const baseCtx: RuntimeContext = {
  os: "linux",
  distro: "arch",
  packageManager: "pacman",
  hasDesktop: false,
  config: { apps: [] },
}

const logger = new Logger({ verbose: false, dryRun: false })

describe("Runner", () => {
  it("returns empty results for no kernels", async () => {
    const runner = new Runner(logger)
    const results = await runner.run([], baseCtx)
    expect(results).toHaveLength(0)
  })

  it("returns success result for a passing kernel", async () => {
    const kernel: IKernel = {
      name: "ok",
      canHandle: () => true,
      execute: async () => {},
    }
    const runner = new Runner(logger)
    const results = await runner.run([kernel], baseCtx)
    expect(results[0]!.status).toBe("success")
    expect(results[0]!.kernel).toBe("ok")
    expect(results[0]!.duration).toBeGreaterThanOrEqual(0)
  })

  it("returns failed result when kernel throws", async () => {
    const kernel: IKernel = {
      name: "bad",
      canHandle: () => true,
      execute: async () => { throw new Error("boom") },
    }
    const runner = new Runner(logger)
    const results = await runner.run([kernel], baseCtx)
    expect(results[0]!.status).toBe("failed")
    expect(results[0]!.reason).toContain("boom")
  })

  it("continues after failure by default", async () => {
    const bad: IKernel = {
      name: "bad",
      canHandle: () => true,
      execute: async () => { throw new Error("fail") },
    }
    const good: IKernel = {
      name: "good",
      canHandle: () => true,
      execute: async () => {},
    }
    const runner = new Runner(logger)
    const results = await runner.run([bad, good], baseCtx)
    expect(results).toHaveLength(2)
    expect(results[1]!.status).toBe("success")
  })

  it("stops on first failure with failFast option", async () => {
    const bad: IKernel = {
      name: "bad",
      canHandle: () => true,
      execute: async () => { throw new Error("fail") },
    }
    const good: IKernel = {
      name: "good",
      canHandle: () => true,
      execute: async () => {},
    }
    const runner = new Runner(logger, { failFast: true })
    const results = await runner.run([bad, good], baseCtx)
    expect(results).toHaveLength(1)
    expect(results[0]!.status).toBe("failed")
  })

  it("calls rollback on failed kernels when failFast is true", async () => {
    let rolledBack = false
    const bad: IKernel = {
      name: "bad",
      canHandle: () => true,
      execute: async () => { throw new Error("fail") },
      rollback: async () => { rolledBack = true },
    }
    const runner = new Runner(logger, { failFast: true })
    await runner.run([bad], baseCtx)
    expect(rolledBack).toBe(true)
  })
})
