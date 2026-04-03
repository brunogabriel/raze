import { $ } from "bun"

export interface CommandOptions {
  shell?: boolean
  dryRun?: boolean
  cwd?: string
}

export interface CommandResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
  dryRun?: boolean
}

export async function runCommand(
  command: string,
  options: CommandOptions = {}
): Promise<CommandResult> {
  if (options.dryRun) {
    return { success: true, exitCode: 0, stdout: "", stderr: "", dryRun: true }
  }

  try {
    const proc = await $`sh -c ${command}`.cwd(options.cwd ?? process.cwd()).quiet()
    return {
      success: proc.exitCode === 0,
      exitCode: proc.exitCode,
      stdout: proc.stdout.toString(),
      stderr: proc.stderr.toString(),
    }
  } catch (err: any) {
    return {
      success: false,
      exitCode: err.exitCode ?? 1,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? String(err),
    }
  }
}
