import type { RuntimeContext, AppTag } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { TagKernel, type TagKernelOptions } from "../tag.kernel"

export class DriverKernel extends TagKernel {
  name = "DriverKernel"
  tag: AppTag = "driver"

  constructor(logger: Logger, options: TagKernelOptions = {}) {
    super(logger, options)
  }

  canHandle(ctx: RuntimeContext): boolean {
    return ctx.config.apps.some((a) => a.category.includes("driver"))
  }

  protected override installMessage(name: string): string {
    return `Installing driver: ${name}...`
  }
}
