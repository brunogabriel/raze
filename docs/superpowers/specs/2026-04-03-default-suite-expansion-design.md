# Design: default-suite.yaml Expansion

**Date:** 2026-04-03
**Source:** brunogabriel/arch-setup (https://github.com/brunogabriel/arch-setup)

## Goal

Expand `assets/default-suite.yaml` to reflect the full app list from the arch-setup project, plus the base dependencies (`curl`, `git`, `unzip`, `base-devel`) that should always be installed first.

## Decisions

- All apps use `tags: [terminal]` or `tags: [desktop]` — no special tag for base dependencies
- Base deps (`curl`, `git`, `unzip`, `base-devel`) are the first entries under terminal
- `opencode` and `uv` have no package manager entry — installed via curl script across all PMs
- `fd` binary differs on apt (`fdfind`) — handled via per-PM `install:` + `binary: fd` field
- `github-cli` requires repo setup on apt/dnf before install
- `brave` and `vscode` require repo/key setup on apt/dnf
- Desktop apps not included (too specific): antigravity, bitwarden, calibre, chrome, cursor, gimp, gnome-boxes, gufw, heroic-games-launcher, kdenlive, lsfg-vk, lutris, pinta, podman-desktop, protonplus, steam, tk, xournal

## Final App List

### Terminal

| Name | binary | Notes |
|------|--------|-------|
| curl | curl | base dep |
| git | git | base dep |
| unzip | unzip | base dep |
| base-devel | — | pacman=base-devel, apt=build-essential, dnf=gcc+make+automake, brew=skip |
| neovim | nvim | already in suite (apt: ppa pre-step) |
| tmux | tmux | already in suite |
| zsh | zsh | already in suite |
| fzf | fzf | already in suite |
| ripgrep | rg | already in suite |
| bat | bat | already in suite |
| eza | eza | already in suite (apt: apt-key pre-step) |
| starship | starship | already in suite (apt: curl install) |
| lazygit | lazygit | already in suite (apt/dnf: manual install) |
| btop | btop | new |
| fastfetch | fastfetch | new |
| fd | fd | new — apt pkg: fd-find, binary: fdfind handled per-PM |
| jq | jq | new |
| tldr | tldr | new |
| zoxide | zoxide | new |
| github-cli | gh | new — apt/dnf require repo pre-setup |
| lazydocker | lazydocker | new — yay: lazydocker-bin, apt/dnf: curl install, brew: lazydocker |
| opencode | opencode | new — curl https://opencode.ai/install \| bash (all PMs) |
| uv | uv | new — curl -LsSf https://astral.sh/uv/install.sh \| sh (all PMs) |
| mise | mise | already in suite |
| docker | docker | already in suite |

### Desktop

| Name | Notes |
|------|-------|
| alacritty | already in suite |
| firefox | already in suite |
| vlc | already in suite |
| obsidian | already in suite |
| brave | new — yay: brave-bin, apt/dnf: repo pre-setup, brew: --cask brave-browser |
| vscode | new — yay: visual-studio-code-bin, apt/dnf: repo pre-setup, brew: --cask visual-studio-code |
| kitty | new — all PMs: kitty, brew: --cask kitty |
| jetbrains-toolbox | new — yay: jetbrains-toolbox, apt/dnf: curl install, brew: --cask jetbrains-toolbox |
| dbeaver | new — yay: dbeaver, apt/dnf: dbeaver-ce, brew: --cask dbeaver-community |

## Cross-PM Install Details for New Apps

### base-devel
- pacman: `base-devel`
- yay: `base-devel`
- apt: `build-essential`
- dnf: `gcc make automake`
- brew: skip (xcode-select already provides build tools)

### github-cli (gh)
- pacman/yay: `github-cli`
- apt: pre: add GitHub apt repo + key, install: `gh`
- dnf: pre: `dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo`, install: `gh`
- brew: `gh`

### lazydocker
- pacman: `lazydocker` (community)
- yay: `lazydocker-bin`
- apt: pre: `curl https://raw.githubusercontent.com/jesseduffield/lazydocker/master/scripts/install_update_linux.sh | bash`
- dnf: same curl install
- brew: `lazydocker`

### opencode
- all PMs: pre: `curl -fsSL https://opencode.ai/install | bash`, install: ~

### uv
- all PMs: pre: `curl -LsSf https://astral.sh/uv/install.sh | sh`, install: ~

### brave
- pacman: `brave-browser` (community)
- yay: `brave-bin`
- apt: pre: add brave apt repo + key, install: `brave-browser`
- dnf: pre: `dnf config-manager --add-repo https://brave-browser-rpm-release.s3.brave.com/brave-browser.repo`, install: `brave-browser`
- brew: `--cask brave-browser`

### vscode
- pacman: `code`
- yay: `visual-studio-code-bin`
- apt: pre: add Microsoft apt repo + key, install: `code`
- dnf: pre: add Microsoft dnf repo, install: `code`
- brew: `--cask visual-studio-code`

### jetbrains-toolbox
- pacman: `jetbrains-toolbox` (AUR via pacman if available)
- yay: `jetbrains-toolbox`
- apt: pre: curl download + install to /usr/local/bin, install: ~
- dnf: same curl install
- brew: `--cask jetbrains-toolbox`

### dbeaver
- pacman: `dbeaver`
- yay: `dbeaver`
- apt: `dbeaver-ce` (after adding PPA or direct .deb)
- dnf: `dbeaver-ce`
- brew: `--cask dbeaver-community`

## Files Modified

| File | Action |
|------|--------|
| `assets/default-suite.yaml` | Add base deps + new terminal + new desktop apps |

## Testing

- `bun test` must pass (no code changes, YAML only)
- `bun test tests/config/loader.test.ts` verifies suite loads correctly
- `./dist/raze doctor` shows all new apps in output
