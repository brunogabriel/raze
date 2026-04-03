# CLI Refactor — Commands + Package Manager Utils Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `INSTALL_COMMANDS` into a shared util, split `src/cli/index.ts` into `context.ts` + `commands/*.ts`, keeping `index.ts` as a thin bootstrap.

**Architecture:** New `src/utils/package-managers.ts` centralises both command maps. New `src/cli/context.ts` holds `GlobalOpts`, `buildContext`, and `printSummary`. Each command lives in `src/cli/commands/<name>.ts` and exports a `register<Name>` function that receives `program` and `buildContext`. `index.ts` wires them together in ~25 lines.

**Tech Stack:** Bun, TypeScript, Commander.js, bun:test

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/utils/package-managers.ts` | `INSTALL_COMMANDS`, `UPDATE_COMMANDS` |
| Create | `src/cli/context.ts` | `GlobalOpts`, `BuildContextFn`, `buildContext`, `printSummary` |
| Create | `src/cli/commands/install.ts` | `registerInstall` |
| Create | `src/cli/commands/setup.ts` | `registerSetup` |
| Create | `src/cli/commands/update.ts` | `registerUpdate` |
| Create | `src/cli/commands/doctor.ts` | `registerDoctor` |
| Create | `src/cli/commands/list.ts` | `registerList` |
| Modify | `src/kernels/package/package.kernel.ts` | Remove local `INSTALL_COMMANDS`, import from utils |
| Modify | `src/kernels/desktop/desktop.kernel.ts` | Same |
| Modify | `src/kernels/driver/driver.kernel.ts` | Same |
| Modify | `src/cli/index.ts` | Replace all command logic with register calls |

---

### Task 1: Create `src/utils/package-managers.ts`

**Files:**
- Create: `src/utils/package-managers.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { PackageManager } from "../kernels/base.kernel"

export const INSTALL_COMMANDS: Record<Exclude<PackageManager, "unknown">, string> = {
  pacman: "pacman -S --noconfirm",
  yay: "yay -S --noconfirm",
  dnf: "dnf install -y",
  apt: "apt-get install -y",
  brew: "brew install",
}

export const UPDATE_COMMANDS: Record<Exclude<PackageManager, "unknown">, string> = {
  pacman: "pacman -Syu --noconfirm",
  yay: "yay -Syu --noconfirm",
  dnf: "dnf upgrade -y",
  apt: "apt-get update -y && apt-get upgrade -y",
  brew: "brew upgrade",
}
```

- [ ] **Step 2: Run tests to confirm nothing broke**

```bash
bun test
```

Expected: all tests pass (nothing imports this file yet).

- [ ] **Step 3: Commit**

```bash
git add src/utils/package-managers.ts
git commit -m "feat: centralise INSTALL_COMMANDS and UPDATE_COMMANDS in package-managers util"
```

---

### Task 2: Update kernels to import from `package-managers.ts`

**Files:**
- Modify: `src/kernels/package/package.kernel.ts`
- Modify: `src/kernels/desktop/desktop.kernel.ts`
- Modify: `src/kernels/driver/driver.kernel.ts`

- [ ] **Step 1: Update `package.kernel.ts`**

Replace the file header (lines 1–16) with:

```typescript
import type { IKernel, RuntimeContext, PackageManager } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { runCommand } from "../../utils/shell"
import { INSTALL_COMMANDS } from "../../utils/package-managers"
```

Remove the local `const INSTALL_COMMANDS = { ... }` block entirely (lines 10–16).

- [ ] **Step 2: Update `desktop.kernel.ts`**

Replace the file header (lines 1–16) with:

```typescript
import type { IKernel, RuntimeContext, PackageManager } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { runCommand } from "../../utils/shell"
import { INSTALL_COMMANDS } from "../../utils/package-managers"
```

Remove the local `const INSTALL_COMMANDS = { ... }` block entirely (lines 10–16).

- [ ] **Step 3: Update `driver.kernel.ts`**

Replace the file header (lines 1–16) with:

```typescript
import type { IKernel, RuntimeContext, PackageManager } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { runCommand } from "../../utils/shell"
import { INSTALL_COMMANDS } from "../../utils/package-managers"
```

Remove the local `const INSTALL_COMMANDS = { ... }` block entirely (lines 10–16).

- [ ] **Step 4: Run tests**

```bash
bun test
```

Expected: all tests pass. Kernel behaviour is unchanged — only the import source changed.

- [ ] **Step 5: Commit**

```bash
git add src/kernels/package/package.kernel.ts src/kernels/desktop/desktop.kernel.ts src/kernels/driver/driver.kernel.ts
git commit -m "refactor: import INSTALL_COMMANDS from shared package-managers util"
```

---

### Task 3: Create `src/cli/context.ts`

**Files:**
- Create: `src/cli/context.ts`

- [ ] **Step 1: Create the file**

```typescript
import { Logger } from "../utils/logger"
import { loadConfig } from "../config/loader"
import { Detector } from "../core/detector"
import type { RuntimeContext } from "../kernels/base.kernel"
import type { KernelResult } from "../kernels/base.kernel"

