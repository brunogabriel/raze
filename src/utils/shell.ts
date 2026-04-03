import { spawn } from "bun"

export interface CommandOptions {
  shell?: boolean
  dryRun?: boolean
  cwd?: string
  stream?: boolean
}

export interface CommandResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
  dryRun?: boolean
}

let activeProc: ReturnType<typeof spawn> | null = null

process.on("SIGINT", () => {
  if (activeProc) {
    activeProc.kill()
  }
  process.exit(130)
})

export async function runCommand(
  command: string,
  options: CommandOptions = {}
): Promise<CommandResult> {
  if (options.dryRun) {
    return { success: true, exitCode: 0, stdout: "", stderr: "", dryRun: true }
  }

  try {
    const stream = options.stream ?? true
    const proc = spawn(["sh", "-c", command], {
      cwd: options.cwd ?? process.cwd(),
      stdout: stream ? "inherit" : "pipe",
      stderr: stream ? "inherit" : "pipe",
    })

    activeProc = proc

    let stdout = ""
    let stderr = ""

    if (stream) {
      const exitCode = await proc.exited
      activeProc = null
      return { success: exitCode === 0, exitCode, stdout, stderr }
    } else {
      const [out, err, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ])
      activeProc = null
      return { success: exitCode === 0, exitCode, stdout: out, stderr: err }
    }
  } catch (err: any) {
    activeProc = null
    return {
      success: false,
      exitCode: err.exitCode ?? 1,
      stdout: "",
      stderr: String(err),
    }
  }
}
