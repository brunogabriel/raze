import type { IKernel, RuntimeContext } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { runCommand } from "../../utils/shell"
import { isBinaryInstalled } from "../../utils/package-managers"

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
    if (await isBinaryInstalled("zsh")) {
      this.logger.info("Setting zsh as default shell...")
      const zshPath = await runCommand("which zsh", { dryRun: false })
      await runCommand(`chsh -s ${zshPath.stdout.trim()}`, { dryRun })
    }

    this.logger.info("Setup complete.")
  }
}
