# Doctor Binary Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional `binary` field to `AppDefinition` so `doctor` checks `which <binary>` instead of `which <name>` when the package name differs from the installed binary (e.g. `ripgrep` → `rg`).

**Architecture:** `binary` is added as an optional field to `AppDefinition` in `base.kernel.ts`. The `doctor` command resolves the binary to check via a helper `resolveBinary(app)` that returns `app.binary ?? app.name`. The YAML `default-suite.yaml` declares `binary: rg` for `ripgrep`. No changes to the install/kernel pipeline — `binary` is only used by `doctor`.

**Tech Stack:** Bun, TypeScript, `bun:test`, `js-yaml`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/kernels/base.kernel.ts` | Add optional `binary?: string` to `AppDefinition` |
| Modify | `src/cli/commands/doctor.ts` | Use `app.binary ?? app.name` for `which` check |
| Modify | `assets/default-suite.yaml` | Add `binary: rg` to `ripgrep` entry |
| Modify | `tests/kernels/base.kernel.test.ts` | Add test for `binary` field presence |
| Modify | `tests/config/loader.test.ts` | Add test that `binary` field survives load + merge |

---

### Task 1: Add `binary` field to `AppDefinition` and verify with a test

**Files:**
- Modify: `src/kernels/base.kernel.ts`
- Modify: `tests/kernels/base.kernel.test.ts`

- [ ] **Step 1: Write the failing test**

Read current `tests/kernels/base.kernel.test.ts` first, then add this test:

```typescript
it("AppDefinition accepts optional binary field", () => {
  const app: AppDefinition = {
    name: "ripgrep",
    description: "Fast grep alternative",
    tags: ["terminal"],
    packages: { pacman: { install: "ripgrep" } },
    binary: "rg",
  }
  expect(app.binary).toBe("rg")
})

it("AppDefinition binary defaults to undefined when not set", () => {
  const app: AppDefinition = {
    name: "neovim",
    description: "Editor",
    tags: ["terminal"],
    packages: { pacman: { install: "neovim" } },
  }
  expect(app.binary).toBeUndefined()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/kernels/base.kernel.test.ts
```

Expected: FAIL — type error, `binary` does not exist on `AppDefinition`

- [ ] **Step 3: Add `binary` field to `AppDefinition` in `src/kernels/base.kernel.ts`**

Change:

```typescript
export interface AppDefinition {
  name: string
  description: string
  tags: AppTag[]
  packages: Partial<Record<Exclude<PackageManager, "unknown">, PackageSteps>>
}
```

To:

```typescript
export interface AppDefinition {
  name: string
  description: string
  tags: AppTag[]
  packages: Partial<Record<Exclude<PackageManager, "unknown">, PackageSteps>>
  binary?: string
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/kernels/base.kernel.test.ts
```

Expected: all tests pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add src/kernels/base.kernel.ts tests/kernels/base.kernel.test.ts
git commit -m "feat: add optional binary field to AppDefinition"
```

---

### Task 2: Update `doctor` to use `binary` field

**Files:**
- Modify: `src/cli/commands/doctor.ts`

- [ ] **Step 1: Rewrite `doctor.ts` to resolve binary**

```typescript
import type { Command } from "commander"
import { runCommand } from "../../utils/shell"
import type { BuildContextFn, GlobalOpts } from "../context"
import type { AppDefinition } from "../../kernels/base.kernel"

function resolveBinary(app: AppDefinition): string {
  return app.binary ?? app.name
}

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
        const binary = resolveBinary(app)
        const check = await runCommand(`which ${binary}`)
        const status = check.success ? "installed" : "missing"
        const icon = check.success ? "✓" : "✗"
        console.log(`  ${icon} ${app.name.padEnd(20)} ${status}`)
      }
    })
}
```

- [ ] **Step 2: Run full suite to confirm no regression**

```bash
bun test
```

Expected: 57 pass, 0 fail

- [ ] **Step 3: Commit**

```bash
git add src/cli/commands/doctor.ts
git commit -m "fix: doctor uses binary field for which check, falls back to name"
```

---

### Task 3: Add `binary: rg` to `ripgrep` in `default-suite.yaml`

**Files:**
- Modify: `assets/default-suite.yaml`
- Modify: `tests/config/loader.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/config/loader.test.ts`:

```typescript
it("ripgrep has binary set to 'rg' in default suite", async () => {
  const config = await loadConfig("/nonexistent/path/suite.yaml")
  const rg = config.apps.find((a) => a.name === "ripgrep")
  expect(rg).toBeDefined()
  expect(rg!.binary).toBe("rg")
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/config/loader.test.ts
```

Expected: FAIL — `rg!.binary` is `undefined`

- [ ] **Step 3: Add `binary: rg` to ripgrep entry in `assets/default-suite.yaml`**

Change:

```yaml
  - name: ripgrep
    description: Fast grep alternative
    tags: [terminal]
```

To:

```yaml
  - name: ripgrep
    description: Fast grep alternative
    binary: rg
    tags: [terminal]
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/config/loader.test.ts
```

Expected: all tests pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add assets/default-suite.yaml tests/config/loader.test.ts
git commit -m "fix: declare binary: rg for ripgrep in default suite"
```

---

### Task 4: Full suite green + binary verification

**Files:** none modified

- [ ] **Step 1: Run full test suite**

```bash
bun test
```

Expected: 59 pass (57 previous + 2 new AppDefinition tests + 1 new loader test = 60 — verify count matches), 0 fail

- [ ] **Step 2: Build and verify binary**

```bash
bun build ./src/cli/index.ts --compile --outfile dist/raze
./dist/raze --version
./dist/raze doctor
```

Expected:
- `--version` → `0.1.0`
- `doctor` → prints OS info and app list; `ripgrep` shows as `✓ ripgrep` if `rg` is in PATH (which it is on your machine)

- [ ] **Step 3: Push**

```bash
git push
```
