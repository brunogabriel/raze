export type OS = "linux" | "macos" | "windows"
export type Distro = "arch" | "fedora" | "ubuntu" | "debian" | "unknown"
export type PackageManager = "pacman" | "yay" | "dnf" | "apt" | "brew" | "unknown"
export type AppTag = "terminal" | "desktop" | "driver" | "optional"

export interface PackageSteps {
  pre?: string[]
  install?: string | null
  post?: string[]
}

export interface AppDefinition {
  name: string
  description: string
  category: AppTag[]
  packages: Partial<Record<Exclude<PackageManager, "unknown">, PackageSteps | null>>
  binary?: string
}

export interface RazeConfig {
  apps: AppDefinition[]
}

export interface RuntimeContext {
  readonly os: OS
  readonly distro: Distro
  readonly packageManager: PackageManager
  readonly hasDesktop: boolean
  readonly config: RazeConfig
}

export type KernelStatus = "success" | "skipped" | "failed"

export interface KernelResult {
  kernel: string
  status: KernelStatus
  reason?: string
  duration: number
}

export interface IKernel {
  name: string
  canHandle(ctx: RuntimeContext): boolean
  execute(ctx: RuntimeContext): Promise<void>
  rollback?(ctx: RuntimeContext): Promise<void>
}
