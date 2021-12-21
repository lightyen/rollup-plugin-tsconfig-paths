import type { Plugin } from "rollup"
import type { Options } from "typescript-paths"
export declare type PluginOptions = Omit<Options, "loggerID">
export declare function tsConfigPaths({ tsConfigPath, respectCoreModule, logLevel, colors }?: PluginOptions): Plugin
export default tsConfigPaths
