import { describe, it, expect } from "bun:test"
import type { IKernel, KernelResult, RuntimeContext } from "../../src/kernels/base.kernel"

describe("base.kernel types", () => {
  it("KernelResult has correct shape", () => {
    const result: KernelResult = {
      kernel: "test",
      status: "success",
      duration: 100,
    }
    expect(result.kernel).toBe("test")
    expect(result.status).toBe("success")
    expect(result.duration).toBe(100)
  })

  it("KernelResult supports skipped with reason", () => {
    const result: KernelResult = {
      kernel: "test",
      status: "skipped",
      reason: "no desktop detected",
      duration: 0,
    }
    expect(result.reason).toBe("no desktop detected")
  })

  it("KernelResult supports failed with reason", () => {
    const result: KernelResult = {
      kernel: "test",
      status: "failed",
      reason: "command exited with code 1",
      duration: 50,
    }
    expect(result.status).toBe("failed")
  })
})
