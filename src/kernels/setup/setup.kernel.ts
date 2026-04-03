import type { IKernel, RuntimeContext } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { runCommand } from "../../utils/shell"

export class SetupKernel implements IKernel {
  name = "SetupKernel"
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  canHandle(_ctx: RuntimeContext): boolean {
    return true
  }

  async execute(_ctx: RuntimeContext): Promise<void> {
    const dryRun = this.logger.isDryRun
    this.logger.info("Running setup steps...")

    // Change default shell to zsh if available
    const zshPath = await runCommand("which zsh", { dryRun: false })
    if (zshPath.success) {
      this.logger.info("Setting zsh as default shell...")
      await runCommand(`chsh -s ${zshPath.stdout.trim()}`, { dryRun })
    }

    this.logger.info("Setup complete.")
  }
}
