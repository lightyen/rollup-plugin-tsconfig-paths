import type { Plugin } from "rollup"
import type { TsConfigPayload } from "typescript-paths"

interface TsConfigPathsOpitons {
	tsConfigPath: string | string[] | TsConfigPayload | TsConfigPayload[]
	logLevel: "none" | "error" | "warn" | "info" | "debug" | "trace"
	colors: boolean
	strict: boolean
	respectCoreModule: boolean
}

export function tsconfigPaths(options?: Partial<TsConfigPathsOpitons>): Plugin
export default tsconfigPaths
