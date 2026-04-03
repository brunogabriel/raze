import { existsSync, readFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import type { RazeConfig, AppDefinition } from "../kernels/base.kernel"
import { defaultSuite } from "./default-suite"

export async function loadConfig(overridePath?: string): Promise<RazeConfig> {
  const path = overridePath ?? join(homedir(), ".config", "raze", "suite.toml")

  if (!existsSync(path)) {
    return defaultSuite
  }

  try {
    const content = readFileSync(path, "utf-8")
    const parsed = parseSuiteToml(content)
    return mergeConfigs(defaultSuite, parsed)
  } catch {
    return defaultSuite
  }
}

function parseSuiteToml(content: string): Partial<RazeConfig> {
  // Minimal TOML parser for suite overrides using Bun's built-in TOML support
  // Only supports top-level [[apps]] array entries
  try {
    const parsed = Bun.TOML.parse(content) as any
    if (Array.isArray(parsed.apps)) {
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

  return { apps: Array.from(merged.values()) }
}
