#!/usr/bin/env bun
import { Command } from "commander"

const program = new Command()

program
  .name("raze")
  .description("Raze Automates Zero-Config Environment")
  .version("0.1.0")

program.parse()
