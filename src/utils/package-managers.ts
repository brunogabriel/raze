import type { PackageManager, AppDefinition } from "../kernels/base.kernel"
import { runCommand } from "./shell"

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

export const CHECK_COMMANDS: Record<Exclude<PackageManager, "unknown">, string> = {
  pacman: "pacman -Q",
  yay: "pacman -Q",
  dnf: "rpm -q",
  apt: "dpkg -l",
  brew: "brew list",
}

export async function isBinaryInstalled(binary: string): Promise<boolean> {
  const result = await runCommand(`which ${binary}`, { dryRun: false, stream: false })
  return result.success
}

export async function isAppInstalled(
  app: AppDefinition,
  pm: Exclude<PackageManager, "unknown">
): Promise<boolean> {
  if (app.binary) {
    return isBinaryInstalled(app.binary)
  }
  const pkgName = app.packages[pm]?.install ?? app.name

  if (!pkgName) return false

  const [checkResult, isBinary] = await Promise.all([
    runCommand(`${CHECK_COMMANDS[pm]} ${pkgName}`, { dryRun: false, stream: false }),
    isBinaryInstalled(pkgName),
  ])
  return checkResult.success || isBinary
}
