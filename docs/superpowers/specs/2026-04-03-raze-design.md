# Raze — Design Spec
**Date:** 2026-04-03  
**Status:** Approved  
**Project:** raze (Raze Automates Zero-Config Environment)

---

## Overview

`raze` is a cross-platform CLI tool built with Bun/TypeScript that automates OS environment setup. It detects the runtime environment (distro, package manager, desktop presence) and installs a curated suite of terminal and desktop applications using the appropriate package manager for that platform.

The architecture is a **KernelRegistry** — a set of isolated functional nuclei (kernels), each responsible for one domain of the system. The runtime assembles the applicable kernels dynamically based on the detected environment.

Current target: **Linux**. Future targets: macOS, Windows.

---

## Architecture

### KernelRegistry

A central registry that holds all kernels. At runtime, it filters kernels via `canHandle(ctx)` and passes them to the Runner for sequential execution.

### IKernel Interface

```ts
interface IKernel {
  name: string
  canHandle(ctx: RuntimeContext): boolean
  execute(ctx: RuntimeContext): Promise<void>
  rollback?(ctx: RuntimeContext): Promise<void>
}
```

### RuntimeContext

An immutable object built by the Detector and passed to all kernels:

```ts
interface RuntimeContext {
  os: "linux" | "macos" | "windows"
  distro: "arch" | "fedora" | "ubuntu" | "debian" | "unknown"
  packageManager: "pacman" | "yay" | "dnf" | "apt" | "brew" | "unknown"
  hasDesktop: boolean
  config: RazeConfig
}
```

Desktop presence is auto-detected via environment variables (`$DISPLAY`, `$WAYLAND_DISPLAY`, `$XDG_SESSION_TYPE`).

### Kernels

| Kernel | Domain | Condition |
|---|---|---|
| `PackageKernel` | Terminal apps via package manager | always |
| `DesktopKernel` | GUI apps | `hasDesktop === true` |
| `DriverKernel` | Drivers and custom system integrations | platform-specific |
| `SetupKernel` | Dotfiles, symlinks, initial configs | always |

### Execution Flow

```
raze install
  → Detector builds RuntimeContext
  → KernelRegistry filters kernels via canHandle(ctx)
  → Runner executes kernels in order:
      1. PackageKernel
      2. DesktopKernel  (if hasDesktop)
      3. DriverKernel   (if applicable)
      4. SetupKernel
  → Logger displays progress with spinners
  → Runner prints final summary
  → Exit code 0 (all success) or 1 (any failure)
```

---

## Directory Structure

```
raze/
├── src/
│   ├── cli/
│   │   └── index.ts            # commander entry point
│   ├── core/
│   │   ├── kernel-registry.ts  # registers and orchestrates kernels
│   │   ├── detector.ts         # detects OS, distro, pkg manager, desktop
│   │   └── runner.ts           # executes kernels with logging
│   ├── kernels/
│   │   ├── base.kernel.ts      # IKernel interface and KernelResult type
│   │   ├── package/            # PackageKernel
│   │   ├── driver/             # DriverKernel
│   │   ├── desktop/            # DesktopKernel
│   │   └── setup/              # SetupKernel
│   ├── config/
│   │   ├── default-suite.ts    # default app suite
│   │   └── loader.ts           # loads default config + merges ~/.config/raze/
│   └── utils/
│       ├── logger.ts           # ora + chalk, spinners and rich output
│       └── shell.ts            # safe shell command execution
├── package.json
├── tsconfig.json
└── bunfig.toml
```

---

## CLI Commands

```
raze install    # installs all suite apps (auto-detects environment)
raze setup      # configures dotfiles, symlinks, initial configs
raze update     # updates apps already installed by raze
raze doctor     # diagnostics: shows installed, missing, and conflicts
raze list       # lists suite apps with installed/pending status
```

### Global Flags

```
--verbose       # detailed output (prints every shell command executed)
--dry-run       # simulates without executing anything
--fail-fast     # stops on first kernel failure and runs rollbacks
--config <path> # uses alternative config file
```

