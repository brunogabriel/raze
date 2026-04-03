import { existsSync, readFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import yaml from "js-yaml"
import type { RazeConfig, AppDefinition } from "../kernels/base.kernel"
// @ts-ignore — Bun imports .yaml as object at runtime; bundler embeds as text with [bundler.loaders] ".yaml"="text"
import defaultSuiteAsset from "../../assets/default-suite.yaml"

const ALL_MANAGERS = ["pacman", "yay", "dnf", "apt", "brew"] as const

function expandDefaults(apps: AppDefinition[]): AppDefinition[] {
  return apps.map(app => {
    const packages: AppDefinition["packages"] = { ...(app.packages ?? {}) }
    for (const pm of ALL_MANAGERS) {
      const entry = packages[pm]
      if (!entry) {
        packages[pm] = { install: app.name }
      } else if (!("install" in entry)) {
        packages[pm] = { ...entry, install: app.name }
      }
    }
    return { ...app, packages }
  })
}

function loadDefaultSuite(): RazeConfig {
  // At runtime (bun test/run): Bun parses YAML natively → object
  // In compiled binary (bun build --compile with text loader): embedded string
  let parsed: any
  if (typeof defaultSuiteAsset === "string") {
    parsed = yaml.load(defaultSuiteAsset as string)
  } else {
    parsed = defaultSuiteAsset
  }
  if (!Array.isArray(parsed?.apps)) {
    throw new Error("default-suite.yaml is malformed: missing apps array")
  }
  return { apps: expandDefaults(parsed.apps as AppDefinition[]) }
}

export async function loadConfig(overridePath?: string): Promise<RazeConfig> {
  const defaultSuite = loadDefaultSuite()
  const path = overridePath ?? join(homedir(), ".config", "raze", "suite.yaml")

  if (!existsSync(path)) {
    return defaultSuite
  }

  try {
    const content = readFileSync(path, "utf-8")
    const parsed = parseOverrideYaml(content)
    return mergeConfigs(defaultSuite, parsed)
  } catch {
    console.warn(`[raze] Warning: could not parse override file at ${path}, using defaults.`)
    return defaultSuite
  }
}

function parseOverrideYaml(content: string): Partial<RazeConfig> {
  try {
    const parsed = yaml.load(content) as any
    if (Array.isArray(parsed?.apps)) {
      return { apps: parsed.apps as AppDefinition[] }
    }
    return {}
  } catch {
    return {}
  }
}

function mergeConfigs(base: RazeConfig, override: Partial<RazeConfig>): RazeConfig {
  if (!override.apps || override.apps.length === 0) return base

  const merged = new Map<string, AppDefinition>()
  for (const app of base.apps) merged.set(app.name, app)
  for (const app of override.apps) merged.set(app.name, app)

  return { apps: expandDefaults(Array.from(merged.values())) }
}
