import type { IKernel, RuntimeContext, PackageManager } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { runCommand } from "../../utils/shell"

interface DesktopKernelOptions {
  onAppProcessed?: (name: string) => void
  onAppSkipped?: (name: string) => void
}

const INSTALL_COMMANDS: Record<Exclude<PackageManager, "unknown">, string> = {
  pacman: "pacman -S --noconfirm",
  yay: "yay -S --noconfirm",
  dnf: "dnf install -y",
  apt: "apt-get install -y",
  brew: "brew install",
}

export class DesktopKernel implements IKernel {
  name = "DesktopKernel"
  private logger: Logger
  private options: DesktopKernelOptions

  constructor(logger: Logger, options: DesktopKernelOptions = {}) {
    this.logger = logger
    this.options = options
  }

  canHandle(ctx: RuntimeContext): boolean {
    return ctx.hasDesktop
  }

  async execute(ctx: RuntimeContext): Promise<void> {
    const pm = ctx.packageManager as Exclude<PackageManager, "unknown">
    const desktopApps = ctx.config.apps.filter((a) => a.tags.includes("desktop"))
    const dryRun = this.logger.isDryRun

    for (const app of desktopApps) {
      const steps = app.packages[pm]

      if (!steps) {
        this.logger.warn(`Skipping ${app.name}: no entry for ${pm}`)
        this.options.onAppSkipped?.(app.name)
        continue
      }

      this.logger.info(`Installing desktop app: ${app.name}...`)

      for (const pre of steps.pre ?? []) {
        this.logger.verbose(`pre: ${pre}`)
        const result = await runCommand(pre, { dryRun })
        if (!result.success) throw new Error(`pre-step failed for ${app.name}: ${result.stderr}`)
      }

      const installCmd = `${INSTALL_COMMANDS[pm]} ${steps.install}`
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
