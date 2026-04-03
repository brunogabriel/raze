#!/usr/bin/env bun
import { Command } from "commander"
import { Detector } from "../core/detector"
import { KernelRegistry } from "../core/kernel-registry"
import { Runner } from "../core/runner"
import { Logger } from "../utils/logger"
import { loadConfig } from "../config/loader"
import { PackageKernel } from "../kernels/package/package.kernel"
import { DesktopKernel } from "../kernels/desktop/desktop.kernel"
import { DriverKernel } from "../kernels/driver/driver.kernel"
import { SetupKernel } from "../kernels/setup/setup.kernel"

const program = new Command()

program
  .name("raze")
  .description("Raze Automates Zero-Config Environment")
  .version("0.1.0")
  .option("--verbose", "detailed output", false)
  .option("--dry-run", "simulate without executing", false)
  .option("--fail-fast", "stop on first kernel failure", false)
  .option("--config <path>", "alternative config file path")

interface GlobalOpts {
  verbose: boolean
  dryRun: boolean
  failFast: boolean
  config?: string
}

async function buildContext(opts: GlobalOpts) {
  const logger = new Logger({ verbose: opts.verbose, dryRun: opts.dryRun })
  const config = await loadConfig(opts.config)
  const detector = new Detector()
  const ctx = await detector.detect(config)
  return { logger, ctx }
}

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

    const updateCommands: Record<string, string> = {
      pacman: "pacman -Syu --noconfirm",
      yay: "yay -Syu --noconfirm",
      dnf: "dnf upgrade -y",
      apt: "apt-get update -y && apt-get upgrade -y",
      brew: "brew upgrade",
    }

    const { runCommand } = await import("../utils/shell")
    logger.info(`Updating system packages with ${pm}...`)
    const result = await runCommand(updateCommands[pm]!, { dryRun: opts.dryRun })
    if (!result.success) {
      logger.error(`Update failed: ${result.stderr}`)
      process.exit(1)
    }
    logger.info("Update complete.")
  })

program
  .command("doctor")
  .description("Diagnose installed apps and detect issues")
  .action(async () => {
    const opts = program.opts() as GlobalOpts
    const { logger, ctx } = await buildContext(opts)

    console.log(`\nOS:              ${ctx.os}`)
    console.log(`Distro:          ${ctx.distro}`)
    console.log(`Package Manager: ${ctx.packageManager}`)
    console.log(`Desktop:         ${ctx.hasDesktop ? "yes" : "no"}`)
    console.log(`\nApp Suite:`)

    const { runCommand } = await import("../utils/shell")
    for (const app of ctx.config.apps) {
      const check = await runCommand(`which ${app.name}`)
      const status = check.success ? "installed" : "missing"
      const icon = check.success ? "✓" : "✗"
      console.log(`  ${icon} ${app.name.padEnd(20)} ${status}`)
    }
  })

program
  .command("list")
  .description("List suite apps with installed/pending status")
  .action(async () => {
    const opts = program.opts() as GlobalOpts
    const { logger, ctx } = await buildContext(opts)

    const { runCommand } = await import("../utils/shell")
    console.log("\nRaze App Suite:\n")
    for (const app of ctx.config.apps) {
      const check = await runCommand(`which ${app.name}`)
      const status = check.success ? "installed" : "pending"
      const tags = app.tags.join(", ")
      console.log(`  ${app.name.padEnd(20)} [${tags}]  ${status}`)
    }
  })

function printSummary(results: Array<{ kernel: string; status: string; reason?: string; duration: number }>) {
  console.log("\n--- Summary ---")
  for (const r of results) {
    const icon = r.status === "success" ? "✓" : r.status === "skipped" ? "-" : "✗"
    const line = `  ${icon} ${r.kernel.padEnd(20)} ${r.status}  (${r.duration}ms)`
    if (r.reason) {
      console.log(line + `  — ${r.reason}`)
    } else {
      console.log(line)
    }
  }
}

program.parse()
