import type { Plugin } from "rollup"
import ts from "typescript"
import fs from "fs"
import { createHandler } from "typescript-paths"
import { LogLevel, formatLog, PLUGIN_NAME } from "./log"

interface PluginOptions {
	tsConfigPath?: string | string[]
	logLevel?: LogLevel
	colors?: boolean
	strict?: boolean
	respectCoreModule?: boolean
}

export function tsConfigPaths({
	tsConfigPath,
	respectCoreModule,
	strict,
	logLevel = "warn",
	colors = true,
}: PluginOptions = {}): Plugin {
	if (logLevel === "debug") {
		console.log(formatLog({ level: "info", value: `typescript version: ${ts.version}`, colors }))
	}

	let handler = createHandler({
		tsConfigPath,
		logLevel,
		colors,
		respectCoreModule,
		loggerID: PLUGIN_NAME,
		falllback: moduleName => (fs.existsSync(moduleName) ? moduleName : undefined),
	})

	return {
		name: PLUGIN_NAME,
		buildStart() {
			handler = createHandler({
				tsConfigPath,
				logLevel,
				colors,
				strict,
				respectCoreModule,
				loggerID: PLUGIN_NAME,
				falllback: moduleName => (fs.existsSync(moduleName) ? moduleName : undefined),
			})
			return
		},
		async resolveId(request: string, importer?: string) {
			if (!importer || request.startsWith("\0")) {
				return null
			}

			const moduleName = handler?.(request, importer)
			if (!moduleName) {
				return this.resolve(request, importer, { skipSelf: true })
			}

			if (logLevel === "debug") {
				console.log(formatLog({ level: "info", value: `${request} -> ${moduleName}`, colors }))
			}

			return moduleName
		},
	}
}

export default tsConfigPaths
