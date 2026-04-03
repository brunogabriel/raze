import { existsSync, readFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import yaml from "js-yaml"
import type { LangDefinition, LangContext } from "../kernels/lang/lang.kernel"
// @ts-ignore — Bun imports .yaml as object at runtime; bundler embeds as text with [bundler.loaders] ".yaml"="text"
import defaultLangsAsset from "../../assets/default-langs.yaml"

function loadDefaultLangs(): LangContext {
  let parsed: any
  if (typeof defaultLangsAsset === "string") {
    parsed = yaml.load(defaultLangsAsset as string)
  } else {
    parsed = defaultLangsAsset
  }
  if (!Array.isArray(parsed?.langs)) {
    throw new Error("default-langs.yaml is malformed: missing langs array")
  }
  return { langs: parsed.langs as LangDefinition[] }
}

function parseOverrideYaml(content: string): Partial<LangContext> {
  try {
    const parsed = yaml.load(content) as any
    if (Array.isArray(parsed?.langs)) {
      return { langs: parsed.langs as LangDefinition[] }
    }
    return {}
  } catch {
    return {}
  }
}

function mergeLangs(base: LangContext, override: Partial<LangContext>): LangContext {
  if (!override.langs || override.langs.length === 0) return base
  const merged = new Map<string, LangDefinition>()
  for (const lang of base.langs) merged.set(lang.name, lang)
  for (const lang of override.langs) merged.set(lang.name, lang)
  return { langs: Array.from(merged.values()) }
}

export async function loadLangs(overridePath?: string): Promise<LangContext> {
  const defaultLangs = loadDefaultLangs()
  const path = overridePath ?? join(homedir(), ".config", "raze", "langs.yaml")

  if (!existsSync(path)) {
    return defaultLangs
  }

  try {
    const content = readFileSync(path, "utf-8")
    const parsed = parseOverrideYaml(content)
    return mergeLangs(defaultLangs, parsed)
  } catch {
    console.warn(`[raze] Warning: could not parse override file at ${path}, using defaults.`)
    return defaultLangs
  }
}
