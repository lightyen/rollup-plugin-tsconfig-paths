import type { Plugin } from "rollup"

interface TsConfigPathsOpitons {
	tsConfigPath: string | string[]
	logLevel: "warn" | "debug" | "none"
	colors: boolean
	strict: boolean
	respectCoreModule: boolean
}

export function tsconfigPaths(options?: Partial<TsConfigPathsOpitons>): Plugin
export default tsconfigPaths
