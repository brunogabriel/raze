# YAML Suite Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `src/config/default-suite.ts` with `assets/default-suite.yaml`, add Docker to the suite, migrate the user override from TOML to YAML, and update the loader and tests accordingly.

**Architecture:** `assets/default-suite.yaml` becomes the data source. `src/config/loader.ts` reads it at runtime via `Bun.file()` + `js-yaml`. The old `default-suite.ts` is deleted. User override moves from `~/.config/raze/suite.toml` to `~/.config/raze/suite.yaml`.

**Tech Stack:** Bun, TypeScript, js-yaml, bun test.

---

## Task 1: Install js-yaml

**Files:**
- Modify: `package.json` (dependency added automatically by bun)

- [ ] **Step 1: Install js-yaml and its types**

```bash
bun add js-yaml
bun add -d @types/js-yaml
```

- [ ] **Step 2: Verify install**

```bash
bun -e "import yaml from 'js-yaml'; console.log(yaml.load('foo: bar'))"
```

Expected output: `{ foo: 'bar' }`

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add js-yaml dependency"
```

---

## Task 2: Create assets/default-suite.yaml

**Files:**
- Create: `assets/default-suite.yaml`

- [ ] **Step 1: Create the assets directory and YAML file**

Create `assets/default-suite.yaml` with the following content:

```yaml
# Raze default app suite
# Tags: terminal | desktop | driver | optional
# Each app may define packages per package manager.
# Each package entry supports:
#   pre: (optional) list of commands to run before install
#   install: (required) package name(s) passed to the package manager
#   post: (optional) list of commands to run after install

