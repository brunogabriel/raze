# Raze Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `raze` CLI — a Bun/TypeScript tool that detects the runtime Linux environment and installs a curated suite of apps using the correct package manager.

**Architecture:** KernelRegistry pattern — isolated kernels (`PackageKernel`, `DesktopKernel`, `DriverKernel`, `SetupKernel`) each implementing `IKernel`. A `Detector` builds a `RuntimeContext` at startup; the `Runner` executes applicable kernels in order.

**Tech Stack:** Bun, TypeScript, commander, ora, chalk. Tests via `bun test`.

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `bunfig.toml`
- Create: `src/cli/index.ts`

- [ ] **Step 1: Initialize Bun project**

```bash
bun init -y
```

Expected output: `package.json`, `tsconfig.json`, `index.ts` created.

- [ ] **Step 2: Install dependencies**

```bash
bun add commander ora chalk
bun add -d @types/bun
```

- [ ] **Step 3: Update package.json**

Replace the generated `package.json` with:

```json
{
  "name": "raze",
  "version": "0.1.0",
  "description": "Raze Automates Zero-Config Environment",
  "bin": {
    "raze": "./src/cli/index.ts"
  },
  "scripts": {
    "start": "bun run src/cli/index.ts",
    "build": "bun build ./src/cli/index.ts --compile --outfile dist/raze",
    "test": "bun test"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^12.0.0",
    "ora": "^8.0.1"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 5: Create bunfig.toml**

```toml
[test]
preload = []
```

- [ ] **Step 6: Remove generated index.ts and create src/cli/index.ts**

```bash
rm -f index.ts
mkdir -p src/cli
```

Create `src/cli/index.ts`:

```ts
#!/usr/bin/env bun
import { Command } from "commander"

const program = new Command()

program
  .name("raze")
  .description("Raze Automates Zero-Config Environment")
  .version("0.1.0")

program.parse()
```

- [ ] **Step 7: Verify CLI runs**

```bash
bun run src/cli/index.ts --version
```

Expected: `0.1.0`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: initialize bun project with commander"
```

---

## Task 2: Base Types

**Files:**
- Create: `src/kernels/base.kernel.ts`
- Create: `tests/kernels/base.kernel.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/kernels/base.kernel.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/kernels/base.kernel.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/kernels/base.kernel.ts**

```ts
export type OS = "linux" | "macos" | "windows"
export type Distro = "arch" | "fedora" | "ubuntu" | "debian" | "unknown"
export type PackageManager = "pacman" | "yay" | "dnf" | "apt" | "brew" | "unknown"
export type AppTag = "terminal" | "desktop" | "driver" | "optional"

export interface PackageSteps {
  pre?: string[]
  install: string
  post?: string[]
}

export interface AppDefinition {
  name: string
  description: string
  tags: AppTag[]
  packages: Partial<Record<Exclude<PackageManager, "unknown">, PackageSteps>>
}

export interface RazeConfig {
  apps: AppDefinition[]
}

export interface RuntimeContext {
  readonly os: OS
  readonly distro: Distro
  readonly packageManager: PackageManager
  readonly hasDesktop: boolean
  readonly config: RazeConfig
}

export type KernelStatus = "success" | "skipped" | "failed"

export interface KernelResult {
  kernel: string
  status: KernelStatus
  reason?: string
  duration: number
}

