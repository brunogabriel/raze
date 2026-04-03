import type { IKernel, RuntimeContext, PackageManager } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { runCommand } from "../../utils/shell"

interface DriverKernelOptions {
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

export class DriverKernel implements IKernel {
  name = "DriverKernel"
  private logger: Logger
  private options: DriverKernelOptions

  constructor(logger: Logger, options: DriverKernelOptions = {}) {
    this.logger = logger
    this.options = options
  }

  canHandle(ctx: RuntimeContext): boolean {
    return ctx.config.apps.some((a) => a.tags.includes("driver"))
  }

  async execute(ctx: RuntimeContext): Promise<void> {
    const pm = ctx.packageManager as Exclude<PackageManager, "unknown">
    const driverApps = ctx.config.apps.filter((a) => a.tags.includes("driver"))
    const dryRun = this.logger.isDryRun

    for (const app of driverApps) {
      const steps = app.packages[pm]

      if (!steps) {
        this.logger.warn(`Skipping driver ${app.name}: no entry for ${pm}`)
        this.options.onAppSkipped?.(app.name)
        continue
      }

      this.logger.info(`Installing driver: ${app.name}...`)

      for (const pre of steps.pre ?? []) {
        this.logger.verbose(`pre: ${pre}`)
        const result = await runCommand(pre, { dryRun })
        if (!result.success) throw new Error(`pre-step failed for ${app.name}: ${result.stderr}`)
      }

      const installCmd = `${INSTALL_COMMANDS[pm]} ${steps.install!}`
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
