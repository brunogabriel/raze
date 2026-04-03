import { readFileSync, existsSync } from "fs"
import type {
  OS,
  Distro,
  PackageManager,
  RuntimeContext,
  RazeConfig,
} from "../kernels/base.kernel"

interface DetectorOptions {
  osReleasePath?: string
  pathOverride?: string[]
}

export class Detector {
  private osReleasePath: string
  private pathOverride: string[] | undefined

  constructor(options: DetectorOptions = {}) {
    this.osReleasePath = options.osReleasePath ?? "/etc/os-release"
    this.pathOverride = options.pathOverride
  }

  async detect(config: RazeConfig): Promise<RuntimeContext> {
    const os = this.detectOS()
    const distro = this.detectDistro()
    const packageManager = await this.detectPackageManager()
    const hasDesktop = this.detectDesktop()

    return Object.freeze({ os, distro, packageManager, hasDesktop, config })
  }

  private detectOS(): OS {
    switch (process.platform) {
      case "linux": return "linux"
      case "darwin": return "macos"
      case "win32": return "windows"
      default: return "linux"
    }
  }

  private detectDistro(): Distro {
    if (!existsSync(this.osReleasePath)) return "unknown"

    try {
      const content = readFileSync(this.osReleasePath, "utf-8")
      const id = content.match(/^ID=(.+)$/m)?.[1]?.toLowerCase().replace(/"/g, "") ?? ""
      const idLike = content.match(/^ID_LIKE=(.+)$/m)?.[1]?.toLowerCase() ?? ""

      if (id === "arch" || idLike.includes("arch")) return "arch"
      if (id === "fedora" || idLike.includes("fedora")) return "fedora"
      if (id === "ubuntu" || idLike.includes("ubuntu")) return "ubuntu"
      if (id === "debian" || idLike.includes("debian")) return "debian"
      return "unknown"
    } catch {
      return "unknown"
    }
  }

  private async detectPackageManager(): Promise<PackageManager> {
    const candidates: Array<{ cmd: string; name: PackageManager }> = [
      { cmd: "yay", name: "yay" },
      { cmd: "pacman", name: "pacman" },
      { cmd: "dnf", name: "dnf" },
      { cmd: "apt-get", name: "apt" },
      { cmd: "brew", name: "brew" },
    ]

    for (const { cmd, name } of candidates) {
      if (await this.commandExists(cmd)) return name
    }
    return "unknown"
  }

  private async commandExists(cmd: string): Promise<boolean> {
    if (this.pathOverride !== undefined && this.pathOverride.length === 0) {
      return false
    }
    try {
      const proc = Bun.spawnSync(["which", cmd], { stderr: "pipe", stdout: "pipe" })
      return proc.exitCode === 0
    } catch {
      return false
    }
  }

  private detectDesktop(): boolean {
    return !!(
      process.env.DISPLAY ||
      process.env.WAYLAND_DISPLAY ||
      process.env.XDG_SESSION_TYPE
    )
  }
}
