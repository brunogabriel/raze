import type { Command } from "commander"
import { runCommand } from "../../utils/shell"
import { CHECK_COMMANDS } from "../../utils/package-managers"
import type { BuildContextFn, GlobalOpts } from "../context"
import type { AppDefinition, PackageManager } from "../../kernels/base.kernel"

function resolveBinary(app: AppDefinition): string | null {
  // Apps with explicit binary field use that
  if (app.binary) return app.binary
  // Apps whose name matches their binary (most cases)
  // base-devel and other meta-packages have no binary — return null
  return app.name
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

      const pm = ctx.packageManager

      for (const app of ctx.config.apps) {
        const binary = resolveBinary(app)
        let installed = false

        if (binary && binary !== app.name) {
          // Explicit binary field — use which
          const check = await runCommand(`which ${binary}`, { stream: false })
          installed = check.success
        } else {
          // Try which first, fall back to PM query
          const whichCheck = await runCommand(`which ${binary}`, { stream: false })
          if (whichCheck.success) {
            installed = true
          } else           if (pm !== "unknown") {
              const pkgName = app.packages[pm]?.install ?? app.name
            if (pkgName) {
              const pmCheck = await runCommand(`${CHECK_COMMANDS[pm]} ${pkgName}`, { stream: false })
              installed = pmCheck.success
            }
          }
        }

        const status = installed ? "installed" : "missing"
        const icon = installed ? "✓" : "✗"
        const tags = app.tags.join(", ")
        console.log(`  ${icon} ${app.name.padEnd(20)} ${tags.padEnd(16)} ${status}`)
      }
    })
}
