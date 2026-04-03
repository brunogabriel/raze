import { describe, it, expect } from "bun:test"
import { runCommand, type CommandResult } from "../../src/utils/shell"

describe("runCommand", () => {
  it("runs a successful command and returns stdout", async () => {
    const result = await runCommand("echo hello", { stream: false })
    expect(result.success).toBe(true)
    expect(result.stdout.trim()).toBe("hello")
    expect(result.exitCode).toBe(0)
  })

  it("returns failure for non-zero exit commands", async () => {
    const result = await runCommand("exit 1", { stream: false })
    expect(result.success).toBe(false)
    expect(result.exitCode).toBe(1)
  })

  it("captures stderr", async () => {
    const result = await runCommand("echo error >&2", { stream: false })
    expect(result.stderr).toBeDefined()
  })

  it("dry-run mode does not execute command", async () => {
    const result = await runCommand("echo should-not-run", { dryRun: true })
    expect(result.success).toBe(true)
    expect(result.stdout).toBe("")
    expect(result.dryRun).toBe(true)
  })
})