apps:
  # --- Terminal apps ---

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

  - name: zsh
    description: Z shell
    tags: [terminal]
    packages:
      pacman:
        install: zsh
      yay:
        install: zsh
      dnf:
        install: zsh
      apt:
        install: zsh
      brew:
        install: zsh

  - name: fzf
    description: Fuzzy finder
    tags: [terminal]
    packages:
      pacman:
        install: fzf
      yay:
        install: fzf
      dnf:
        install: fzf
      apt:
        install: fzf
      brew:
        install: fzf

  - name: ripgrep
    description: Fast grep alternative
    tags: [terminal]
    packages:
      pacman:
        install: ripgrep
      yay:
        install: ripgrep
      dnf:
        install: ripgrep
      apt:
        install: ripgrep
      brew:
        install: ripgrep

  - name: bat
    description: cat with syntax highlighting
    tags: [terminal]
    packages:
      pacman:
        install: bat
      yay:
        install: bat
      dnf:
        install: bat
      apt:
        install: bat
      brew:
        install: bat

  - name: eza
    description: Modern ls replacement
    tags: [terminal]
    packages:
      pacman:
        install: eza
      yay:
        install: eza
      dnf:
        install: eza
      apt:
        pre:
          - apt-get install -y gpg
          - mkdir -p /etc/apt/keyrings
          - wget -qO- https://raw.githubusercontent.com/eza-community/eza/main/deb.asc | gpg --dearmor -o /etc/apt/keyrings/gierens.gpg
          - echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] http://deb.gierens.de stable main" | tee /etc/apt/sources.list.d/gierens.list
          - apt-get update -y
        install: eza
      brew:
        install: eza

  - name: starship
    description: Cross-shell prompt
    tags: [terminal]
    packages:
      pacman:
        install: starship
      yay:
        install: starship
      dnf:
        install: starship
      apt:
        # No apt package — install via official script
        pre:
          - sh -c "$(curl -fsSL https://starship.rs/install.sh)" -- --yes
        install: starship
      brew:
        install: starship

  - name: lazygit
    description: Terminal UI for git
    tags: [terminal]
    packages:
      pacman:
        install: lazygit
      yay:
        install: lazygit
      dnf:
        pre:
          - dnf copr enable atim/lazygit -y
        install: lazygit
      apt:
        pre:
          - LAZYGIT_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | grep -Po '"tag_name":\ "v\K[^"]*')
          - curl -Lo lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz"
          - tar xf lazygit.tar.gz lazygit
          - install lazygit /usr/local/bin
        install: lazygit
      brew:
        install: lazygit

  - name: docker
    description: Container runtime
    tags: [terminal]
    packages:
      pacman:
        install: docker
        post:
          - systemctl enable --now docker
          - usermod -aG docker $USER
      yay:
        install: docker
        post:
          - systemctl enable --now docker
          - usermod -aG docker $USER
      dnf:
        pre:
          - dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
        install: docker-ce docker-ce-cli containerd.io
        post:
          - systemctl enable --now docker
          - usermod -aG docker $USER
      apt:
        pre:
          - apt-get install -y ca-certificates curl
          - install -m 0755 -d /etc/apt/keyrings
          - curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
          - chmod a+r /etc/apt/keyrings/docker.asc
          - echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list
          - apt-get update -y
        install: docker-ce docker-ce-cli containerd.io
        post:
          - systemctl enable --now docker
          - usermod -aG docker $USER
      brew:
        install: --cask docker

  # --- Desktop apps ---

  - name: alacritty
    description: GPU-accelerated terminal emulator
    tags: [desktop]
    packages:
      pacman:
        install: alacritty
      yay:
        install: alacritty
      dnf:
        install: alacritty
      apt:
        install: alacritty
      brew:
        install: --cask alacritty

  - name: firefox
    description: Web browser
    tags: [desktop]
    packages:
      pacman:
        install: firefox
      yay:
        install: firefox
      dnf:
        install: firefox
      apt:
        install: firefox
      brew:
        install: --cask firefox

  - name: vlc
    description: Media player
    tags: [desktop]
    packages:
      pacman:
        install: vlc
      yay:
        install: vlc
      dnf:
        install: vlc
      apt:
        install: vlc
      brew:
        install: --cask vlc

  - name: obsidian
    description: Knowledge base and note-taking
    tags: [desktop]
    packages:
      yay:
        install: obsidian
      pacman:
        pre:
          - yay -S obsidian --noconfirm || true
        install: obsidian
      dnf:
        pre:
          - OBSIDIAN_VERSION=$(curl -s https://api.github.com/repos/obsidianmd/obsidian-releases/releases/latest | grep -oP '(?<="tag_name":\ "v)[^"]*')
          - curl -Lo obsidian.rpm "https://github.com/obsidianmd/obsidian-releases/releases/latest/download/Obsidian-${OBSIDIAN_VERSION}.rpm"
        install: obsidian.rpm
      apt:
        pre:
          - OBSIDIAN_VERSION=$(curl -s https://api.github.com/repos/obsidianmd/obsidian-releases/releases/latest | grep -oP '(?<="tag_name":\ "v)[^"]*')
          - curl -Lo obsidian.deb "https://github.com/obsidianmd/obsidian-releases/releases/latest/download/obsidian_${OBSIDIAN_VERSION}_amd64.deb"
        install: obsidian.deb
      brew:
        install: --cask obsidian
```

- [ ] **Step 2: Verify YAML parses correctly**

```bash
bun -e "
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
const content = readFileSync('assets/default-suite.yaml', 'utf-8');
const parsed = yaml.load(content);
console.log('apps count:', parsed.apps.length);
console.log('first app:', parsed.apps[0].name);
"
```

Expected output:
```
apps count: 14
first app: neovim
```

- [ ] **Step 3: Commit**

```bash
git add assets/default-suite.yaml
git commit -m "feat: add default app suite as YAML asset with docker"
```

---

## Task 3: Update loader.ts

**Files:**
- Modify: `src/config/loader.ts`

- [ ] **Step 1: Run existing tests to confirm they still pass before touching code**

```bash
bun test tests/config/loader.test.ts
```

Expected: 4 pass.

- [ ] **Step 2: Replace src/config/loader.ts**

```ts
import { existsSync, readFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import yaml from "js-yaml"
import type { RazeConfig, AppDefinition } from "../kernels/base.kernel"

const DEFAULT_SUITE_PATH = join(import.meta.dir, "../../assets/default-suite.yaml")

function loadDefaultSuite(): RazeConfig {
  const content = readFileSync(DEFAULT_SUITE_PATH, "utf-8")
  const parsed = yaml.load(content) as any
  if (!Array.isArray(parsed?.apps)) {
    throw new Error("default-suite.yaml is malformed: missing apps array")
  }
  return { apps: parsed.apps as AppDefinition[] }
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

  return { apps: Array.from(merged.values()) }
}
```

- [ ] **Step 3: Commit loader change**

```bash
git add src/config/loader.ts
git commit -m "feat: migrate loader to read YAML asset via js-yaml"
```

---

## Task 4: Update tests and delete default-suite.ts

**Files:**
- Modify: `tests/config/loader.test.ts`
- Delete: `src/config/default-suite.ts`

- [ ] **Step 1: Replace tests/config/loader.test.ts**

```ts
import { describe, it, expect } from "bun:test"
import { loadConfig } from "../../src/config/loader"
import { writeFileSync, mkdirSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

describe("loadConfig", () => {
  it("returns apps when no override path exists", async () => {
    const config = await loadConfig("/nonexistent/path/suite.yaml")
    expect(config.apps.length).toBeGreaterThan(0)
  })

  it("default suite has at least one terminal app", async () => {
    const config = await loadConfig("/nonexistent/path/suite.yaml")
    const terminalApps = config.apps.filter((a) => a.tags.includes("terminal"))
    expect(terminalApps.length).toBeGreaterThan(0)
  })

  it("default suite has at least one desktop app", async () => {
    const config = await loadConfig("/nonexistent/path/suite.yaml")
    const desktopApps = config.apps.filter((a) => a.tags.includes("desktop"))
    expect(desktopApps.length).toBeGreaterThan(0)
  })

  it("default suite contains neovim", async () => {
    const config = await loadConfig("/nonexistent/path/suite.yaml")
    expect(config.apps.some((a) => a.name === "neovim")).toBe(true)
  })

  it("default suite contains docker", async () => {
    const config = await loadConfig("/nonexistent/path/suite.yaml")
    expect(config.apps.some((a) => a.name === "docker")).toBe(true)
  })

  it("override file merges and replaces apps by name", async () => {
    const dir = join(tmpdir(), "raze-test-" + Date.now())
    mkdirSync(dir, { recursive: true })
    const overridePath = join(dir, "suite.yaml")
    writeFileSync(overridePath, `
apps:
  - name: neovim
    description: My custom neovim
    tags: [terminal]
    packages:
      apt:
        install: neovim-nightly
`)
    const config = await loadConfig(overridePath)
    const neovim = config.apps.find((a) => a.name === "neovim")
    expect(neovim?.description).toBe("My custom neovim")
    // other apps still present
    expect(config.apps.some((a) => a.name === "tmux")).toBe(true)
  })

  it("falls back to defaults when override YAML is malformed", async () => {
    const dir = join(tmpdir(), "raze-test-" + Date.now())
    mkdirSync(dir, { recursive: true })
    const overridePath = join(dir, "suite.yaml")
    writeFileSync(overridePath, "this: is: not: valid: yaml: :::")
    const config = await loadConfig(overridePath)
    expect(config.apps.some((a) => a.name === "neovim")).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
bun test tests/config/loader.test.ts
```

Expected: 7 pass, 0 fail.

- [ ] **Step 3: Delete default-suite.ts**

```bash
rm src/config/default-suite.ts
```

- [ ] **Step 4: Run full test suite to confirm nothing broke**

```bash
bun test
```

Expected: all tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add tests/config/loader.test.ts
git rm src/config/default-suite.ts
git commit -m "feat: migrate tests to YAML loader, remove default-suite.ts"
```

---

## Task 5: Verify binary build

- [ ] **Step 1: Build the binary**

```bash
bun build ./src/cli/index.ts --compile --outfile dist/raze
```

Expected: builds without errors.

- [ ] **Step 2: Verify binary works**

```bash
./dist/raze --version
./dist/raze --dry-run install
```

Expected: version prints `0.1.0`, dry-run install completes with summary showing PackageKernel, DesktopKernel, SetupKernel all succeeded.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: verify binary build with yaml asset"
```
