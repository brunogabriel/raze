import { describe, it, expect } from "bun:test"
import { KernelRegistry } from "../../src/core/kernel-registry"
import type { IKernel, RuntimeContext } from "../../src/kernels/base.kernel"

const baseCtx: RuntimeContext = {
  os: "linux",
  distro: "arch",
  packageManager: "pacman",
  hasDesktop: false,
  config: { apps: [] },
}

const alwaysKernel: IKernel = {
  name: "always",
  canHandle: () => true,
  execute: async () => {},
}

const neverKernel: IKernel = {
  name: "never",
  canHandle: () => false,
  execute: async () => {},
}

describe("KernelRegistry", () => {
  it("starts with no kernels", () => {
    const registry = new KernelRegistry()
    expect(registry.getApplicable(baseCtx)).toHaveLength(0)
  })

  it("registers a kernel", () => {
    const registry = new KernelRegistry()
    registry.register(alwaysKernel)
    expect(registry.getApplicable(baseCtx)).toHaveLength(1)
  })

  it("filters out kernels that cannot handle context", () => {
    const registry = new KernelRegistry()
    registry.register(alwaysKernel)
    registry.register(neverKernel)
    const applicable = registry.getApplicable(baseCtx)
    expect(applicable).toHaveLength(1)
    expect(applicable[0]!.name).toBe("always")
  })

  it("preserves registration order", () => {
    const registry = new KernelRegistry()
    const a: IKernel = { name: "a", canHandle: () => true, execute: async () => {} }
    const b: IKernel = { name: "b", canHandle: () => true, execute: async () => {} }
    const c: IKernel = { name: "c", canHandle: () => true, execute: async () => {} }
    registry.register(a)
    registry.register(b)
    registry.register(c)
    const names = registry.getApplicable(baseCtx).map((k) => k.name)
    expect(names).toEqual(["a", "b", "c"])
  })

  it("throws if kernel with same name registered twice", () => {
    const registry = new KernelRegistry()
    registry.register(alwaysKernel)
    expect(() => registry.register(alwaysKernel)).toThrow()
  })
})
