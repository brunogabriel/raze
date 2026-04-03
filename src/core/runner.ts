import type { IKernel, KernelResult, RuntimeContext } from "../kernels/base.kernel"
import type { Logger } from "../utils/logger"

interface RunnerOptions {
  failFast?: boolean
}

export class Runner {
  private logger: Logger
  private options: RunnerOptions

  constructor(logger: Logger, options: RunnerOptions = {}) {
    this.logger = logger
    this.options = options
  }

  async run(kernels: IKernel[], ctx: RuntimeContext): Promise<KernelResult[]> {
    const results: KernelResult[] = []
    const executed: IKernel[] = []

    for (const kernel of kernels) {
      const start = Date.now()
      this.logger.startSpinner(`Running kernel: ${kernel.name}`)

      try {
        await kernel.execute(ctx)
        const duration = Date.now() - start
        this.logger.succeedSpinner(`${kernel.name} completed`)
        results.push({ kernel: kernel.name, status: "success", duration })
        executed.push(kernel)
      } catch (err: unknown) {
        const duration = Date.now() - start
        const reason = err instanceof Error ? err.message : String(err)
        this.logger.failSpinner(`${kernel.name} failed: ${reason}`)
        results.push({ kernel: kernel.name, status: "failed", reason, duration })

        if (this.options.failFast) {
          await this.rollbackAll([...executed, kernel], ctx)
          break
        }
      }
    }

    return results
  }

  private async rollbackAll(kernels: IKernel[], ctx: RuntimeContext): Promise<void> {
    for (const kernel of kernels.reverse()) {
      if (kernel.rollback) {
        try {
          await kernel.rollback(ctx)
        } catch {
          // rollback failures are silently ignored
        }
      }
    }
  }
}
