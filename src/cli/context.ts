import { Logger } from "../utils/logger"
import { loadConfig } from "../config/loader"
import { Detector } from "../core/detector"
import type { RuntimeContext, KernelResult } from "../kernels/base.kernel"

export interface GlobalOpts {
  verbose: boolean
  dryRun: boolean
  failFast: boolean
  config?: string
}

export type BuildContextFn = (opts: GlobalOpts) => Promise<{ logger: Logger; ctx: RuntimeContext }>

export async function buildContext(opts: GlobalOpts): Promise<{ logger: Logger; ctx: RuntimeContext }> {
  const logger = new Logger({ verbose: opts.verbose, dryRun: opts.dryRun })
  const config = await loadConfig(opts.config)
  const detector = new Detector()
  const ctx = await detector.detect(config)
  return { logger, ctx }
}

export function printSummary(results: KernelResult[]): void {
  console.log("\n--- Summary ---")
  for (const r of results) {
    const icon = r.status === "success" ? "✓" : r.status === "skipped" ? "-" : "✗"
    const line = `  ${icon} ${r.kernel.padEnd(20)} ${r.status}  (${r.duration}ms)`
    if (r.reason) {
      console.log(line + `  — ${r.reason}`)
    } else {
      console.log(line)
    }
  }
}
