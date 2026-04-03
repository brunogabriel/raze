import type { Command } from "commander"
import { runCommand } from "../../utils/shell"
import type { BuildContextFn, GlobalOpts } from "../context"

export function registerList(program: Command, buildContext: BuildContextFn): void {
  program
    .command("list")
    .description("List suite apps with installed/pending status")
    .action(async () => {
      const opts = program.opts() as GlobalOpts
      const { ctx } = await buildContext(opts)

      console.log("\nRaze App Suite:\n")
      for (const app of ctx.config.apps) {
        const check = await runCommand(`which ${app.name}`)
        const status = check.success ? "installed" : "pending"
        const tags = app.tags.join(", ")
        console.log(`  ${app.name.padEnd(20)} [${tags}]  ${status}`)
      }
    })
}
