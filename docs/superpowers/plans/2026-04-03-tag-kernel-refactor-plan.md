# TagKernel Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the duplicated `pre/install/post` loop from `PackageKernel`, `DesktopKernel`, and `DriverKernel` into a single abstract base class `TagKernel`, reducing each concrete kernel to ~12 lines.

**Architecture:** A new abstract class `TagKernel` in `src/kernels/tag.kernel.ts` owns the `execute` loop and exposes `abstract tag` and `abstract canHandle`. Each concrete kernel extends it, declaring only its tag, `canHandle` logic, and (optionally) overriding `installMessage`. A shared `TagKernelOptions` interface replaces the three identical `*KernelOptions` interfaces.

**Tech Stack:** Bun, TypeScript, `bun:test`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/kernels/tag.kernel.ts` | Abstract base: shared `execute` loop, `TagKernelOptions`, `installMessage` |
| Modify | `src/kernels/package/package.kernel.ts` | Extend `TagKernel`, remove duplicated loop |
| Modify | `src/kernels/desktop/desktop.kernel.ts` | Extend `TagKernel`, remove duplicated loop |
| Modify | `src/kernels/driver/driver.kernel.ts` | Extend `TagKernel`, remove duplicated loop |
| Modify | `tests/kernels/package.kernel.test.ts` | No logic change — verify still passes |
| Modify | `tests/kernels/desktop.kernel.test.ts` | No logic change — verify still passes |
| Modify | `tests/kernels/driver.kernel.test.ts` | No logic change — verify still passes |

---

### Task 1: Create `TagKernel` abstract base class with a failing test

**Files:**
- Create: `src/kernels/tag.kernel.ts`
- Create: `tests/kernels/tag.kernel.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/kernels/tag.kernel.test.ts
import { describe, it, expect } from "bun:test"
import { TagKernel, type TagKernelOptions } from "../../src/kernels/tag.kernel"
import { Logger } from "../../src/utils/logger"
import type { RuntimeContext, AppTag } from "../../src/kernels/base.kernel"

const logger = new Logger({ verbose: false, dryRun: true })

const ctx: RuntimeContext = {
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
        packages: { pacman: { install: "neovim" } },
      },
      {
        name: "alacritty",
        description: "Terminal emulator",
        tags: ["desktop"],
        packages: { pacman: { install: "alacritty" } },
      },
    ],
  },
}

class TestKernel extends TagKernel {
  name = "TestKernel"
  tag: AppTag = "terminal"
  canHandle(_ctx: RuntimeContext) { return true }
}

