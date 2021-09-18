import type { Plugin } from "rollup"
import ts from "typescript"
import fs from "fs"
import { getTsConfig, createMappings, dtsExcludedHost, resolveModuleName } from "./paths"
import { LogLevel, formatLog, PLUGIN_NAME } from "./log"

interface PluginOptions {
	tsConfigPath?: string
	logLevel?: LogLevel
}

export function tsConfigPaths({
	tsConfigPath = process.env["TS_NODE_PROJECT"] || ts.findConfigFile(".", ts.sys.fileExists) || "tsconfig.json",
	logLevel = "warn",
}: PluginOptions = {}): Plugin {
	if (logLevel === "debug") {
		console.log(formatLog("info", `typescript version: ${ts.version}`))
	}
	let compilerOptions = getTsConfig(tsConfigPath, ts.sys)
	let mappings = createMappings({ paths: compilerOptions.paths!, logLevel })
	return {
		name: PLUGIN_NAME,
		buildStart() {
			compilerOptions = getTsConfig(tsConfigPath, ts.sys)
			mappings = createMappings({ paths: compilerOptions.paths!, logLevel })
			return
		},
		async resolveId(request: string, importer?: string) {
			if (!importer || request.startsWith("\0")) {
				return null
			}

			const moduleName = resolveModuleName({
				compilerOptions,
				mappings,
				request,
				importer,
				host: dtsExcludedHost,
				// NOTE: For those are not modules, ex: css, fonts...etc.
				falllback: moduleName => (fs.existsSync(moduleName) ? moduleName : undefined),
			})

			if (!moduleName) {
				return this.resolve(request, importer, { skipSelf: true })
			}

			if (logLevel === "debug") {
				console.log(formatLog("info", `${request} -> ${moduleName}`))
			}

			return moduleName
		},
	}
}

export default tsConfigPaths
