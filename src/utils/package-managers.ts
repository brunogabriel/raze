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
