import type { IKernel, RuntimeContext } from "../kernels/base.kernel"

export class KernelRegistry {
  private kernels: IKernel[] = []

  register(kernel: IKernel): void {
    if (this.kernels.some((k) => k.name === kernel.name)) {
      throw new Error(`Kernel "${kernel.name}" is already registered`)
    }
    this.kernels.push(kernel)
  }

  getApplicable(ctx: RuntimeContext): IKernel[] {
    return this.kernels.filter((k) => k.canHandle(ctx))
  }
}
