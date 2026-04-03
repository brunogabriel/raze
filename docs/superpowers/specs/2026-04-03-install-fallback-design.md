# Install Fallback Design

## Goal

Simplify `default-suite.yaml` (and user override `suite.yaml`) by making `install` optional per package manager entry, and by allowing package manager entries to be omitted entirely. When either is absent, the loader fills in `install: <app.name>` automatically.

## Problem

Currently every app must declare all 5 package managers explicitly, and each entry must have `install`. This creates significant repetition: apps like `tmux`, `fzf`, `ripgrep` repeat the same name 5 times across 5 managers.

## Rules

1. **Omitted manager** — if a package manager is not listed under `packages`, the loader adds `{ install: app.name }` for that manager.
2. **Omitted `install`** — if a manager is listed (e.g. only has `pre`/`post`) but `install` is absent, the loader fills in `install: app.name`.
3. **Omitted `packages` entirely** — equivalent to an empty object; all 5 managers get `{ install: app.name }`.
4. **Explicit `install`** — never overridden. If a manager declares `install: docker-ce docker-ce-cli containerd.io`, that stays.

## Affected Files

| File | Change |
|------|--------|
| `src/kernels/base.kernel.ts` | `PackageSteps.install` becomes `string \| undefined` (optional) |
| `src/config/loader.ts` | Add `expandDefaults(apps)` function called after YAML parse |
| `assets/default-suite.yaml` | Simplified: remove redundant manager entries and `install` fields |
| `tests/config/loader.test.ts` | Add 2 new tests for fallback behaviour |

## `expandDefaults` Logic

```typescript
const ALL_MANAGERS = ["pacman", "yay", "dnf", "apt", "brew"] as const

function expandDefaults(apps: AppDefinition[]): AppDefinition[] {
  return apps.map(app => {
    const packages = { ...(app.packages ?? {}) }
    for (const pm of ALL_MANAGERS) {
      if (!packages[pm]) {
        packages[pm] = { install: app.name }
      } else if (!packages[pm]!.install) {
        packages[pm] = { ...packages[pm]!, install: app.name }
      }
    }
    return { ...app, packages }
  })
}
```

Called in both `loadDefaultSuite()` and `loadConfig()` (after parsing user override).

## Type Change

```typescript
export interface PackageSteps {
  pre?: string[]
  install?: string   // was: install: string
  post?: string[]
}
```

This accurately reflects what the YAML can contain before expansion. After `expandDefaults`, all entries are guaranteed to have `install` defined — but TypeScript won't know that at the type level, so kernels access `entry.install!` or keep their existing guards.

## YAML Result (examples)

**Before:**
```yaml
- name: tmux
  description: Terminal multiplexer
  tags: [terminal]
  packages:
    pacman:
      install: tmux
    yay:
      install: tmux
    dnf:
      install: tmux
    apt:
      install: tmux
    brew:
      install: tmux
```

**After:**
```yaml
- name: tmux
  description: Terminal multiplexer
  tags: [terminal]
```

**Before:**
```yaml
- name: neovim
  description: Modal text editor
  tags: [terminal]
  packages:
    pacman:
      install: neovim
    yay:
      install: neovim
    dnf:
      install: neovim
    apt:
      pre:
        - add-apt-repository ppa:neovim-ppa/unstable -y
        - apt-get update -y
      install: neovim
    brew:
      install: neovim
```

**After:**
```yaml
- name: neovim
  description: Modal text editor
  tags: [terminal]
  packages:
    apt:
      pre:
        - add-apt-repository ppa:neovim-ppa/unstable -y
        - apt-get update -y
```

## Testing

Two new tests in `tests/config/loader.test.ts`:

1. App with no `packages` key → after load, all 5 managers have `install === app.name`
2. App with `apt` entry that has `pre` but no `install` → `apt.install === app.name`, `pre` preserved

Existing tests continue to pass unchanged.

## Out of Scope

- No change to kernel logic (kernels already read `entry.install`)
- No new CLI flags or commands
- No change to user-facing output
