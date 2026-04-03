import type { IKernel, RuntimeContext, PackageManager, AppTag, AppDefinition } from "./base.kernel"
import type { Logger } from "../utils/logger"
import { runCommand } from "../utils/shell"
import { INSTALL_COMMANDS, CHECK_COMMANDS } from "../utils/package-managers"

export interface TagKernelOptions {
  onAppProcessed?: (name: string) => void
  onAppSkipped?: (name: string) => void
  onAppFailed?: (name: string, reason: string) => void
}

export abstract class TagKernel implements IKernel {
  abstract name: string
  abstract tag: AppTag
  protected logger: Logger
  protected options: TagKernelOptions

  constructor(logger: Logger, options: TagKernelOptions = {}) {
    this.logger = logger
    this.options = options
  }

  abstract canHandle(ctx: RuntimeContext): boolean

  protected installMessage(name: string): string {
    return `Installing ${name}...`
  }

  private async isInstalled(app: AppDefinition, pm: Exclude<PackageManager, "unknown">): Promise<boolean> {
    // Prefer binary check (works for curl-installed apps too)
    if (app.binary) {
      const result = await runCommand(`which ${app.binary}`, { dryRun: false })
      return result.success
    }

    // Fall back to PM query using the install package name or app name
    const pkgName = app.packages[pm]?.install ?? app.name
    if (!pkgName) return false
    const checkCmd = `${CHECK_COMMANDS[pm]} ${pkgName}`
    const result = await runCommand(checkCmd, { dryRun: false })
    return result.success
  }

  async execute(ctx: RuntimeContext): Promise<void> {
    const pm = ctx.packageManager as Exclude<PackageManager, "unknown">
    const apps = ctx.config.apps.filter((a) => a.tags.includes(this.tag))
    const dryRun = this.logger.isDryRun
    const failures: { name: string; reason: string }[] = []

    for (const app of apps) {
      const steps = app.packages[pm]

      if (!steps) {
        this.logger.warn(`Skipping ${app.name}: no entry for ${pm}`)
        this.options.onAppSkipped?.(app.name)
        continue
      }

      if (await this.isInstalled(app, pm)) {
        this.logger.info(`Already installed: ${app.name}`)
        this.options.onAppSkipped?.(app.name)
        continue
      }

      this.logger.info(this.installMessage(app.name))

      try {
        for (const pre of steps.pre ?? []) {
          this.logger.verbose(`pre: ${pre}`)
          const result = await runCommand(pre, { dryRun })
          if (!result.success) throw new Error(`pre-step failed: ${result.stderr}`)
        }

        if (steps.install != null) {
          const installCmd = `${INSTALL_COMMANDS[pm]} ${steps.install}`
          this.logger.verbose(`install: ${installCmd}`)
          const result = await runCommand(installCmd, { dryRun })
          if (!result.success) throw new Error(`install failed: ${result.stderr}`)
        }

        for (const post of steps.post ?? []) {
          this.logger.verbose(`post: ${post}`)
          const postResult = await runCommand(post, { dryRun })
          if (!postResult.success) throw new Error(`post-step failed: ${postResult.stderr}`)
        }

        this.options.onAppProcessed?.(app.name)
      } catch (err: unknown) {
        const reason = err instanceof Error ? err.message : String(err)
        this.logger.warn(`Failed to install ${app.name}: ${reason}`)
        this.options.onAppFailed?.(app.name, reason)
        failures.push({ name: app.name, reason })
      }
    }

    if (failures.length > 0) {
      const list = failures.map((f) => `  - ${f.name}: ${f.reason}`).join("\n")
      throw new Error(`${failures.length} app(s) failed to install:\n${list}`)
    }
  }
}
