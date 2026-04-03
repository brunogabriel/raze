import type { RuntimeContext, AppTag } from "../base.kernel"
import type { Logger } from "../../utils/logger"
import { TagKernel, type TagKernelOptions } from "../tag.kernel"

export class PackageKernel extends TagKernel {
  name = "PackageKernel"
  tag: AppTag = "terminal"

  constructor(logger: Logger, options: TagKernelOptions = {}) {
    super(logger, options)
  }

  canHandle(ctx: RuntimeContext): boolean {
    return ctx.packageManager !== "unknown"
  }
}
