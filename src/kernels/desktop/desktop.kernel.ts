import type { RuntimeContext, AppTag } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { TagKernel, type TagKernelOptions } from "../tag.kernel"

export class DesktopKernel extends TagKernel {
  name = "DesktopKernel"
  tag: AppTag = "desktop"

  constructor(logger: Logger, options: TagKernelOptions = {}) {
    super(logger, options)
  }

  canHandle(ctx: RuntimeContext): boolean {
    return ctx.hasDesktop
  }

  protected override installMessage(name: string): string {
    return `Installing desktop app: ${name}...`
  }
}
