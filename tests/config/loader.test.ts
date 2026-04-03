import { describe, it, expect } from "bun:test"
import { loadConfig } from "../../src/config/loader"
import { writeFileSync, mkdirSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

describe("loadConfig", () => {
  it("returns apps when no override path exists", async () => {
    const config = await loadConfig("/nonexistent/path/suite.yaml")
    expect(config.apps.length).toBeGreaterThan(0)
  })

  it("default suite has at least one terminal app", async () => {
    const config = await loadConfig("/nonexistent/path/suite.yaml")
    const terminalApps = config.apps.filter((a) => a.tags.includes("terminal"))
    expect(terminalApps.length).toBeGreaterThan(0)
  })

  it("default suite has at least one desktop app", async () => {
    const config = await loadConfig("/nonexistent/path/suite.yaml")
    const desktopApps = config.apps.filter((a) => a.tags.includes("desktop"))
    expect(desktopApps.length).toBeGreaterThan(0)
  })

  it("default suite contains neovim", async () => {
    const config = await loadConfig("/nonexistent/path/suite.yaml")
    expect(config.apps.some((a) => a.name === "neovim")).toBe(true)
  })

  it("default suite contains docker", async () => {
    const config = await loadConfig("/nonexistent/path/suite.yaml")
    expect(config.apps.some((a) => a.name === "docker")).toBe(true)
  })

  it("override file merges and replaces apps by name", async () => {
    const dir = join(tmpdir(), "raze-test-" + Date.now())
    mkdirSync(dir, { recursive: true })
    const overridePath = join(dir, "suite.yaml")
    writeFileSync(overridePath, `
apps:
  - name: neovim
    description: My custom neovim
    tags: [terminal]
    packages:
      apt:
        install: neovim-nightly
`)
    const config = await loadConfig(overridePath)
    const neovim = config.apps.find((a) => a.name === "neovim")
    expect(neovim?.description).toBe("My custom neovim")
    // other apps still present
    expect(config.apps.some((a) => a.name === "tmux")).toBe(true)
  })

  it("falls back to defaults when override YAML is malformed", async () => {
    const dir = join(tmpdir(), "raze-test-" + Date.now())
    mkdirSync(dir, { recursive: true })
    const overridePath = join(dir, "suite.yaml")
    writeFileSync(overridePath, "this: is: not: valid: yaml: :::")
    const config = await loadConfig(overridePath)
    expect(config.apps.some((a) => a.name === "neovim")).toBe(true)
  })
})
