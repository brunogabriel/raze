# Design: Migrate Default Suite to YAML

## Goal

Move the default app suite from a TypeScript file (`src/config/default-suite.ts`) into a YAML asset (`assets/default-suite.yaml`). This separates data from code, making it easy to add, remove, or edit apps without touching TypeScript. The user override file also migrates from TOML to YAML for consistency.

---

## File Structure

```
assets/
  default-suite.yaml          ← new: source of truth for all default apps

src/
  config/
    loader.ts                 ← modified: reads YAML instead of importing .ts
    default-suite.ts          ← deleted

tests/
  config/
    loader.test.ts            ← adjusted: remove direct import of default-suite.ts
```

---

## YAML Format

```yaml
# Raze default app suite
# Tags: terminal | desktop | driver | optional
# Each app may define packages per package manager.
# Each package entry supports: pre (list), install (string), post (list).

apps:
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

Rules:
- `pre` and `post` are optional string arrays — commands run before/after install
- `install` is a required string — the package name(s) passed to the package manager
- Package managers not listed for an app are simply skipped at runtime
- Comments (`#`) are allowed anywhere in the file

---

## Default App Suite

### Terminal apps

| App | Description | Notable steps |
|-----|-------------|---------------|
| neovim | Modal text editor | apt: adds PPA before install |
| tmux | Terminal multiplexer | — |
| zsh | Z shell | — |
| fzf | Fuzzy finder | — |
| ripgrep | Fast grep alternative | — |
| bat | cat with syntax highlighting | — |
| eza | Modern ls replacement | apt: adds GPG key + custom repo |
| starship | Cross-shell prompt | apt: runs install script (no apt package) |
| lazygit | Terminal UI for git | dnf: adds copr repo; apt: downloads binary |
| docker | Container runtime | all: post steps to enable service + add user to group |

### Desktop apps

| App | Description | Notable steps |
|-----|-------------|---------------|
| alacritty | GPU-accelerated terminal emulator | — |
| firefox | Web browser | — |
| vlc | Media player | — |
| obsidian | Knowledge base and note-taking | dnf/apt: downloads .rpm/.deb manually |

---

## Loader

`loadConfig(overridePath?: string): Promise<RazeConfig>`:

1. Resolve path to `assets/default-suite.yaml` using `import.meta.dir`
2. Read file via `Bun.file(path).text()`
3. Parse with `js-yaml` (`load()`)
4. If override path exists (default: `~/.config/raze/suite.yaml`), read and parse it
5. Merge: override entries replace default entries by `name`
6. Return `RazeConfig`

Error handling: if the default YAML fails to parse, throw — this is a programming error. If the user override fails to parse, log a warning and fall back to defaults silently.

---

## Dependencies

```bash
bun add js-yaml
bun add -d @types/js-yaml
```

`js-yaml` is the standard YAML parser for the Node/Bun ecosystem — stable, well-typed, zero sub-dependencies.

---

## Binary Compatibility

The asset is resolved at runtime using `import.meta.dir`:

```ts
const assetPath = join(import.meta.dir, "../../assets/default-suite.yaml")
```

Bun embeds files referenced this way into the compiled binary automatically. No extra `--asset-naming` flags needed.

---

## Tests

`tests/config/loader.test.ts` is adjusted:

- Remove `import { defaultSuite } from "../../src/config/default-suite"` — that file no longer exists
- The test `"returns default suite when no override path exists"` changes from `toEqual(defaultSuite.apps)` to asserting specific known apps (e.g., neovim is present)
- Tests 2–4 (terminal apps exist, desktop apps exist, neovim exists) require no changes

A new test is added: `"falls back to default when override YAML is malformed"`.

---

## User Override

The user override file moves from `~/.config/raze/suite.toml` to `~/.config/raze/suite.yaml`. Same merge behavior: entries in the override replace default entries by app name. New entries are appended.

Example override:

```yaml
apps:
  - name: neovim
    description: My custom neovim setup
    tags: [terminal]
    packages:
      apt:
        install: neovim-nightly  # override just the apt package
```