describe("TagKernel", () => {
  it("execute only processes apps matching the declared tag", async () => {
    const processed: string[] = []
    const kernel = new TestKernel(logger, { onAppProcessed: (n) => processed.push(n) })
    await kernel.execute(ctx)
    expect(processed).toContain("neovim")
    expect(processed).not.toContain("alacritty")
  })

  it("calls onAppSkipped when package manager entry is missing", async () => {
    const skipped: string[] = []
    const missingCtx: RuntimeContext = {
      ...ctx,
      packageManager: "dnf",
    }
    const kernel = new TestKernel(logger, { onAppSkipped: (n) => skipped.push(n) })
    await kernel.execute(missingCtx)
    expect(skipped).toContain("neovim")
  })

  it("installMessage defaults to 'Installing <name>...'", () => {
    const kernel = new TestKernel(logger)
    expect((kernel as any).installMessage("neovim")).toBe("Installing neovim...")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/kernels/tag.kernel.test.ts
```

Expected: FAIL — `Cannot find module '../../src/kernels/tag.kernel'`

- [ ] **Step 3: Create `src/kernels/tag.kernel.ts`**

```typescript
import type { IKernel, RuntimeContext, PackageManager, AppTag } from "./base.kernel"
import type { Logger } from "../utils/logger"
import { runCommand } from "../utils/shell"
import { INSTALL_COMMANDS } from "../utils/package-managers"

export interface TagKernelOptions {
  onAppProcessed?: (name: string) => void
  onAppSkipped?: (name: string) => void
}

export abstract class TagKernel implements IKernel {
  abstract name: string
  abstract tag: AppTag
  protected logger: Logger
  protected options: TagKernelOptions

  constructor(logger: Logger, options: TagKernelOptions = {}) {
    this.logger = logger
    this.options = options
  }

  abstract canHandle(ctx: RuntimeContext): boolean

  protected installMessage(name: string): string {
    return `Installing ${name}...`
  }

  async execute(ctx: RuntimeContext): Promise<void> {
    const pm = ctx.packageManager as Exclude<PackageManager, "unknown">
    const apps = ctx.config.apps.filter((a) => a.tags.includes(this.tag))
    const dryRun = this.logger.isDryRun

    for (const app of apps) {
      const steps = app.packages[pm]

      if (!steps) {
        this.logger.warn(`Skipping ${app.name}: no entry for ${pm}`)
        this.options.onAppSkipped?.(app.name)
        continue
      }

      this.logger.info(this.installMessage(app.name))

      for (const pre of steps.pre ?? []) {
        this.logger.verbose(`pre: ${pre}`)
        const result = await runCommand(pre, { dryRun })
        if (!result.success) throw new Error(`pre-step failed for ${app.name}: ${result.stderr}`)
      }

      const installCmd = `${INSTALL_COMMANDS[pm]} ${steps.install!}`
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
bun test tests/kernels/tag.kernel.test.ts
```

Expected: 3 pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add src/kernels/tag.kernel.ts tests/kernels/tag.kernel.test.ts
git commit -m "feat: add TagKernel abstract base class with shared pre/install/post loop"
```

---

### Task 2: Migrate `PackageKernel` to extend `TagKernel`

**Files:**
- Modify: `src/kernels/package/package.kernel.ts`
- Test: `tests/kernels/package.kernel.test.ts` (no changes — must still pass)

- [ ] **Step 1: Rewrite `package.kernel.ts`**

```typescript
import type { RuntimeContext, AppTag } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { TagKernel, type TagKernelOptions } from "../tag.kernel"

export class PackageKernel extends TagKernel {
  name = "PackageKernel"
  tag: AppTag = "terminal"

  constructor(logger: Logger, options: TagKernelOptions = {}) {
    super(logger, options)
  }

  canHandle(ctx: RuntimeContext): boolean {
    return ctx.packageManager !== "unknown"
  }
}
```

- [ ] **Step 2: Run existing PackageKernel tests**

```bash
bun test tests/kernels/package.kernel.test.ts
```

Expected: 5 pass, 0 fail

- [ ] **Step 3: Commit**

```bash
git add src/kernels/package/package.kernel.ts
git commit -m "refactor: migrate PackageKernel to extend TagKernel"
```

---

### Task 3: Migrate `DesktopKernel` to extend `TagKernel`

**Files:**
- Modify: `src/kernels/desktop/desktop.kernel.ts`
- Test: `tests/kernels/desktop.kernel.test.ts` (no changes — must still pass)

- [ ] **Step 1: Rewrite `desktop.kernel.ts`**

```typescript
import type { RuntimeContext, AppTag } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { TagKernel, type TagKernelOptions } from "../tag.kernel"

export class DesktopKernel extends TagKernel {
  name = "DesktopKernel"
  tag: AppTag = "desktop"

  constructor(logger: Logger, options: TagKernelOptions = {}) {
    super(logger, options)
  }

  canHandle(ctx: RuntimeContext): boolean {
    return ctx.hasDesktop
  }

  protected installMessage(name: string): string {
    return `Installing desktop app: ${name}...`
  }
}
```

- [ ] **Step 2: Run existing DesktopKernel tests**

```bash
bun test tests/kernels/desktop.kernel.test.ts
```

Expected: 4 pass, 0 fail

- [ ] **Step 3: Commit**

```bash
git add src/kernels/desktop/desktop.kernel.ts
git commit -m "refactor: migrate DesktopKernel to extend TagKernel"
```

---

### Task 4: Migrate `DriverKernel` to extend `TagKernel`

**Files:**
- Modify: `src/kernels/driver/driver.kernel.ts`
- Test: `tests/kernels/driver.kernel.test.ts` (no changes — must still pass)

- [ ] **Step 1: Rewrite `driver.kernel.ts`**

```typescript
import type { RuntimeContext, AppTag } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { TagKernel, type TagKernelOptions } from "../tag.kernel"

export class DriverKernel extends TagKernel {
  name = "DriverKernel"
  tag: AppTag = "driver"

  constructor(logger: Logger, options: TagKernelOptions = {}) {
    super(logger, options)
  }

  canHandle(ctx: RuntimeContext): boolean {
    return ctx.config.apps.some((a) => a.tags.includes("driver"))
  }

  protected installMessage(name: string): string {
    return `Installing driver: ${name}...`
  }
}
```

- [ ] **Step 2: Run existing DriverKernel tests**

```bash
bun test tests/kernels/driver.kernel.test.ts
```

Expected: 4 pass, 0 fail

- [ ] **Step 3: Commit**

```bash
git add src/kernels/driver/driver.kernel.ts
git commit -m "refactor: migrate DriverKernel to extend TagKernel"
```

---

### Task 5: Full suite green + binary verification

**Files:** none modified

- [ ] **Step 1: Run full test suite**

```bash
bun test
```

Expected: 57 pass (54 previous + 3 new TagKernel tests), 0 fail

- [ ] **Step 2: Build and verify binary**

```bash
bun build ./src/cli/index.ts --compile --outfile dist/raze
./dist/raze --version
./dist/raze --dry-run install
```

Expected:
- `--version` → `0.1.0`
- `--dry-run install` → PackageKernel, DesktopKernel, SetupKernel all complete with summary

- [ ] **Step 3: Push**

```bash
git push
```
