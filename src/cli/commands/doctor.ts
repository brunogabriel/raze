import type { Command } from "commander"
import { runCommand } from "../../utils/shell"
import type { BuildContextFn, GlobalOpts } from "../context"

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
        const check = await runCommand(`which ${app.name}`)
        const status = check.success ? "installed" : "missing"
        const icon = check.success ? "✓" : "✗"
        console.log(`  ${icon} ${app.name.padEnd(20)} ${status}`)
      }
    })
}
