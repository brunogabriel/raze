import type { Command } from "commander"
import { runCommand } from "../../utils/shell"
import type { BuildContextFn, GlobalOpts } from "../context"
import type { AppDefinition } from "../../kernels/base.kernel"

function resolveBinary(app: AppDefinition): string {
  return app.binary ?? app.name
}

export function registerDoctor(program: Command, buildContext: BuildContextFn): void {
  program
    .command("doctor")
    .description("Diagnose installed apps and detect issues")
    .action(async () => {
      const opts = program.opts() as GlobalOpts
      const { ctx } = await buildContext(opts)

      console.log(`\nOS:              ${ctx.os}`)
      console.log(`Distro:          ${ctx.distro}`)
      console.log(`Package Manager: ${ctx.packageManager}`)
      console.log(`Desktop:         ${ctx.hasDesktop ? "yes" : "no"}`)
      console.log(`\nApp Suite:`)

      for (const app of ctx.config.apps) {
        const binary = resolveBinary(app)
        const check = await runCommand(`which ${binary}`)
        const status = check.success ? "installed" : "missing"
        const icon = check.success ? "✓" : "✗"
        const tags = app.tags.join(", ")
        console.log(`  ${icon} ${app.name.padEnd(20)} ${tags.padEnd(16)} ${status}`)
      }
    })
}
