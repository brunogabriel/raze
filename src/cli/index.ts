#!/usr/bin/env bun
import { Command } from "commander"
import { buildContext } from "./context"
import { registerInstall } from "./commands/install"
import { registerSetup } from "./commands/setup"
import { registerUpdate } from "./commands/update"
import { registerDoctor } from "./commands/doctor"

const program = new Command()

program
  .name("raze")
  .description("Raze Automates Zero-Config Environment")
  .version("0.1.0")
  .option("--verbose", "detailed output", false)
  .option("--dry-run", "simulate without executing", false)
  .option("--fail-fast", "stop on first kernel failure", false)
  .option("--config <path>", "alternative config file path")

registerInstall(program, buildContext)
registerSetup(program, buildContext)
registerUpdate(program, buildContext)
registerDoctor(program, buildContext)

program.parse()
