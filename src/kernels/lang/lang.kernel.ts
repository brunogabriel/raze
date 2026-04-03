import type { Logger } from "../../utils/logger"
import { runCommand } from "../../utils/shell"

export interface LangDefinition {
  name: string
  description: string
  misePlugin: string
  miseVersion: string
  misePluginUrl?: string
}

export interface LangContext {
  langs: LangDefinition[]
}

export interface LangKernelOptions {
  onLangProcessed?: (name: string) => void
  onLangSkipped?: (name: string) => void
}

export class LangKernel {
  name = "LangKernel"
  private logger: Logger
  private options: LangKernelOptions

  constructor(logger: Logger, options: LangKernelOptions = {}) {
    this.logger = logger
    this.options = options
  }

  async execute(_ctx: LangContext): Promise<void> {
    // implementation in Task 3
  }
}
