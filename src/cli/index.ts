#!/usr/bin/env bun
import { Command } from "commander"
import { buildContext } from "./context"
import { registerInstall } from "./commands/install"
import { registerSetup } from "./commands/setup"
import { registerUpdate } from "./commands/update"
import { registerDoctor } from "./commands/doctor"
import { registerLangs } from "./commands/langs"
// @ts-ignore — Bun resolves package.json as object at runtime
import pkg from "../../package.json"

const program = new Command()

program
  .name("raze")
  .description("Raze Automates Zero-Config Environment")
  .version(pkg.version)
  .option("--verbose", "detailed output", false)
  .option("--dry-run", "simulate without executing", false)
  .option("--fail-fast", "stop on first kernel failure", false)
  .option("--config <path>", "alternative config file path")

registerInstall(program, buildContext)
registerSetup(program, buildContext)
registerUpdate(program, buildContext)
registerDoctor(program, buildContext)
registerLangs(program)

program.parse()
