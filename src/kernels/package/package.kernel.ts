import type { IKernel, RuntimeContext, PackageManager } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { runCommand } from "../../utils/shell"
import { INSTALL_COMMANDS } from "../../utils/package-managers"

interface PackageKernelOptions {
  onAppProcessed?: (name: string) => void
  onAppSkipped?: (name: string) => void
}

export class PackageKernel implements IKernel {
  name = "PackageKernel"
  private logger: Logger
  private options: PackageKernelOptions

  constructor(logger: Logger, options: PackageKernelOptions = {}) {
    this.logger = logger
    this.options = options
  }

  canHandle(ctx: RuntimeContext): boolean {
    return ctx.packageManager !== "unknown"
  }

  async execute(ctx: RuntimeContext): Promise<void> {
    const pm = ctx.packageManager as Exclude<PackageManager, "unknown">
    const terminalApps = ctx.config.apps.filter((a) => a.tags.includes("terminal"))
    const dryRun = this.logger.isDryRun

    for (const app of terminalApps) {
      const steps = app.packages[pm]

      if (!steps) {
        this.logger.warn(`Skipping ${app.name}: no entry for ${pm}`)
        this.options.onAppSkipped?.(app.name)
        continue
      }

      this.logger.info(`Installing ${app.name}...`)

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