export interface GlobalOpts {
  verbose: boolean
  dryRun: boolean
  failFast: boolean
  config?: string
}

export type BuildContextFn = (opts: GlobalOpts) => Promise<{ logger: Logger; ctx: RuntimeContext }>

export async function buildContext(opts: GlobalOpts): Promise<{ logger: Logger; ctx: RuntimeContext }> {
  const logger = new Logger({ verbose: opts.verbose, dryRun: opts.dryRun })
  const config = await loadConfig(opts.config)
  const detector = new Detector()
  const ctx = await detector.detect(config)
  return { logger, ctx }
}

export function printSummary(results: KernelResult[]): void {
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
```

- [ ] **Step 2: Run tests**

```bash
bun test
```

Expected: all tests pass (nothing imports this file yet).

- [ ] **Step 3: Commit**

```bash
git add src/cli/context.ts
git commit -m "refactor: extract buildContext, GlobalOpts, printSummary to cli/context.ts"
```

---

### Task 4: Create `src/cli/commands/install.ts`

**Files:**
- Create: `src/cli/commands/install.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { Command } from "commander"
import { KernelRegistry } from "../../core/kernel-registry"
import { Runner } from "../../core/runner"
import { PackageKernel } from "../../kernels/package/package.kernel"
import { DesktopKernel } from "../../kernels/desktop/desktop.kernel"
import { DriverKernel } from "../../kernels/driver/driver.kernel"
import { SetupKernel } from "../../kernels/setup/setup.kernel"
import type { BuildContextFn, GlobalOpts } from "../context"
import { printSummary } from "../context"

export function registerInstall(program: Command, buildContext: BuildContextFn): void {
  program
    .command("install")
    .description("Install all suite apps")
    .action(async () => {
      const opts = program.opts() as GlobalOpts
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
}
```

- [ ] **Step 2: Run tests**

```bash
bun test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/cli/commands/install.ts
git commit -m "refactor: extract install command to cli/commands/install.ts"
```

---

### Task 5: Create `src/cli/commands/setup.ts`

**Files:**
- Create: `src/cli/commands/setup.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { Command } from "commander"
import { KernelRegistry } from "../../core/kernel-registry"
import { Runner } from "../../core/runner"
import { SetupKernel } from "../../kernels/setup/setup.kernel"
import type { BuildContextFn, GlobalOpts } from "../context"
import { printSummary } from "../context"

export function registerSetup(program: Command, buildContext: BuildContextFn): void {
  program
    .command("setup")
    .description("Configure dotfiles, symlinks, and initial configs")
    .action(async () => {
      const opts = program.opts() as GlobalOpts
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
}
```

- [ ] **Step 2: Run tests**

```bash
bun test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/cli/commands/setup.ts
git commit -m "refactor: extract setup command to cli/commands/setup.ts"
```

---

### Task 6: Create `src/cli/commands/update.ts`

**Files:**
- Create: `src/cli/commands/update.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { Command } from "commander"
import { runCommand } from "../../utils/shell"
import { UPDATE_COMMANDS } from "../../utils/package-managers"
import type { BuildContextFn, GlobalOpts } from "../context"

export function registerUpdate(program: Command, buildContext: BuildContextFn): void {
  program
    .command("update")
    .description("Update apps installed by raze")
    .action(async () => {
      const opts = program.opts() as GlobalOpts
      const { logger, ctx } = await buildContext(opts)

      const pm = ctx.packageManager
      if (pm === "unknown") {
        logger.error("No supported package manager detected.")
        process.exit(1)
      }

      logger.info(`Updating system packages with ${pm}...`)
      const result = await runCommand(UPDATE_COMMANDS[pm], { dryRun: opts.dryRun })
      if (!result.success) {
        logger.error(`Update failed: ${result.stderr}`)
        process.exit(1)
      }
      logger.info("Update complete.")
    })
}
```

- [ ] **Step 2: Run tests**

```bash
bun test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/cli/commands/update.ts
git commit -m "refactor: extract update command to cli/commands/update.ts"
```

---

### Task 7: Create `src/cli/commands/doctor.ts`

**Files:**
- Create: `src/cli/commands/doctor.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { Command } from "commander"
import { runCommand } from "../../utils/shell"
import type { BuildContextFn, GlobalOpts } from "../context"

export function registerDoctor(program: Command, buildContext: BuildContextFn): void {
  program
    .command("doctor")
    .description("Diagnose installed apps and detect issues")
    .action(async () => {
      const opts = program.opts() as GlobalOpts
      const { ctx } = await buildContext(opts)

      console.log(`\nOS:              ${ctx.os}`)
      console.log(`Distro:          ${ctx.distro}`)
      console.log(`Package Manager: ${ctx.packageManager}`)
      console.log(`Desktop:         ${ctx.hasDesktop ? "yes" : "no"}`)
      console.log(`\nApp Suite:`)

      for (const app of ctx.config.apps) {
        const check = await runCommand(`which ${app.name}`)
        const status = check.success ? "installed" : "missing"
        const icon = check.success ? "✓" : "✗"
        console.log(`  ${icon} ${app.name.padEnd(20)} ${status}`)
      }
    })
}
```

- [ ] **Step 2: Run tests**

```bash
bun test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/cli/commands/doctor.ts
git commit -m "refactor: extract doctor command to cli/commands/doctor.ts"
```

---

### Task 8: Create `src/cli/commands/list.ts`

**Files:**
- Create: `src/cli/commands/list.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { Command } from "commander"
import { runCommand } from "../../utils/shell"
import type { BuildContextFn, GlobalOpts } from "../context"

export function registerList(program: Command, buildContext: BuildContextFn): void {
  program
    .command("list")
    .description("List suite apps with installed/pending status")
    .action(async () => {
      const opts = program.opts() as GlobalOpts
      const { ctx } = await buildContext(opts)

      console.log("\nRaze App Suite:\n")
      for (const app of ctx.config.apps) {
        const check = await runCommand(`which ${app.name}`)
        const status = check.success ? "installed" : "pending"
        const tags = app.tags.join(", ")
        console.log(`  ${app.name.padEnd(20)} [${tags}]  ${status}`)
      }
    })
}
```

- [ ] **Step 2: Run tests**

```bash
bun test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/cli/commands/list.ts
git commit -m "refactor: extract list command to cli/commands/list.ts"
```

---

### Task 9: Rewrite `src/cli/index.ts` as thin bootstrap

**Files:**
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
#!/usr/bin/env bun
import { Command } from "commander"
import { buildContext } from "./context"
import { registerInstall } from "./commands/install"
import { registerSetup } from "./commands/setup"
import { registerUpdate } from "./commands/update"
import { registerDoctor } from "./commands/doctor"
import { registerList } from "./commands/list"

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
registerList(program, buildContext)

program.parse()
```

- [ ] **Step 2: Run tests**

```bash
bun test
```

Expected: all tests pass.

- [ ] **Step 3: Rebuild binary and verify**

```bash
bun build ./src/cli/index.ts --compile --outfile dist/raze
./dist/raze --version
./dist/raze --dry-run install
```

Expected: `0.1.0` printed, dry-run install runs all kernels without error.

- [ ] **Step 4: Commit**

```bash
git add src/cli/index.ts
git commit -m "refactor: rewrite index.ts as thin bootstrap, delegate to commands/"
```
