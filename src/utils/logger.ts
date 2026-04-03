import chalk from "chalk"
import ora, { type Ora } from "ora"

export interface LoggerOptions {
  verbose: boolean
  dryRun: boolean
}

export class Logger {
  private options: LoggerOptions
  private spinner: Ora | null = null

  constructor(options: LoggerOptions) {
    this.options = options
  }

  get isVerbose(): boolean {
    return this.options.verbose
  }

  get isDryRun(): boolean {
    return this.options.dryRun
  }

  info(message: string): void {
    if (this.spinner) {
      this.spinner.text = message
    } else {
      console.log(chalk.blue("  info ") + message)
    }
  }

  warn(message: string): void {
    console.warn(chalk.yellow("  warn ") + message)
  }

  error(message: string): void {
    console.error(chalk.red(" error ") + message)
  }

  verbose(message: string): void {
    if (this.options.verbose) {
      console.log(chalk.gray("   cmd ") + message)
    }
  }

  pauseSpinner(): void {
    this.spinner?.stop()
  }

  resumeSpinner(text?: string): void {
    if (this.spinner) {
      if (text) this.spinner.text = text
      this.spinner.start()
    }
  }

  startSpinner(text: string): void {
    this.spinner = ora(text).start()
  }

  succeedSpinner(text: string): void {
    this.spinner?.succeed(chalk.green(text))
    this.spinner = null
  }

  failSpinner(text: string): void {
    this.spinner?.fail(chalk.red(text))
    this.spinner = null
  }

  warnSpinner(text: string): void {
    this.spinner?.warn(chalk.yellow(text))
    this.spinner = null
  }
}
