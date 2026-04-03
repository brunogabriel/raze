import type { Command } from "commander"
import { KernelRegistry } from "../../core/kernel-registry"
import { Runner } from "../../core/runner"
import { SetupKernel } from "../../kernels/setup/setup.kernel"
import type { BuildContextFn, GlobalOpts } from "../context"
import { printSummary } from "../context"

export function registerSetup(program: Command, buildContext: BuildContextFn): void {
  program
    .command("setup")
    .description("Configure dotfiles, symlinks, and initial configs")
    .action(async () => {
      const opts = program.opts() as GlobalOpts
      const { logger, ctx } = await buildContext(opts)

      const registry = new KernelRegistry()
      registry.register(new SetupKernel(logger))

      const runner = new Runner(logger, { failFast: opts.failFast })
      const kernels = registry.getApplicable(ctx)
      const results = await runner.run(kernels, ctx)

      printSummary(results)
      const failed = results.some((r) => r.status === "failed")
      process.exit(failed ? 1 : 0)
    })
}
