# Mise Language Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `mise` as a terminal app and a `raze langs` command that installs programming languages (node, java, dotnet, flutter) via mise, using a dedicated `assets/default-langs.yaml` and a new `LangKernel`.

**Architecture:** Languages live in a separate `assets/default-langs.yaml` with their own `LangDefinition` type and `loadLangs()` loader. A new `LangKernel` reads `LangContext` (separate from `RuntimeContext`) and runs `mise plugin add` + `mise use --global` for each language. The `langs` CLI command builds a `LangContext` and runs `LangKernel` directly — no `KernelRegistry` or `Runner` needed since there is only one kernel. `mise` itself is added to `default-suite.yaml` as a regular terminal app so `raze install` installs it first.

**Tech Stack:** Bun, TypeScript, `bun:test`, `js-yaml`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `assets/default-langs.yaml` | Default language definitions |
| Create | `src/kernels/lang/lang.kernel.ts` | Installs languages via mise |
| Create | `src/config/langs-loader.ts` | Loads and parses `default-langs.yaml` |
| Create | `src/cli/commands/langs.ts` | `raze langs` CLI command |
| Modify | `src/cli/index.ts` | Register `langs` command |
| Modify | `assets/default-suite.yaml` | Add `mise` as terminal app |
| Create | `tests/kernels/lang.kernel.test.ts` | Unit tests for `LangKernel` |
| Create | `tests/config/langs-loader.test.ts` | Unit tests for `loadLangs` |

---

### Task 1: Define `LangDefinition` type and `default-langs.yaml`

**Files:**
- Create: `assets/default-langs.yaml`
- Create: `src/kernels/lang/lang.kernel.ts` (types only, no logic yet)
- Create: `tests/kernels/lang.kernel.test.ts` (type shape test only)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/kernels/lang.kernel.test.ts
import { describe, it, expect } from "bun:test"
import type { LangDefinition, LangContext } from "../../src/kernels/lang/lang.kernel"

