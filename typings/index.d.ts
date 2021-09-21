import type { Plugin } from "rollup"

interface TsConfigPathsOpitons {
	tsConfigPath: string | string[]
	logLevel: "none" | "error" | "warn" | "info" | "debug" | "trace"
	colors: boolean
	strict: boolean
	respectCoreModule: boolean
}

export function tsconfigPaths(options?: Partial<TsConfigPathsOpitons>): Plugin
export default tsconfigPaths
