import { describe, it, expect } from "bun:test"
import { loadConfig } from "../../src/config/loader"
import { defaultSuite } from "../../src/config/default-suite"

describe("loadConfig", () => {
  it("returns default suite when no override path exists", async () => {
    const config = await loadConfig("/nonexistent/path/suite.toml")
    expect(config.apps).toEqual(defaultSuite.apps)
  })

  it("default suite has at least one terminal app", async () => {
    const config = await loadConfig("/nonexistent/path/suite.toml")
    const terminalApps = config.apps.filter((a) => a.tags.includes("terminal"))
    expect(terminalApps.length).toBeGreaterThan(0)
  })

  it("default suite has at least one desktop app", async () => {
    const config = await loadConfig("/nonexistent/path/suite.toml")
    const desktopApps = config.apps.filter((a) => a.tags.includes("desktop"))
    expect(desktopApps.length).toBeGreaterThan(0)
  })

  it("default suite contains neovim", async () => {
    const config = await loadConfig("/nonexistent/path/suite.toml")
    expect(config.apps.some((a) => a.name === "neovim")).toBe(true)
  })
})
