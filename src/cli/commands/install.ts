import type { Command } from "commander"
import { KernelRegistry } from "../../core/kernel-registry"
import { Runner } from "../../core/runner"
import { PackageKernel } from "../../kernels/package/package.kernel"
import { DesktopKernel } from "../../kernels/desktop/desktop.kernel"
import { DriverKernel } from "../../kernels/driver/driver.kernel"
import { SetupKernel } from "../../kernels/setup/setup.kernel"
import type { BuildContextFn, GlobalOpts } from "../context"
import { printSummary } from "../context"

export function registerInstall(program: Command, buildContext: BuildContextFn): void {
  program
    .command("install")
    .description("Install all suite apps")
    .action(async () => {
      const opts = program.opts() as GlobalOpts
      const { logger, ctx } = await buildContext(opts)

      const registry = new KernelRegistry()
      registry.register(new PackageKernel(logger))
      registry.register(new DesktopKernel(logger))
      registry.register(new DriverKernel(logger))
      registry.register(new SetupKernel(logger))

      const runner = new Runner(logger, { failFast: opts.failFast })
      const kernels = registry.getApplicable(ctx)
      const results = await runner.run(kernels, ctx)

      printSummary(results)
      const failed = results.some((r) => r.status === "failed")
      process.exit(failed ? 1 : 0)
    })
}
