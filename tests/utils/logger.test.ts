import { describe, it, expect } from "bun:test"
import { Logger } from "../../src/utils/logger"

describe("Logger", () => {
  it("creates a logger instance", () => {
    const logger = new Logger({ verbose: false, dryRun: false })
    expect(logger).toBeDefined()
  })

  it("verbose flag is accessible", () => {
    const logger = new Logger({ verbose: true, dryRun: false })
    expect(logger.isVerbose).toBe(true)
  })

  it("dryRun flag is accessible", () => {
    const logger = new Logger({ verbose: false, dryRun: true })
    expect(logger.isDryRun).toBe(true)
  })

  it("info does not throw", () => {
    const logger = new Logger({ verbose: false, dryRun: false })
    expect(() => logger.info("test message")).not.toThrow()
  })

  it("warn does not throw", () => {
    const logger = new Logger({ verbose: false, dryRun: false })
    expect(() => logger.warn("test warning")).not.toThrow()
  })

  it("error does not throw", () => {
    const logger = new Logger({ verbose: false, dryRun: false })
    expect(() => logger.error("test error")).not.toThrow()
  })
})
