import type { Command } from "commander"
import { loadLangs } from "../../config/langs-loader"
import { LangKernel } from "../../kernels/lang/lang.kernel"
import { Logger } from "../../utils/logger"
import type { GlobalOpts } from "../context"
import { printSummary } from "../context"
import type { KernelResult } from "../../kernels/base.kernel"

export function registerLangs(program: Command): void {
  program
    .command("langs")
    .description("Install programming languages via mise")
    .action(async () => {
      const opts = program.opts() as GlobalOpts
      const logger = new Logger({ verbose: opts.verbose, dryRun: opts.dryRun })
      const ctx = await loadLangs(opts.config)

      if (ctx.langs.length === 0) {
        console.log("No languages configured.")
        return
      }

      const results: KernelResult[] = []
      const kernel = new LangKernel(logger)
      const start = Date.now()

      logger.startSpinner("Running kernel: LangKernel")
      try {
        await kernel.execute(ctx)
        const duration = Date.now() - start
        logger.succeedSpinner("LangKernel completed")
        results.push({ kernel: "LangKernel", status: "success", duration })
      } catch (err: unknown) {
        const duration = Date.now() - start
        const reason = err instanceof Error ? err.message : String(err)
        logger.failSpinner(`LangKernel failed: ${reason}`)
        results.push({ kernel: "LangKernel", status: "failed", reason, duration })
      }

      printSummary(results)
      const failed = results.some((r) => r.status === "failed")
      process.exit(failed ? 1 : 0)
    })
}
