import type { Logger } from "../../utils/logger"
import { runCommand } from "../../utils/shell"

export interface LangDefinition {
  name: string
  description: string
  misePlugin: string
  miseVersion: string
  misePluginUrl?: string
}

export interface LangContext {
  langs: LangDefinition[]
}

export interface LangKernelOptions {
  onLangProcessed?: (name: string) => void
  onLangSkipped?: (name: string) => void
}

export class LangKernel {
  name = "LangKernel"
  private logger: Logger
  private options: LangKernelOptions

  constructor(logger: Logger, options: LangKernelOptions = {}) {
    this.logger = logger
    this.options = options
  }

  async execute(ctx: LangContext): Promise<void> {
    const dryRun = this.logger.isDryRun

    for (const lang of ctx.langs) {
      this.logger.info(`Installing language: ${lang.name}...`)

      if (lang.misePluginUrl) {
        this.logger.verbose(`mise plugin add ${lang.misePlugin} ${lang.misePluginUrl}`)
        const pluginResult = await runCommand(
          `mise plugin add ${lang.misePlugin} ${lang.misePluginUrl}`,
          { dryRun }
        )
        if (!pluginResult.success) {
          throw new Error(`mise plugin add failed for ${lang.name}: ${pluginResult.stderr}`)
        }
      }

      const installCmd = `mise use --global ${lang.misePlugin}@${lang.miseVersion}`
      this.logger.verbose(`install: ${installCmd}`)
      const result = await runCommand(installCmd, { dryRun })
      if (!result.success) {
        throw new Error(`mise install failed for ${lang.name}: ${result.stderr}`)
      }

      this.options.onLangProcessed?.(lang.name)
    }
  }
}