export interface IKernel {
  name: string
  canHandle(ctx: RuntimeContext): boolean
  execute(ctx: RuntimeContext): Promise<void>
  rollback?(ctx: RuntimeContext): Promise<void>
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/kernels/base.kernel.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/kernels/base.kernel.ts tests/kernels/base.kernel.test.ts
git commit -m "feat: add base kernel types and interfaces"
```

---

## Task 3: shell.ts Utility

**Files:**
- Create: `src/utils/shell.ts`
- Create: `tests/utils/shell.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/shell.test.ts`:

```ts
import { describe, it, expect } from "bun:test"
import { runCommand, type CommandResult } from "../../src/utils/shell"

describe("runCommand", () => {
  it("runs a successful command and returns stdout", async () => {
    const result = await runCommand("echo hello")
    expect(result.success).toBe(true)
    expect(result.stdout.trim()).toBe("hello")
    expect(result.exitCode).toBe(0)
  })

  it("returns failure for non-zero exit commands", async () => {
    const result = await runCommand("exit 1", { shell: true })
    expect(result.success).toBe(false)
    expect(result.exitCode).toBe(1)
  })

  it("captures stderr", async () => {
    const result = await runCommand("echo error >&2", { shell: true })
    expect(result.stderr).toBeDefined()
  })

  it("dry-run mode does not execute command", async () => {
    const result = await runCommand("echo should-not-run", { dryRun: true })
    expect(result.success).toBe(true)
    expect(result.stdout).toBe("")
    expect(result.dryRun).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/utils/shell.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/utils/shell.ts**

```ts
import { $ } from "bun"

export interface CommandOptions {
  shell?: boolean
  dryRun?: boolean
  cwd?: string
}

export interface CommandResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
  dryRun?: boolean
}

export async function runCommand(
  command: string,
  options: CommandOptions = {}
): Promise<CommandResult> {
  if (options.dryRun) {
    return { success: true, exitCode: 0, stdout: "", stderr: "", dryRun: true }
  }

  try {
    const proc = await $`sh -c ${command}`.cwd(options.cwd ?? process.cwd()).quiet()
    return {
      success: proc.exitCode === 0,
      exitCode: proc.exitCode,
      stdout: proc.stdout.toString(),
      stderr: proc.stderr.toString(),
    }
  } catch (err: any) {
    return {
      success: false,
      exitCode: err.exitCode ?? 1,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? String(err),
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/utils/shell.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/shell.ts tests/utils/shell.test.ts
git commit -m "feat: add shell utility with dry-run support"
```

---

## Task 4: logger.ts Utility

**Files:**
- Create: `src/utils/logger.ts`
- Create: `tests/utils/logger.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/logger.test.ts`:

```ts
import { describe, it, expect, mock } from "bun:test"
import { Logger } from "../../src/utils/logger"

describe("Logger", () => {
  it("creates a logger instance", () => {
    const logger = new Logger({ verbose: false, dryRun: false })
    expect(logger).toBeDefined()
  })

  it("verbose flag is accessible", () => {
    const logger = new Logger({ verbose: true, dryRun: false })
    expect(logger.isVerbose).toBe(true)
  })

  it("dryRun flag is accessible", () => {
    const logger = new Logger({ verbose: false, dryRun: true })
    expect(logger.isDryRun).toBe(true)
  })

  it("info does not throw", () => {
    const logger = new Logger({ verbose: false, dryRun: false })
    expect(() => logger.info("test message")).not.toThrow()
  })

  it("warn does not throw", () => {
    const logger = new Logger({ verbose: false, dryRun: false })
    expect(() => logger.warn("test warning")).not.toThrow()
  })

  it("error does not throw", () => {
    const logger = new Logger({ verbose: false, dryRun: false })
    expect(() => logger.error("test error")).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/utils/logger.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/utils/logger.ts**

```ts
import chalk from "chalk"
import ora, { type Ora } from "ora"

export interface LoggerOptions {
  verbose: boolean
  dryRun: boolean
}

export class Logger {
  private options: LoggerOptions
  private spinner: Ora | null = null

  constructor(options: LoggerOptions) {
    this.options = options
  }

  get isVerbose(): boolean {
    return this.options.verbose
  }

  get isDryRun(): boolean {
    return this.options.dryRun
  }

  info(message: string): void {
    if (this.spinner) {
      this.spinner.text = message
    } else {
      console.log(chalk.blue("  info ") + message)
    }
  }

  warn(message: string): void {
    console.warn(chalk.yellow("  warn ") + message)
  }

  error(message: string): void {
    console.error(chalk.red(" error ") + message)
  }

  verbose(message: string): void {
    if (this.options.verbose) {
      console.log(chalk.gray("   cmd ") + message)
    }
  }

  startSpinner(text: string): void {
    this.spinner = ora(text).start()
  }

  succeedSpinner(text: string): void {
    this.spinner?.succeed(chalk.green(text))
    this.spinner = null
  }

  failSpinner(text: string): void {
    this.spinner?.fail(chalk.red(text))
    this.spinner = null
  }

  warnSpinner(text: string): void {
    this.spinner?.warn(chalk.yellow(text))
    this.spinner = null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/utils/logger.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/logger.ts tests/utils/logger.test.ts
git commit -m "feat: add Logger utility with ora and chalk"
```

---

## Task 5: Detector

**Files:**
- Create: `src/core/detector.ts`
- Create: `tests/core/detector.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/detector.test.ts`:

```ts
import { describe, it, expect, mock, beforeEach } from "bun:test"
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
    // This test runs on Linux CI; skip on other platforms
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/core/detector.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/core/detector.ts**

```ts
import { readFileSync } from "fs"
import { existsSync } from "fs"
import type {
  OS,
  Distro,
  PackageManager,
  RuntimeContext,
  RazeConfig,
} from "../kernels/base.kernel"

interface DetectorOptions {
  osReleasePath?: string
  pathOverride?: string[]
}

export class Detector {
  private osReleasePath: string
  private pathOverride: string[] | undefined

  constructor(options: DetectorOptions = {}) {
    this.osReleasePath = options.osReleasePath ?? "/etc/os-release"
    this.pathOverride = options.pathOverride
  }

  async detect(config: RazeConfig): Promise<RuntimeContext> {
    const os = this.detectOS()
    const distro = this.detectDistro()
    const packageManager = await this.detectPackageManager()
    const hasDesktop = this.detectDesktop()

    return Object.freeze({ os, distro, packageManager, hasDesktop, config })
  }

  private detectOS(): OS {
    switch (process.platform) {
      case "linux": return "linux"
      case "darwin": return "macos"
      case "win32": return "windows"
      default: return "linux"
    }
  }

  private detectDistro(): Distro {
    if (!existsSync(this.osReleasePath)) return "unknown"

    try {
      const content = readFileSync(this.osReleasePath, "utf-8")
      const id = content.match(/^ID=(.+)$/m)?.[1]?.toLowerCase().replace(/"/g, "") ?? ""
      const idLike = content.match(/^ID_LIKE=(.+)$/m)?.[1]?.toLowerCase() ?? ""

      if (id === "arch" || idLike.includes("arch")) return "arch"
      if (id === "fedora" || idLike.includes("fedora")) return "fedora"
      if (id === "ubuntu" || idLike.includes("ubuntu")) return "ubuntu"
      if (id === "debian" || idLike.includes("debian")) return "debian"
      return "unknown"
    } catch {
      return "unknown"
    }
  }

  private async detectPackageManager(): Promise<PackageManager> {
    const candidates: Array<{ cmd: string; name: PackageManager }> = [
      { cmd: "yay", name: "yay" },
      { cmd: "pacman", name: "pacman" },
      { cmd: "dnf", name: "dnf" },
      { cmd: "apt-get", name: "apt" },
      { cmd: "brew", name: "brew" },
    ]

    for (const { cmd, name } of candidates) {
      if (await this.commandExists(cmd)) return name
    }
    return "unknown"
  }

  private async commandExists(cmd: string): Promise<boolean> {
    if (this.pathOverride !== undefined && this.pathOverride.length === 0) {
      return false
    }
    try {
      const proc = Bun.spawnSync(["which", cmd], { stderr: "pipe", stdout: "pipe" })
      return proc.exitCode === 0
    } catch {
      return false
    }
  }

  private detectDesktop(): boolean {
    return !!(
      process.env.DISPLAY ||
      process.env.WAYLAND_DISPLAY ||
      process.env.XDG_SESSION_TYPE
    )
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/core/detector.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/detector.ts tests/core/detector.test.ts
git commit -m "feat: add Detector to build RuntimeContext"
```

---

## Task 6: KernelRegistry

**Files:**
- Create: `src/core/kernel-registry.ts`
- Create: `tests/core/kernel-registry.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/kernel-registry.test.ts`:

```ts
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
    expect(applicable[0].name).toBe("always")
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/core/kernel-registry.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/core/kernel-registry.ts**

```ts
import type { IKernel, RuntimeContext } from "../kernels/base.kernel"

export class KernelRegistry {
  private kernels: IKernel[] = []

  register(kernel: IKernel): void {
    if (this.kernels.some((k) => k.name === kernel.name)) {
      throw new Error(`Kernel "${kernel.name}" is already registered`)
    }
    this.kernels.push(kernel)
  }

  getApplicable(ctx: RuntimeContext): IKernel[] {
    return this.kernels.filter((k) => k.canHandle(ctx))
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/core/kernel-registry.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/kernel-registry.ts tests/core/kernel-registry.test.ts
git commit -m "feat: add KernelRegistry"
```

---

## Task 7: Runner

**Files:**
- Create: `src/core/runner.ts`
- Create: `tests/core/runner.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/runner.test.ts`:

```ts
import { describe, it, expect } from "bun:test"
import { Runner } from "../../src/core/runner"
import { Logger } from "../../src/utils/logger"
import type { IKernel, RuntimeContext } from "../../src/kernels/base.kernel"

const baseCtx: RuntimeContext = {
  os: "linux",
  distro: "arch",
  packageManager: "pacman",
  hasDesktop: false,
  config: { apps: [] },
}

const logger = new Logger({ verbose: false, dryRun: false })

describe("Runner", () => {
  it("returns empty results for no kernels", async () => {
    const runner = new Runner(logger)
    const results = await runner.run([], baseCtx)
    expect(results).toHaveLength(0)
  })

  it("returns success result for a passing kernel", async () => {
    const kernel: IKernel = {
      name: "ok",
      canHandle: () => true,
      execute: async () => {},
    }
    const runner = new Runner(logger)
    const results = await runner.run([kernel], baseCtx)
    expect(results[0].status).toBe("success")
    expect(results[0].kernel).toBe("ok")
    expect(results[0].duration).toBeGreaterThanOrEqual(0)
  })

  it("returns failed result when kernel throws", async () => {
    const kernel: IKernel = {
      name: "bad",
      canHandle: () => true,
      execute: async () => { throw new Error("boom") },
    }
    const runner = new Runner(logger)
    const results = await runner.run([kernel], baseCtx)
    expect(results[0].status).toBe("failed")
    expect(results[0].reason).toContain("boom")
  })

  it("continues after failure by default", async () => {
    const bad: IKernel = {
      name: "bad",
      canHandle: () => true,
      execute: async () => { throw new Error("fail") },
    }
    const good: IKernel = {
      name: "good",
      canHandle: () => true,
      execute: async () => {},
    }
    const runner = new Runner(logger)
    const results = await runner.run([bad, good], baseCtx)
    expect(results).toHaveLength(2)
    expect(results[1].status).toBe("success")
  })

  it("stops on first failure with failFast option", async () => {
    const bad: IKernel = {
      name: "bad",
      canHandle: () => true,
      execute: async () => { throw new Error("fail") },
    }
    const good: IKernel = {
      name: "good",
      canHandle: () => true,
      execute: async () => {},
    }
    const runner = new Runner(logger, { failFast: true })
    const results = await runner.run([bad, good], baseCtx)
    expect(results).toHaveLength(1)
    expect(results[0].status).toBe("failed")
  })

  it("calls rollback on failed kernels when failFast is true", async () => {
    let rolledBack = false
    const bad: IKernel = {
      name: "bad",
      canHandle: () => true,
      execute: async () => { throw new Error("fail") },
      rollback: async () => { rolledBack = true },
    }
    const runner = new Runner(logger, { failFast: true })
    await runner.run([bad], baseCtx)
    expect(rolledBack).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/core/runner.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/core/runner.ts**

```ts
import type { IKernel, KernelResult, RuntimeContext } from "../kernels/base.kernel"
import type { Logger } from "../utils/logger"

interface RunnerOptions {
  failFast?: boolean
}

export class Runner {
  private logger: Logger
  private options: RunnerOptions

  constructor(logger: Logger, options: RunnerOptions = {}) {
    this.logger = logger
    this.options = options
  }

  async run(kernels: IKernel[], ctx: RuntimeContext): Promise<KernelResult[]> {
    const results: KernelResult[] = []
    const executed: IKernel[] = []

    for (const kernel of kernels) {
      const start = Date.now()
      this.logger.startSpinner(`Running kernel: ${kernel.name}`)

      try {
        await kernel.execute(ctx)
        const duration = Date.now() - start
        this.logger.succeedSpinner(`${kernel.name} completed`)
        results.push({ kernel: kernel.name, status: "success", duration })
        executed.push(kernel)
      } catch (err: any) {
        const duration = Date.now() - start
        const reason = err?.message ?? String(err)
        this.logger.failSpinner(`${kernel.name} failed: ${reason}`)
        results.push({ kernel: kernel.name, status: "failed", reason, duration })

        if (this.options.failFast) {
          await this.rollbackAll([...executed, kernel], ctx)
          break
        }
      }
    }

    return results
  }

  private async rollbackAll(kernels: IKernel[], ctx: RuntimeContext): Promise<void> {
    for (const kernel of kernels.reverse()) {
      if (kernel.rollback) {
        try {
          await kernel.rollback(ctx)
        } catch {
          // rollback failures are silently ignored
        }
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/core/runner.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/runner.ts tests/core/runner.test.ts
git commit -m "feat: add Runner with fail-fast and rollback support"
```

---

## Task 8: Default Suite Config

**Files:**
- Create: `src/config/default-suite.ts`
- Create: `src/config/loader.ts`
- Create: `tests/config/loader.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/config/loader.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/config/loader.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create src/config/default-suite.ts**

```ts
import type { RazeConfig } from "../kernels/base.kernel"

export const defaultSuite: RazeConfig = {
  apps: [
    // Terminal apps
    {
      name: "neovim",
      description: "Modal text editor",
      tags: ["terminal"],
      packages: {
        pacman: { install: "neovim" },
        yay: { install: "neovim" },
        dnf: { install: "neovim" },
        apt: {
          pre: ["add-apt-repository ppa:neovim-ppa/unstable -y", "apt-get update -y"],
          install: "neovim",
        },
        brew: { install: "neovim" },
      },
    },
    {
      name: "tmux",
      description: "Terminal multiplexer",
      tags: ["terminal"],
      packages: {
        pacman: { install: "tmux" },
        yay: { install: "tmux" },
        dnf: { install: "tmux" },
        apt: { install: "tmux" },
        brew: { install: "tmux" },
      },
    },
    {
      name: "zsh",
      description: "Z shell",
      tags: ["terminal"],
      packages: {
        pacman: { install: "zsh" },
        yay: { install: "zsh" },
        dnf: { install: "zsh" },
        apt: { install: "zsh" },
        brew: { install: "zsh" },
      },
    },
    {
      name: "fzf",
      description: "Fuzzy finder",
      tags: ["terminal"],
      packages: {
        pacman: { install: "fzf" },
        yay: { install: "fzf" },
        dnf: { install: "fzf" },
        apt: { install: "fzf" },
        brew: { install: "fzf" },
      },
    },
    {
      name: "ripgrep",
      description: "Fast grep alternative",
      tags: ["terminal"],
      packages: {
        pacman: { install: "ripgrep" },
        yay: { install: "ripgrep" },
        dnf: { install: "ripgrep" },
        apt: { install: "ripgrep" },
        brew: { install: "ripgrep" },
      },
    },
    {
      name: "bat",
      description: "cat with syntax highlighting",
      tags: ["terminal"],
      packages: {
        pacman: { install: "bat" },
        yay: { install: "bat" },
        dnf: { install: "bat" },
        apt: { install: "bat" },
        brew: { install: "bat" },
      },
    },
    {
      name: "eza",
      description: "Modern ls replacement",
      tags: ["terminal"],
      packages: {
        pacman: { install: "eza" },
        yay: { install: "eza" },
        dnf: { install: "eza" },
        apt: {
          pre: [
            "apt-get install -y gpg",
            "mkdir -p /etc/apt/keyrings",
            "wget -qO- https://raw.githubusercontent.com/eza-community/eza/main/deb.asc | gpg --dearmor -o /etc/apt/keyrings/gierens.gpg",
            'echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] http://deb.gierens.de stable main" | tee /etc/apt/sources.list.d/gierens.list',
            "apt-get update -y",
          ],
          install: "eza",
        },
        brew: { install: "eza" },
      },
    },
    {
      name: "starship",
      description: "Cross-shell prompt",
      tags: ["terminal"],
      packages: {
        pacman: { install: "starship" },
        yay: { install: "starship" },
        dnf: { install: "starship" },
        apt: {
          pre: ['sh -c "$(curl -fsSL https://starship.rs/install.sh)" -- --yes'],
          install: "starship",
        },
        brew: { install: "starship" },
      },
    },
    {
      name: "lazygit",
      description: "Terminal UI for git",
      tags: ["terminal"],
      packages: {
        pacman: { install: "lazygit" },
        yay: { install: "lazygit" },
        dnf: {
          pre: ["dnf copr enable atim/lazygit -y"],
          install: "lazygit",
        },
        apt: {
          pre: [
            "LAZYGIT_VERSION=$(curl -s \"https://api.github.com/repos/jesseduffield/lazygit/releases/latest\" | grep -Po '\"tag_name\": \"v\\K[^\"]*')",
            'curl -Lo lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz"',
            "tar xf lazygit.tar.gz lazygit",
            "install lazygit /usr/local/bin",
          ],
          install: "lazygit",
        },
        brew: { install: "lazygit" },
      },
    },
    // Desktop apps
    {
      name: "alacritty",
      description: "GPU-accelerated terminal emulator",
      tags: ["desktop"],
      packages: {
        pacman: { install: "alacritty" },
        yay: { install: "alacritty" },
        dnf: { install: "alacritty" },
        apt: { install: "alacritty" },
        brew: { install: "--cask alacritty" },
      },
    },
    {
      name: "firefox",
      description: "Web browser",
      tags: ["desktop"],
      packages: {
        pacman: { install: "firefox" },
        yay: { install: "firefox" },
        dnf: { install: "firefox" },
        apt: { install: "firefox" },
        brew: { install: "--cask firefox" },
      },
    },
    {
      name: "vlc",
      description: "Media player",
      tags: ["desktop"],
      packages: {
        pacman: { install: "vlc" },
        yay: { install: "vlc" },
        dnf: { install: "vlc" },
        apt: { install: "vlc" },
        brew: { install: "--cask vlc" },
      },
    },
    {
      name: "obsidian",
      description: "Knowledge base and note-taking",
      tags: ["desktop"],
      packages: {
        yay: { install: "obsidian" },
        pacman: {
          pre: ["yay -S obsidian --noconfirm || true"],
          install: "obsidian",
        },
        dnf: {
          pre: [
            "OBSIDIAN_VERSION=$(curl -s https://api.github.com/repos/obsidianmd/obsidian-releases/releases/latest | grep -oP '(?<=\"tag_name\": \"v)[^\"]*')",
            'curl -Lo obsidian.rpm "https://github.com/obsidianmd/obsidian-releases/releases/latest/download/Obsidian-${OBSIDIAN_VERSION}.rpm"',
          ],
          install: "obsidian.rpm",
        },
        apt: {
          pre: [
            "OBSIDIAN_VERSION=$(curl -s https://api.github.com/repos/obsidianmd/obsidian-releases/releases/latest | grep -oP '(?<=\"tag_name\": \"v)[^\"]*')",
            'curl -Lo obsidian.deb "https://github.com/obsidianmd/obsidian-releases/releases/latest/download/obsidian_${OBSIDIAN_VERSION}_amd64.deb"',
          ],
          install: "obsidian.deb",
        },
        brew: { install: "--cask obsidian" },
      },
    },
  ],
}
```

- [ ] **Step 4: Create src/config/loader.ts**

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

```bash
bun test tests/config/loader.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/config/default-suite.ts src/config/loader.ts tests/config/loader.test.ts
git commit -m "feat: add default app suite and config loader"
```

---

## Task 9: PackageKernel

**Files:**
- Create: `src/kernels/package/package.kernel.ts`
- Create: `tests/kernels/package.kernel.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/kernels/package.kernel.test.ts`:

```ts
import { describe, it, expect } from "bun:test"
import { PackageKernel } from "../../src/kernels/package/package.kernel"
import { Logger } from "../../src/utils/logger"
import type { RuntimeContext } from "../../src/kernels/base.kernel"

const logger = new Logger({ verbose: false, dryRun: true })

const archCtx: RuntimeContext = {
  os: "linux",
  distro: "arch",
  packageManager: "pacman",
  hasDesktop: false,
  config: {
    apps: [
      {
        name: "neovim",
        description: "Editor",
        tags: ["terminal"],
        packages: {
          pacman: { install: "neovim" },
          apt: { pre: ["add-apt-repository ppa:neovim-ppa/unstable -y"], install: "neovim" },
        },
      },
      {
        name: "alacritty",
        description: "Terminal",
        tags: ["desktop"],
        packages: { pacman: { install: "alacritty" } },
      },
    ],
  },
}

describe("PackageKernel", () => {
  it("canHandle returns true for any OS with known package manager", () => {
    const kernel = new PackageKernel(logger)
    expect(kernel.canHandle(archCtx)).toBe(true)
  })

  it("canHandle returns false when package manager is unknown", () => {
    const kernel = new PackageKernel(logger)
    const ctx: RuntimeContext = { ...archCtx, packageManager: "unknown" }
    expect(kernel.canHandle(ctx)).toBe(false)
  })

  it("execute completes without throwing in dry-run mode", async () => {
    const kernel = new PackageKernel(logger)
    await expect(kernel.execute(archCtx)).resolves.toBeUndefined()
  })

  it("only processes terminal-tagged apps (not desktop)", async () => {
    const processed: string[] = []
    const kernel = new PackageKernel(logger, {
      onAppProcessed: (name) => processed.push(name),
    })
    await kernel.execute(archCtx)
    expect(processed).toContain("neovim")
    expect(processed).not.toContain("alacritty")
  })

  it("skips app when package manager entry is missing", async () => {
    const skipped: string[] = []
    const ctx: RuntimeContext = {
      ...archCtx,
      packageManager: "dnf",
      config: {
        apps: [
          {
            name: "arch-only",
            description: "Arch only",
            tags: ["terminal"],
            packages: { pacman: { install: "arch-only" } },
          },
        ],
      },
    }
    const kernel = new PackageKernel(logger, { onAppSkipped: (name) => skipped.push(name) })
    await kernel.execute(ctx)
    expect(skipped).toContain("arch-only")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/kernels/package.kernel.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/kernels/package/package.kernel.ts**

```ts
import type { IKernel, RuntimeContext, PackageManager } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { runCommand } from "../../utils/shell"

interface PackageKernelOptions {
  onAppProcessed?: (name: string) => void
  onAppSkipped?: (name: string) => void
}

const INSTALL_COMMANDS: Record<Exclude<PackageManager, "unknown">, string> = {
  pacman: "pacman -S --noconfirm",
  yay: "yay -S --noconfirm",
  dnf: "dnf install -y",
  apt: "apt-get install -y",
  brew: "brew install",
}

export class PackageKernel implements IKernel {
  name = "PackageKernel"
  private logger: Logger
  private options: PackageKernelOptions

  constructor(logger: Logger, options: PackageKernelOptions = {}) {
    this.logger = logger
    this.options = options
  }

  canHandle(ctx: RuntimeContext): boolean {
    return ctx.packageManager !== "unknown"
  }

  async execute(ctx: RuntimeContext): Promise<void> {
    const pm = ctx.packageManager as Exclude<PackageManager, "unknown">
    const terminalApps = ctx.config.apps.filter((a) => a.tags.includes("terminal"))
    const dryRun = this.logger.isDryRun

    for (const app of terminalApps) {
      const steps = app.packages[pm]

      if (!steps) {
        this.logger.warn(`Skipping ${app.name}: no entry for ${pm}`)
        this.options.onAppSkipped?.(app.name)
        continue
      }

      this.logger.info(`Installing ${app.name}...`)

      for (const pre of steps.pre ?? []) {
        this.logger.verbose(`pre: ${pre}`)
        const result = await runCommand(pre, { dryRun })
        if (!result.success) throw new Error(`pre-step failed for ${app.name}: ${result.stderr}`)
      }

      const installCmd = `${INSTALL_COMMANDS[pm]} ${steps.install}`
      this.logger.verbose(`install: ${installCmd}`)
      const result = await runCommand(installCmd, { dryRun })
      if (!result.success) throw new Error(`install failed for ${app.name}: ${result.stderr}`)

      for (const post of steps.post ?? []) {
        this.logger.verbose(`post: ${post}`)
        const postResult = await runCommand(post, { dryRun })
        if (!postResult.success) throw new Error(`post-step failed for ${app.name}: ${postResult.stderr}`)
      }

      this.options.onAppProcessed?.(app.name)
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/kernels/package.kernel.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/kernels/package/package.kernel.ts tests/kernels/package.kernel.test.ts
git commit -m "feat: add PackageKernel with pre/post step support"
```

---

## Task 10: DesktopKernel

**Files:**
- Create: `src/kernels/desktop/desktop.kernel.ts`
- Create: `tests/kernels/desktop.kernel.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/kernels/desktop.kernel.test.ts`:

```ts
import { describe, it, expect } from "bun:test"
import { DesktopKernel } from "../../src/kernels/desktop/desktop.kernel"
import { Logger } from "../../src/utils/logger"
import type { RuntimeContext } from "../../src/kernels/base.kernel"

const logger = new Logger({ verbose: false, dryRun: true })

const desktopCtx: RuntimeContext = {
  os: "linux",
  distro: "arch",
  packageManager: "pacman",
  hasDesktop: true,
  config: {
    apps: [
      {
        name: "alacritty",
        description: "Terminal emulator",
        tags: ["desktop"],
        packages: { pacman: { install: "alacritty" } },
      },
      {
        name: "neovim",
        description: "Editor",
        tags: ["terminal"],
        packages: { pacman: { install: "neovim" } },
      },
    ],
  },
}

describe("DesktopKernel", () => {
  it("canHandle returns true when hasDesktop is true", () => {
    const kernel = new DesktopKernel(logger)
    expect(kernel.canHandle(desktopCtx)).toBe(true)
  })

  it("canHandle returns false when hasDesktop is false", () => {
    const kernel = new DesktopKernel(logger)
    const ctx: RuntimeContext = { ...desktopCtx, hasDesktop: false }
    expect(kernel.canHandle(ctx)).toBe(false)
  })

  it("execute completes without throwing in dry-run mode", async () => {
    const kernel = new DesktopKernel(logger)
    await expect(kernel.execute(desktopCtx)).resolves.toBeUndefined()
  })

  it("only processes desktop-tagged apps", async () => {
    const processed: string[] = []
    const kernel = new DesktopKernel(logger, { onAppProcessed: (n) => processed.push(n) })
    await kernel.execute(desktopCtx)
    expect(processed).toContain("alacritty")
    expect(processed).not.toContain("neovim")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/kernels/desktop.kernel.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/kernels/desktop/desktop.kernel.ts**

```ts
import type { IKernel, RuntimeContext, PackageManager } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { runCommand } from "../../utils/shell"

interface DesktopKernelOptions {
  onAppProcessed?: (name: string) => void
  onAppSkipped?: (name: string) => void
}

const INSTALL_COMMANDS: Record<Exclude<PackageManager, "unknown">, string> = {
  pacman: "pacman -S --noconfirm",
  yay: "yay -S --noconfirm",
  dnf: "dnf install -y",
  apt: "apt-get install -y",
  brew: "brew install",
}

export class DesktopKernel implements IKernel {
  name = "DesktopKernel"
  private logger: Logger
  private options: DesktopKernelOptions

  constructor(logger: Logger, options: DesktopKernelOptions = {}) {
    this.logger = logger
    this.options = options
  }

  canHandle(ctx: RuntimeContext): boolean {
    return ctx.hasDesktop
  }

  async execute(ctx: RuntimeContext): Promise<void> {
    const pm = ctx.packageManager as Exclude<PackageManager, "unknown">
    const desktopApps = ctx.config.apps.filter((a) => a.tags.includes("desktop"))
    const dryRun = this.logger.isDryRun

    for (const app of desktopApps) {
      const steps = app.packages[pm]

      if (!steps) {
        this.logger.warn(`Skipping ${app.name}: no entry for ${pm}`)
        this.options.onAppSkipped?.(app.name)
        continue
      }

      this.logger.info(`Installing desktop app: ${app.name}...`)

      for (const pre of steps.pre ?? []) {
        this.logger.verbose(`pre: ${pre}`)
        const result = await runCommand(pre, { dryRun })
        if (!result.success) throw new Error(`pre-step failed for ${app.name}: ${result.stderr}`)
      }

      const installCmd = `${INSTALL_COMMANDS[pm]} ${steps.install}`
      this.logger.verbose(`install: ${installCmd}`)
      const result = await runCommand(installCmd, { dryRun })
      if (!result.success) throw new Error(`install failed for ${app.name}: ${result.stderr}`)

      for (const post of steps.post ?? []) {
        this.logger.verbose(`post: ${post}`)
        const postResult = await runCommand(post, { dryRun })
        if (!postResult.success) throw new Error(`post-step failed for ${app.name}: ${postResult.stderr}`)
      }

      this.options.onAppProcessed?.(app.name)
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/kernels/desktop.kernel.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/kernels/desktop/desktop.kernel.ts tests/kernels/desktop.kernel.test.ts
git commit -m "feat: add DesktopKernel for GUI app installation"
```

---

## Task 11: DriverKernel

**Files:**
- Create: `src/kernels/driver/driver.kernel.ts`
- Create: `tests/kernels/driver.kernel.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/kernels/driver.kernel.test.ts`:

```ts
import { describe, it, expect } from "bun:test"
import { DriverKernel } from "../../src/kernels/driver/driver.kernel"
import { Logger } from "../../src/utils/logger"
import type { RuntimeContext } from "../../src/kernels/base.kernel"

const logger = new Logger({ verbose: false, dryRun: true })

const archCtx: RuntimeContext = {
  os: "linux",
  distro: "arch",
  packageManager: "pacman",
  hasDesktop: false,
  config: {
    apps: [
      {
        name: "nvidia-driver",
        description: "NVIDIA driver",
        tags: ["driver"],
        packages: { pacman: { install: "nvidia" } },
      },
      {
        name: "neovim",
        description: "Editor",
        tags: ["terminal"],
        packages: { pacman: { install: "neovim" } },
      },
    ],
  },
}

describe("DriverKernel", () => {
  it("canHandle returns true when there are driver-tagged apps", () => {
    const kernel = new DriverKernel(logger)
    expect(kernel.canHandle(archCtx)).toBe(true)
  })

  it("canHandle returns false when there are no driver-tagged apps", () => {
    const kernel = new DriverKernel(logger)
    const ctx: RuntimeContext = {
      ...archCtx,
      config: { apps: [archCtx.config.apps[1]] },
    }
    expect(kernel.canHandle(ctx)).toBe(false)
  })

  it("execute completes without throwing in dry-run mode", async () => {
    const kernel = new DriverKernel(logger)
    await expect(kernel.execute(archCtx)).resolves.toBeUndefined()
  })

  it("only processes driver-tagged apps", async () => {
    const processed: string[] = []
    const kernel = new DriverKernel(logger, { onAppProcessed: (n) => processed.push(n) })
    await kernel.execute(archCtx)
    expect(processed).toContain("nvidia-driver")
    expect(processed).not.toContain("neovim")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/kernels/driver.kernel.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/kernels/driver/driver.kernel.ts**

```ts
import type { IKernel, RuntimeContext, PackageManager } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { runCommand } from "../../utils/shell"

interface DriverKernelOptions {
  onAppProcessed?: (name: string) => void
  onAppSkipped?: (name: string) => void
}

const INSTALL_COMMANDS: Record<Exclude<PackageManager, "unknown">, string> = {
  pacman: "pacman -S --noconfirm",
  yay: "yay -S --noconfirm",
  dnf: "dnf install -y",
  apt: "apt-get install -y",
  brew: "brew install",
}

export class DriverKernel implements IKernel {
  name = "DriverKernel"
  private logger: Logger
  private options: DriverKernelOptions

  constructor(logger: Logger, options: DriverKernelOptions = {}) {
    this.logger = logger
    this.options = options
  }

  canHandle(ctx: RuntimeContext): boolean {
    return ctx.config.apps.some((a) => a.tags.includes("driver"))
  }

  async execute(ctx: RuntimeContext): Promise<void> {
    const pm = ctx.packageManager as Exclude<PackageManager, "unknown">
    const driverApps = ctx.config.apps.filter((a) => a.tags.includes("driver"))
    const dryRun = this.logger.isDryRun

    for (const app of driverApps) {
      const steps = app.packages[pm]

      if (!steps) {
        this.logger.warn(`Skipping driver ${app.name}: no entry for ${pm}`)
        this.options.onAppSkipped?.(app.name)
        continue
      }

      this.logger.info(`Installing driver: ${app.name}...`)

      for (const pre of steps.pre ?? []) {
        this.logger.verbose(`pre: ${pre}`)
        const result = await runCommand(pre, { dryRun })
        if (!result.success) throw new Error(`pre-step failed for ${app.name}: ${result.stderr}`)
      }

      const installCmd = `${INSTALL_COMMANDS[pm]} ${steps.install}`
      this.logger.verbose(`install: ${installCmd}`)
      const result = await runCommand(installCmd, { dryRun })
      if (!result.success) throw new Error(`install failed for ${app.name}: ${result.stderr}`)

      for (const post of steps.post ?? []) {
        this.logger.verbose(`post: ${post}`)
        const postResult = await runCommand(post, { dryRun })
        if (!postResult.success) throw new Error(`post-step failed for ${app.name}: ${postResult.stderr}`)
      }

      this.options.onAppProcessed?.(app.name)
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/kernels/driver.kernel.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/kernels/driver/driver.kernel.ts tests/kernels/driver.kernel.test.ts
git commit -m "feat: add DriverKernel for driver installation"
```

---

## Task 12: SetupKernel

**Files:**
- Create: `src/kernels/setup/setup.kernel.ts`
- Create: `tests/kernels/setup.kernel.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/kernels/setup.kernel.test.ts`:

```ts
import { describe, it, expect } from "bun:test"
import { SetupKernel } from "../../src/kernels/setup/setup.kernel"
import { Logger } from "../../src/utils/logger"
import type { RuntimeContext } from "../../src/kernels/base.kernel"

const logger = new Logger({ verbose: false, dryRun: true })

const ctx: RuntimeContext = {
  os: "linux",
  distro: "arch",
  packageManager: "pacman",
  hasDesktop: false,
  config: { apps: [] },
}

describe("SetupKernel", () => {
  it("canHandle always returns true", () => {
    const kernel = new SetupKernel(logger)
    expect(kernel.canHandle(ctx)).toBe(true)
  })

  it("execute completes without throwing in dry-run mode", async () => {
    const kernel = new SetupKernel(logger)
    await expect(kernel.execute(ctx)).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/kernels/setup.kernel.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/kernels/setup/setup.kernel.ts**

```ts
import type { IKernel, RuntimeContext } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { runCommand } from "../../utils/shell"

export class SetupKernel implements IKernel {
  name = "SetupKernel"
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  canHandle(_ctx: RuntimeContext): boolean {
    return true
  }

  async execute(_ctx: RuntimeContext): Promise<void> {
    const dryRun = this.logger.isDryRun
    this.logger.info("Running setup steps...")

    // Change default shell to zsh if available
    const zshPath = await runCommand("which zsh", { dryRun: false })
    if (zshPath.success) {
      this.logger.info("Setting zsh as default shell...")
      await runCommand(`chsh -s ${zshPath.stdout.trim()}`, { dryRun })
    }

    this.logger.info("Setup complete.")
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/kernels/setup.kernel.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/kernels/setup/setup.kernel.ts tests/kernels/setup.kernel.test.ts
git commit -m "feat: add SetupKernel for post-install configuration"
```

---

## Task 13: Wire CLI Commands

**Files:**
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Update src/cli/index.ts with all commands**

```ts
#!/usr/bin/env bun
import { Command } from "commander"
import { Detector } from "../core/detector"
import { KernelRegistry } from "../core/kernel-registry"
import { Runner } from "../core/runner"
import { Logger } from "../utils/logger"
import { loadConfig } from "../config/loader"
import { PackageKernel } from "../kernels/package/package.kernel"
import { DesktopKernel } from "../kernels/desktop/desktop.kernel"
import { DriverKernel } from "../kernels/driver/driver.kernel"
import { SetupKernel } from "../kernels/setup/setup.kernel"

const program = new Command()

program
  .name("raze")
  .description("Raze Automates Zero-Config Environment")
  .version("0.1.0")
  .option("--verbose", "detailed output", false)
  .option("--dry-run", "simulate without executing", false)
  .option("--fail-fast", "stop on first kernel failure", false)
  .option("--config <path>", "alternative config file path")

async function buildContext(opts: {
  verbose: boolean
  dryRun: boolean
  config?: string
}) {
  const logger = new Logger({ verbose: opts.verbose, dryRun: opts.dryRun })
  const config = await loadConfig(opts.config)
  const detector = new Detector()
  const ctx = await detector.detect(config)
  return { logger, ctx }
}

program
  .command("install")
  .description("Install all suite apps")
  .action(async () => {
    const opts = program.opts()
    const { logger, ctx } = await buildContext(opts)

    const registry = new KernelRegistry()
    registry.register(new PackageKernel(logger))
    registry.register(new DesktopKernel(logger))
    registry.register(new DriverKernel(logger))
    registry.register(new SetupKernel(logger))

    const runner = new Runner(logger, { failFast: opts.failFast })
    const kernels = registry.getApplicable(ctx)
    const results = await runner.run(kernels, ctx)

    printSummary(results)
    const failed = results.some((r) => r.status === "failed")
    process.exit(failed ? 1 : 0)
  })

program
  .command("setup")
  .description("Configure dotfiles, symlinks, and initial configs")
  .action(async () => {
    const opts = program.opts()
    const { logger, ctx } = await buildContext(opts)

    const registry = new KernelRegistry()
    registry.register(new SetupKernel(logger))

    const runner = new Runner(logger, { failFast: opts.failFast })
    const kernels = registry.getApplicable(ctx)
    const results = await runner.run(kernels, ctx)

    printSummary(results)
    const failed = results.some((r) => r.status === "failed")
    process.exit(failed ? 1 : 0)
  })

program
  .command("update")
  .description("Update apps installed by raze")
  .action(async () => {
    const opts = program.opts()
    const { logger, ctx } = await buildContext(opts)

    const pm = ctx.packageManager
    if (pm === "unknown") {
      logger.error("No supported package manager detected.")
      process.exit(1)
    }

    const updateCommands: Record<string, string> = {
      pacman: "pacman -Syu --noconfirm",
      yay: "yay -Syu --noconfirm",
      dnf: "dnf upgrade -y",
      apt: "apt-get update -y && apt-get upgrade -y",
      brew: "brew upgrade",
    }

    const { runCommand } = await import("../utils/shell")
    logger.info(`Updating system packages with ${pm}...`)
    const result = await runCommand(updateCommands[pm], { dryRun: opts.dryRun })
    if (!result.success) {
      logger.error(`Update failed: ${result.stderr}`)
      process.exit(1)
    }
    logger.info("Update complete.")
  })

program
  .command("doctor")
  .description("Diagnose installed apps and detect issues")
  .action(async () => {
    const opts = program.opts()
    const { logger, ctx } = await buildContext(opts)

    console.log(`\nOS:              ${ctx.os}`)
    console.log(`Distro:          ${ctx.distro}`)
    console.log(`Package Manager: ${ctx.packageManager}`)
    console.log(`Desktop:         ${ctx.hasDesktop ? "yes" : "no"}`)
    console.log(`\nApp Suite:`)

    const { runCommand } = await import("../utils/shell")
    for (const app of ctx.config.apps) {
      const check = await runCommand(`which ${app.name}`)
      const status = check.success ? "installed" : "missing"
      const icon = check.success ? "✓" : "✗"
      console.log(`  ${icon} ${app.name.padEnd(20)} ${status}`)
    }
  })

program
  .command("list")
  .description("List suite apps with installed/pending status")
  .action(async () => {
    const opts = program.opts()
    const { logger, ctx } = await buildContext(opts)

    const { runCommand } = await import("../utils/shell")
    console.log("\nRaze App Suite:\n")
    for (const app of ctx.config.apps) {
      const check = await runCommand(`which ${app.name}`)
      const status = check.success ? "installed" : "pending"
      const tags = app.tags.join(", ")
      console.log(`  ${app.name.padEnd(20)} [${tags}]  ${status}`)
    }
  })

function printSummary(results: Array<{ kernel: string; status: string; reason?: string; duration: number }>) {
  console.log("\n--- Summary ---")
  for (const r of results) {
    const icon = r.status === "success" ? "✓" : r.status === "skipped" ? "-" : "✗"
    const line = `  ${icon} ${r.kernel.padEnd(20)} ${r.status}  (${r.duration}ms)`
    if (r.reason) {
      console.log(line + `  — ${r.reason}`)
    } else {
      console.log(line)
    }
  }
}

program.parse()
```

- [ ] **Step 2: Verify CLI commands are registered**

```bash
bun run src/cli/index.ts --help
```

Expected output includes: `install`, `setup`, `update`, `doctor`, `list`.

- [ ] **Step 3: Verify dry-run install works end-to-end**

```bash
bun run src/cli/index.ts --dry-run install
```

Expected: runs without error, prints summary.

- [ ] **Step 4: Commit**

```bash
git add src/cli/index.ts
git commit -m "feat: wire all CLI commands with commander"
```

---

## Task 14: Run All Tests and Build

- [ ] **Step 1: Run full test suite**

```bash
bun test
```

Expected: all tests pass, 0 failures.

- [ ] **Step 2: Build standalone binary**

```bash
mkdir -p dist
bun build ./src/cli/index.ts --compile --outfile dist/raze
```

Expected: `dist/raze` binary created.

- [ ] **Step 3: Verify binary works**

```bash
./dist/raze --version
./dist/raze --help
./dist/raze --dry-run install
```

Expected: version prints, help prints, dry-run install runs without error.

- [ ] **Step 4: Commit**

```bash
git add dist/.gitkeep 2>/dev/null; true
git add package.json tsconfig.json bunfig.toml
git commit -m "chore: verify full test suite and binary build"
```
