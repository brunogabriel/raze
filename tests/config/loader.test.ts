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
    const terminalApps = config.apps.filter((a) => a.category.includes("terminal"))
    expect(terminalApps.length).toBeGreaterThan(0)
  })

  it("default suite has at least one desktop app", async () => {
    const config = await loadConfig("/nonexistent/path/suite.yaml")
    const desktopApps = config.apps.filter((a) => a.category.includes("desktop"))
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
    category: [terminal]
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

  it("app with no packages declared gets all managers defaulting to app name", async () => {
    const dir = join(tmpdir(), "raze-test-" + Date.now())
    mkdirSync(dir, { recursive: true })
    const overridePath = join(dir, "suite.yaml")
    writeFileSync(overridePath, `
apps:
  - name: mytool
    description: Test tool
    category: [terminal]
`)
    const config = await loadConfig(overridePath)
    const app = config.apps.find((a) => a.name === "mytool")
    expect(app).toBeDefined()
    expect(app!.packages.pacman?.install).toBe("mytool")
    expect(app!.packages.yay?.install).toBe("mytool")
    expect(app!.packages.dnf?.install).toBe("mytool")
    expect(app!.packages.apt?.install).toBe("mytool")
    expect(app!.packages.brew?.install).toBe("mytool")
  })

  it("apt entry with pre but no install gets install defaulted to app name", async () => {
    const dir = join(tmpdir(), "raze-test-" + Date.now())
    mkdirSync(dir, { recursive: true })
    const overridePath = join(dir, "suite.yaml")
    writeFileSync(overridePath, `
apps:
  - name: mytool2
    description: Test tool 2
    category: [terminal]
    packages:
      apt:
        pre:
          - apt-get update -y
`)
    const config = await loadConfig(overridePath)
    const app = config.apps.find((a) => a.name === "mytool2")
    expect(app).toBeDefined()
    expect(app!.packages.apt?.pre).toEqual(["apt-get update -y"])
    expect(app!.packages.apt?.install).toBe("mytool2")
    expect(app!.packages.pacman?.install).toBe("mytool2")
  })

  it("ripgrep has binary set to 'rg' in default suite", async () => {
    const config = await loadConfig("/nonexistent/path/suite.yaml")
    const rg = config.apps.find((a) => a.name === "ripgrep")
    expect(rg).toBeDefined()
    expect(rg!.binary).toBe("rg")
  })

  it("default suite has at least 30 apps", async () => {
    const config = await loadConfig()
    expect(config.apps.length).toBeGreaterThanOrEqual(30)
  })

  it("PM set to null explicitly is not filled in by expandDefaults", async () => {
    const dir = join(tmpdir(), "raze-test-" + Date.now())
    mkdirSync(dir, { recursive: true })
    const overridePath = join(dir, "suite.yaml")
    writeFileSync(overridePath, `
apps:
  - name: aur-only-tool
    description: Only available on AUR
    category: [terminal]
    packages:
      yay:
        install: aur-only-tool
      pacman: ~
      apt: ~
      dnf: ~
      brew: ~
`)
    const config = await loadConfig(overridePath)
    const app = config.apps.find((a) => a.name === "aur-only-tool")
    expect(app).toBeDefined()
    expect(app!.packages.yay?.install).toBe("aur-only-tool")
    expect(app!.packages.pacman).toBeNull()
    expect(app!.packages.apt).toBeNull()
    expect(app!.packages.dnf).toBeNull()
    expect(app!.packages.brew).toBeNull()
  })
})
