import { describe, it, expect } from "bun:test"
import { Detector } from "../../src/core/detector"
import type { RuntimeContext } from "../../src/kernels/base.kernel"

describe("Detector", () => {
  it("returns a RuntimeContext", async () => {
    const detector = new Detector()
    const ctx = await detector.detect({ apps: [] })
    expect(ctx.os).toBeDefined()
    expect(ctx.distro).toBeDefined()
    expect(ctx.packageManager).toBeDefined()
    expect(typeof ctx.hasDesktop).toBe("boolean")
  })

  it("detects linux as os on linux", async () => {
    if (process.platform !== "linux") return
    const detector = new Detector()
    const ctx = await detector.detect({ apps: [] })
    expect(ctx.os).toBe("linux")
  })

  it("detects unknown distro when no /etc/os-release", async () => {
    const detector = new Detector({ osReleasePath: "/nonexistent/os-release" })
    const ctx = await detector.detect({ apps: [] })
    expect(ctx.distro).toBe("unknown")
  })

  it("detects unknown package manager when none available", async () => {
    const detector = new Detector({ pathOverride: [] })
    const ctx = await detector.detect({ apps: [] })
    expect(ctx.packageManager).toBe("unknown")
  })

  it("hasDesktop is false when DISPLAY and WAYLAND_DISPLAY are unset", async () => {
    const savedDisplay = process.env.DISPLAY
    const savedWayland = process.env.WAYLAND_DISPLAY
    delete process.env.DISPLAY
    delete process.env.WAYLAND_DISPLAY
    delete process.env.XDG_SESSION_TYPE

    const detector = new Detector()
    const ctx = await detector.detect({ apps: [] })
    expect(ctx.hasDesktop).toBe(false)

    process.env.DISPLAY = savedDisplay
    process.env.WAYLAND_DISPLAY = savedWayland
  })

  it("hasDesktop is true when DISPLAY is set", async () => {
    process.env.DISPLAY = ":0"
    const detector = new Detector()
    const ctx = await detector.detect({ apps: [] })
    expect(ctx.hasDesktop).toBe(true)
    delete process.env.DISPLAY
  })
})