describe("LangDefinition types", () => {
  it("LangDefinition has required fields", () => {
    const lang: LangDefinition = {
      name: "node",
      description: "JavaScript runtime",
      misePlugin: "node",
      miseVersion: "latest",
    }
    expect(lang.name).toBe("node")
    expect(lang.misePlugin).toBe("node")
    expect(lang.miseVersion).toBe("latest")
    expect(lang.misePluginUrl).toBeUndefined()
  })

  it("LangDefinition accepts optional misePluginUrl", () => {
    const lang: LangDefinition = {
      name: "flutter",
      description: "Flutter SDK",
      misePlugin: "flutter",
      miseVersion: "latest",
      misePluginUrl: "https://github.com/oae/asdf-flutter",
    }
    expect(lang.misePluginUrl).toBe("https://github.com/oae/asdf-flutter")
  })

  it("LangContext has langs array", () => {
    const ctx: LangContext = {
      langs: [],
    }
    expect(Array.isArray(ctx.langs)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/kernels/lang.kernel.test.ts
```

Expected: FAIL — `Cannot find module '../../src/kernels/lang/lang.kernel'`

- [ ] **Step 3: Create `src/kernels/lang/lang.kernel.ts` with types only**

```typescript
import type { Logger } from "../../utils/logger"
import { runCommand } from "../../utils/shell"

export interface LangDefinition {
  name: string
  description: string
  misePlugin: string
  miseVersion: string
  misePluginUrl?: string
}

export interface LangContext {
  langs: LangDefinition[]
}

export interface LangKernelOptions {
  onLangProcessed?: (name: string) => void
  onLangSkipped?: (name: string) => void
}

export class LangKernel {
  name = "LangKernel"
  private logger: Logger
  private options: LangKernelOptions

  constructor(logger: Logger, options: LangKernelOptions = {}) {
    this.logger = logger
    this.options = options
  }

  async execute(_ctx: LangContext): Promise<void> {
    // implementation in Task 3
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/kernels/lang.kernel.test.ts
```

Expected: 3 pass, 0 fail

- [ ] **Step 5: Create `assets/default-langs.yaml`**

```yaml
# Raze default language suite
# Languages are installed via mise (https://mise.jdx.dev)
# Fields:
#   name:           display name
#   description:    short description
#   misePlugin:     plugin name used in: mise use --global <misePlugin>@<miseVersion>
#   miseVersion:    version to install (e.g. "latest", "21", "temurin-21")
#   misePluginUrl:  (optional) external plugin URL — used when plugin is not built-in to mise

langs:
  - name: node
    description: JavaScript runtime
    misePlugin: node
    miseVersion: latest

  - name: java
    description: Java runtime (Eclipse Temurin)
    misePlugin: java
    miseVersion: latest

  - name: dotnet
    description: .NET runtime and SDK
    misePlugin: dotnet
    miseVersion: latest

  - name: flutter
    description: Flutter SDK
    misePlugin: flutter
    misePluginUrl: https://github.com/oae/asdf-flutter
    miseVersion: latest
```

- [ ] **Step 6: Commit**

```bash
git add assets/default-langs.yaml src/kernels/lang/lang.kernel.ts tests/kernels/lang.kernel.test.ts
git commit -m "feat: add LangDefinition types and default-langs.yaml"
```

---

### Task 2: Create `loadLangs` config loader

**Files:**
- Create: `src/config/langs-loader.ts`
- Create: `tests/config/langs-loader.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/config/langs-loader.test.ts
import { describe, it, expect } from "bun:test"
import { loadLangs } from "../../src/config/langs-loader"
import { writeFileSync, mkdirSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

describe("loadLangs", () => {
  it("returns langs from default suite", async () => {
    const config = await loadLangs()
    expect(config.langs.length).toBeGreaterThan(0)
  })

  it("default suite contains node", async () => {
    const config = await loadLangs()
    expect(config.langs.some((l) => l.name === "node")).toBe(true)
  })

  it("default suite contains flutter with misePluginUrl", async () => {
    const config = await loadLangs()
    const flutter = config.langs.find((l) => l.name === "flutter")
    expect(flutter).toBeDefined()
    expect(flutter!.misePluginUrl).toBe("https://github.com/oae/asdf-flutter")
  })

  it("default suite all langs have misePlugin and miseVersion", async () => {
    const config = await loadLangs()
    for (const lang of config.langs) {
      expect(lang.misePlugin).toBeTruthy()
      expect(lang.miseVersion).toBeTruthy()
    }
  })

  it("override file merges and replaces langs by name", async () => {
    const dir = join(tmpdir(), "raze-langs-test-" + Date.now())
    mkdirSync(dir, { recursive: true })
    const overridePath = join(dir, "langs.yaml")
    writeFileSync(overridePath, `
langs:
  - name: node
    description: My custom node
    misePlugin: node
    miseVersion: "22"
`)
    const config = await loadLangs(overridePath)
    const node = config.langs.find((l) => l.name === "node")
    expect(node?.miseVersion).toBe("22")
    expect(config.langs.some((l) => l.name === "java")).toBe(true)
  })

  it("falls back to defaults when override YAML is malformed", async () => {
    const dir = join(tmpdir(), "raze-langs-test-" + Date.now())
    mkdirSync(dir, { recursive: true })
    const overridePath = join(dir, "langs.yaml")
    writeFileSync(overridePath, "this: is: not: valid: yaml: :::")
    const config = await loadLangs(overridePath)
    expect(config.langs.some((l) => l.name === "node")).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/config/langs-loader.test.ts
```

Expected: FAIL — `Cannot find module '../../src/config/langs-loader'`

- [ ] **Step 3: Create `src/config/langs-loader.ts`**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/config/langs-loader.test.ts
```

Expected: 6 pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add src/config/langs-loader.ts tests/config/langs-loader.test.ts
git commit -m "feat: add loadLangs config loader for default-langs.yaml"
```

---

### Task 3: Implement `LangKernel.execute`

**Files:**
- Modify: `src/kernels/lang/lang.kernel.ts`
- Modify: `tests/kernels/lang.kernel.test.ts`

- [ ] **Step 1: Add execute tests to `tests/kernels/lang.kernel.test.ts`**

Append these tests to the existing file:

```typescript
import { LangKernel } from "../../src/kernels/lang/lang.kernel"
import { Logger } from "../../src/utils/logger"

const logger = new Logger({ verbose: false, dryRun: true })

const ctx: LangContext = {
  langs: [
    {
      name: "node",
      description: "JavaScript runtime",
      misePlugin: "node",
      miseVersion: "latest",
    },
    {
      name: "flutter",
      description: "Flutter SDK",
      misePlugin: "flutter",
      miseVersion: "latest",
      misePluginUrl: "https://github.com/oae/asdf-flutter",
    },
  ],
}

describe("LangKernel", () => {
  it("execute completes without throwing in dry-run mode", async () => {
    const kernel = new LangKernel(logger)
    await expect(kernel.execute(ctx)).resolves.toBeUndefined()
  })

  it("calls onLangProcessed for each lang in dry-run mode", async () => {
    const processed: string[] = []
    const kernel = new LangKernel(logger, { onLangProcessed: (n) => processed.push(n) })
    await kernel.execute(ctx)
    expect(processed).toContain("node")
    expect(processed).toContain("flutter")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test tests/kernels/lang.kernel.test.ts
```

Expected: 3 pass (type tests), 2 fail (execute tests)

- [ ] **Step 3: Implement `execute` in `src/kernels/lang/lang.kernel.ts`**

Replace the placeholder `execute` method:

```typescript
async execute(ctx: LangContext): Promise<void> {
  const dryRun = this.logger.isDryRun

  for (const lang of ctx.langs) {
    this.logger.info(`Installing language: ${lang.name}...`)

    if (lang.misePluginUrl) {
      this.logger.verbose(`mise plugin add ${lang.misePlugin} ${lang.misePluginUrl}`)
      const pluginResult = await runCommand(
        `mise plugin add ${lang.misePlugin} ${lang.misePluginUrl}`,
        { dryRun }
      )
      if (!pluginResult.success) {
        throw new Error(`mise plugin add failed for ${lang.name}: ${pluginResult.stderr}`)
      }
    }

    const installCmd = `mise use --global ${lang.misePlugin}@${lang.miseVersion}`
    this.logger.verbose(`install: ${installCmd}`)
    const result = await runCommand(installCmd, { dryRun })
    if (!result.success) {
      throw new Error(`mise install failed for ${lang.name}: ${result.stderr}`)
    }

    this.options.onLangProcessed?.(lang.name)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test tests/kernels/lang.kernel.test.ts
```

Expected: 5 pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add src/kernels/lang/lang.kernel.ts tests/kernels/lang.kernel.test.ts
git commit -m "feat: implement LangKernel execute with mise plugin support"
```

---

### Task 4: Add `mise` to `default-suite.yaml` and create `raze langs` command

**Files:**
- Modify: `assets/default-suite.yaml`
- Create: `src/cli/commands/langs.ts`
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Add `mise` to `default-suite.yaml`**

Add after the `docker` entry, before the desktop apps section:

```yaml
  - name: mise
    description: Dev tools and language version manager
    binary: mise
    tags: [terminal]
    packages:
      pacman:
        install: mise
      yay:
        install: mise
      dnf:
        pre:
          - curl https://mise.run | sh
        install: ~
      apt:
        pre:
          - curl https://mise.run | sh
        install: ~
      brew:
        install: mise
```

- [ ] **Step 2: Verify loader test still passes**

```bash
bun test tests/config/loader.test.ts
```

Expected: all pass, 0 fail

- [ ] **Step 3: Create `src/cli/commands/langs.ts`**

```typescript
import type { Command } from "commander"
import { loadLangs } from "../../config/langs-loader"
import { LangKernel } from "../../kernels/lang/lang.kernel"
import { Logger } from "../../utils/logger"
import type { GlobalOpts } from "../context"
import { printSummary } from "../context"
import type { KernelResult } from "../../kernels/base.kernel"

export function registerLangs(program: Command): void {
  program
    .command("langs")
    .description("Install programming languages via mise")
    .action(async () => {
      const opts = program.opts() as GlobalOpts
      const logger = new Logger({ verbose: opts.verbose, dryRun: opts.dryRun })
      const ctx = await loadLangs(opts.config)

      if (ctx.langs.length === 0) {
        console.log("No languages configured.")
        return
      }

      const results: KernelResult[] = []
      const kernel = new LangKernel(logger)
      const start = Date.now()

      logger.startSpinner("Running kernel: LangKernel")
      try {
        await kernel.execute(ctx)
        const duration = Date.now() - start
        logger.succeedSpinner("LangKernel completed")
        results.push({ kernel: "LangKernel", status: "success", duration })
      } catch (err: unknown) {
        const duration = Date.now() - start
        const reason = err instanceof Error ? err.message : String(err)
        logger.failSpinner(`LangKernel failed: ${reason}`)
        results.push({ kernel: "LangKernel", status: "failed", reason, duration })
      }

      printSummary(results)
      const failed = results.some((r) => r.status === "failed")
      process.exit(failed ? 1 : 0)
    })
}
```

- [ ] **Step 4: Register `langs` in `src/cli/index.ts`**

```typescript
#!/usr/bin/env bun
import { Command } from "commander"
import { buildContext } from "./context"
import { registerInstall } from "./commands/install"
import { registerSetup } from "./commands/setup"
import { registerUpdate } from "./commands/update"
import { registerDoctor } from "./commands/doctor"
import { registerLangs } from "./commands/langs"

const program = new Command()

program
  .name("raze")
  .description("Raze Automates Zero-Config Environment")
  .version("0.1.0")
  .option("--verbose", "detailed output", false)
  .option("--dry-run", "simulate without executing", false)
  .option("--fail-fast", "stop on first kernel failure", false)
  .option("--config <path>", "alternative config file path")

registerInstall(program, buildContext)
registerSetup(program, buildContext)
registerUpdate(program, buildContext)
registerDoctor(program, buildContext)
registerLangs(program)

program.parse()
```

- [ ] **Step 5: Commit**

```bash
git add assets/default-suite.yaml src/cli/commands/langs.ts src/cli/index.ts
git commit -m "feat: add mise to default suite and raze langs command"
```

---

### Task 5: Full suite green + binary verification + push

**Files:** none modified

- [ ] **Step 1: Run full test suite**

```bash
bun test
```

Expected: 66 pass (60 previous + 3 lang type tests + 2 lang execute tests + 6 langs-loader tests = 71 — verify exact count), 0 fail

- [ ] **Step 2: Build and verify binary**

```bash
bun build ./src/cli/index.ts --compile --outfile dist/raze
./dist/raze --version
./dist/raze --dry-run langs
```

Expected:
- `--version` → `0.1.0`
- `--dry-run langs` → LangKernel installs node, java, dotnet, flutter (dry-run, no real commands run)

- [ ] **Step 3: Push**

```bash
git push
```