---

## App Suite Configuration

### App Definition

Each app in the suite is defined with per-package-manager steps:

```ts
interface AppDefinition {
  name: string
  description: string
  tags: AppTag[]
  packages: Partial<Record<PackageManager, PackageSteps>>
}

interface PackageSteps {
  pre?: string[]    // commands before install (e.g. add PPA, add GPG key)
  install: string   // package name or install command
  post?: string[]   // commands after install (e.g. enable service, configure)
}

type AppTag = "terminal" | "desktop" | "driver" | "optional"
type PackageManager = "pacman" | "yay" | "dnf" | "apt" | "brew"
```

### Tag Behavior

| Tag | When installed |
|---|---|
| `terminal` | always (by PackageKernel) |
| `desktop` | only if `hasDesktop === true` (by DesktopKernel) |
| `driver` | only by DriverKernel, platform-specific |
| `optional` | only if explicitly requested by user |

### App Example

```ts
{
  name: "neovim",
  description: "Modal text editor",
  tags: ["terminal"],
  packages: {
    pacman: { install: "neovim" },
    yay:    { install: "neovim" },
    dnf:    { install: "neovim" },
    apt: {
      pre:     ["add-apt-repository ppa:neovim-ppa/unstable -y", "apt-get update"],
      install: "neovim",
      post:    []
    },
    brew: { install: "neovim" }
  }
}
```

### Default Suite (initial list)

**Terminal:** `neovim`, `tmux`, `zsh`, `fzf`, `ripgrep`, `bat`, `eza`, `starship`, `lazygit`

**Desktop:** `alacritty`, `firefox`, `vlc`, `obsidian`

### User Override

Users can create `~/.config/raze/suite.toml` to add apps or override default entries. The `loader.ts` performs a deep merge — default suite is the base, local file overrides by `name`.

---

## Error Handling

### Kernel Isolation

Each kernel fails independently. By default, a kernel failure is logged and execution continues with the next kernel. Use `--fail-fast` to stop on first failure and trigger `rollback()` on kernels that implement it.

### KernelResult

```ts
type KernelResult = {
  kernel: string
  status: "success" | "skipped" | "failed"
  reason?: string
  duration: number
}
```

### Exit Codes

| Code | Meaning |
|---|---|
| `0` | All kernels succeeded |
| `1` | One or more kernels failed |

### Summary Report

After all kernels execute, the runner prints a table showing each kernel's result, duration, and failure reason (if any).

---

## Logging

Uses `ora` (spinners) and `chalk` (colors).

| Level | Usage |
|---|---|
| `info` | normal progress, spinners |
| `warn` | skipped app, outdated version |
| `error` | kernel failure, command returned non-zero |

- `--verbose`: prints every shell command before execution
- `--dry-run`: prints commands but does not execute them

---

## Build and Distribution

### Compile to Standalone Binary

```bash
bun build ./src/cli/index.ts --compile --outfile raze
```

No Bun installation required on target machine — the runtime is embedded in the binary.

### Target Platforms

| Binary | Status |
|---|---|
| `raze-linux-x64` | current |
| `raze-linux-arm64` | current |
| `raze-macos-x64` | future |
| `raze-macos-arm64` | future |
| `raze-windows-x64` | future |

### Installation Script

```bash
curl -fsSL https://get.razerc.dev/install.sh | sh
```

The script detects the platform and downloads the correct binary.

---

## Dependencies

| Package | Purpose |
|---|---|
| `commander` | CLI argument parsing |
| `ora` | Spinners and progress indicators |
| `chalk` | Terminal colors |

No runtime dependencies beyond these. All system interaction via Bun's built-in `Bun.spawn` / `$` shell API.

---

## Out of Scope (v1)

- TUI interface (opentui — planned for future)
- macOS support
- Windows support
- Plugin system / third-party kernels
- Remote config sync
