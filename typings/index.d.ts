import type { Plugin } from "rollup"

interface TsConfigPathsOpitons {
	tsConfigPath: string
	logLevel: "warn" | "debug" | "none"
	colors: boolean
}

export function tsconfigPaths(options?: Partial<TsConfigPathsOpitons>): Plugin
export default tsconfigPaths
