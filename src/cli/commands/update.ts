import type { Command } from "commander"
import { runCommand } from "../../utils/shell"
import { UPDATE_COMMANDS } from "../../utils/package-managers"
import type { BuildContextFn, GlobalOpts } from "../context"

export function registerUpdate(program: Command, buildContext: BuildContextFn): void {
  program
    .command("update")
    .description("Update apps installed by raze")
    .action(async () => {
      const opts = program.opts() as GlobalOpts
      const { logger, ctx } = await buildContext(opts)

      const pm = ctx.packageManager
      if (pm === "unknown") {
        logger.error("No supported package manager detected.")
        process.exit(1)
      }

      logger.info(`Updating system packages with ${pm}...`)
      const result = await runCommand(UPDATE_COMMANDS[pm], { dryRun: opts.dryRun })
      if (!result.success) {
        logger.error(`Update failed: ${result.stderr}`)
        process.exit(1)
      }
      logger.info("Update complete.")
    })
}
