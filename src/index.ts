import type { PartialResolvedId, Plugin } from "rollup"
import ts from "typescript"
import path from "path"
import fs from "fs"

export interface Mapping {
	pattern: string
	prefix: string
	suffix: string
	wildcard: boolean
	targets: string[]
}

type LogLevel = "warn" | "debug" | "none"

interface PluginOptions {
	tsConfigPath?: string
	logLevel?: LogLevel
}

const PLUGIN_NAME = "tsconfig-paths"

function formatLog(level: "error" | "warn" | "info", pluginName: string, value: unknown) {
	switch (level) {
		case "error":
			return `\x1b[1;31m[${pluginName}]: ${value}\x1b[0m`
		case "warn":
			return `\x1b[1;33m[${pluginName}]: ${value}\x1b[0m`
		default:
			return `\x1b[1;34m[${pluginName}]: ${value}\x1b[0m`
	}
}

export function getTsConfig(tsConfigPath: string, pluginName: string, host: ts.ParseConfigHost) {
	const { error, config } = ts.readConfigFile(tsConfigPath, host.readFile)
	if (error) {
		throw new Error(formatLog("error", pluginName, error.messageText))
	}
	let { options: compilerOptions } = ts.parseJsonConfigFileContent(config, host, path.dirname(tsConfigPath))
	if (!compilerOptions) {
		throw new Error(formatLog("error", pluginName, "'compilerOptions' is gone."))
	}
	if (compilerOptions.baseUrl == undefined) {
		compilerOptions.baseUrl = path.dirname(tsConfigPath)
	}
	if (!compilerOptions.paths || compilerOptions.paths instanceof Array) {
		compilerOptions.paths = {}
	}
	return compilerOptions
}

export function createMappings({
	paths,
	logLevel = "none",
	pluginName = PLUGIN_NAME,
}: {
	paths: ts.MapLike<string[]>
	logLevel?: "warn" | "debug" | "none"
	pluginName?: string
}): Mapping[] {
	const countWildcard = (value: string) => value.match(/\*/g)?.length
	const valid = (value: string) => /(\*|\/\*|\/\*\/)/.test(value)

	const mappings: Mapping[] = []
	for (const pattern of Object.keys(paths)) {
		if (countWildcard(pattern) > 1) {
			logLevel != "none" &&
				console.warn(formatLog("warn", pluginName, `Pattern '${pattern}' can have at most one '*' character.`))
			continue
		}
		const wildcard = pattern.indexOf("*")
		if (wildcard !== -1 && !valid(pattern)) {
			logLevel != "none" && console.warn(formatLog("warn", pluginName, `path pattern '${pattern}' is not valid.`))
			continue
		}
		const targets = paths[pattern].filter(target => {
			if (countWildcard(target) > 1) {
				logLevel != "none" &&
					console.warn(
						formatLog(
							"warn",
							pluginName,
							`Substitution '${target}' in pattern '${pattern}' can have at most one '*' character.`,
						),
					)
				return false
			}
			const wildcard = target.indexOf("*")
			if (wildcard !== -1 && !valid(target)) {
				logLevel != "none" &&
					console.warn(formatLog("warn", pluginName, `target pattern '${target}' is not valid`))
				return false
			}
			if (target.indexOf("@types") !== -1 || target.endsWith(".d.ts")) {
				logLevel != "none" && console.warn(formatLog("warn", pluginName, `type defined ${target} is ignored.`))
				return false
			}
			return true
		})
		if (targets.length == 0) {
			continue
		}
		if (pattern === "*") {
			mappings.push({ wildcard: true, pattern, prefix: "", suffix: "", targets })
			continue
		}
		mappings.push({
			wildcard: wildcard !== -1,
			pattern,
			prefix: pattern.slice(0, wildcard),
			suffix: pattern.slice(wildcard + 1),
			targets,
		})
	}

	if (logLevel === "debug") {
		for (const mapping of mappings) {
			console.log(formatLog("info", pluginName, `pattern: '${mapping.pattern}' targets: '${mapping.targets}'`))
		}
	}
	return mappings
}

export function isPatternMatch(prefix: string, suffix: string, candidate: string): boolean {
	return (
		candidate.length >= prefix.length + suffix.length && candidate.startsWith(prefix) && candidate.endsWith(suffix)
	)
}

export function findMatch(moduleName: string, mappings: Mapping[]): Mapping | undefined {
	let longestMatchedPrefixLength = 0
	let matched: Mapping | undefined
	for (const mapping of mappings) {
		const { wildcard, prefix, suffix, pattern } = mapping
		if (wildcard && isPatternMatch(prefix, suffix, moduleName)) {
			if (longestMatchedPrefixLength < prefix.length) {
				longestMatchedPrefixLength = prefix.length
				matched = mapping
			}
		} else if (moduleName === pattern) {
			matched = mapping
			break
		}
	}
	return matched
}

export function resolveModuleName({
	mappings,
	request,
	importer,
	compilerOptions,
	host,
}: {
	compilerOptions: ts.CompilerOptions
	mappings: Mapping[]
	request: string
	importer: string
	host: ts.ModuleResolutionHost
}): { name: string; isNodeModules: boolean } | undefined {
	const matched = findMatch(request, mappings)
	if (!matched) {
		const result = ts.resolveModuleName(request, importer, compilerOptions, host)
		if (result?.resolvedModule && result.resolvedModule.resolvedFileName.indexOf("node_modules/") === -1) {
			let name = result.resolvedModule.resolvedFileName
			if (name.endsWith(".d.ts")) {
				const extensions = [".js", ".jsx"]
				for (let i = 0; i < extensions.length; i++) {
					const guess = name.replace(/\.d\.ts$/, extensions[i])
					if (fs.existsSync(guess)) {
						return { name: guess, isNodeModules: false }
					}
				}
				return undefined
			}
			return { name, isNodeModules: false }
		}
		return undefined
	}

	const matchedWildcard = request.slice(matched.prefix.length, request.length - matched.suffix.length)

	for (const target of matched.targets) {
		const updated = matched.wildcard ? target.replace("*", matchedWildcard) : target
		const moduleName = path.resolve(compilerOptions.baseUrl, updated)
		if (moduleName.indexOf("node_modules/") !== -1) {
			return { name: moduleName, isNodeModules: true }
		}
		// NOTE: resolve module path with typescript API
		const result = ts.resolveModuleName(moduleName, importer, compilerOptions, host)
		if (result?.resolvedModule) {
			return { name: result.resolvedModule.resolvedFileName, isNodeModules: false }
		}
		// NOTE: For those are not modules, ex: css, fonts...etc.
		if (fs.existsSync(moduleName)) {
			return { name: moduleName, isNodeModules: false }
		}
	}

	return undefined
}

export default function tsConfigPaths({
	tsConfigPath = process.env["TS_NODE_PROJECT"] || ts.findConfigFile(".", ts.sys.fileExists) || "tsconfig.json",
	logLevel = "warn",
}: PluginOptions = {}): Plugin {
	if (logLevel === "debug") {
		console.log(formatLog("info", PLUGIN_NAME, `typescript version: ${ts.version}`))
	}
	let compilerOptions = getTsConfig(tsConfigPath, PLUGIN_NAME, ts.sys)
	let mappings = createMappings({ paths: compilerOptions.paths, logLevel, pluginName: PLUGIN_NAME })
	return {
		name: PLUGIN_NAME,
		buildStart() {
			compilerOptions = getTsConfig(tsConfigPath, PLUGIN_NAME, ts.sys)
			mappings = createMappings({ paths: compilerOptions.paths, logLevel, pluginName: PLUGIN_NAME })
			return null
		},
		async resolveId(importee: string, importer: string) {
			if (!importer || importee.startsWith("\0")) {
				return null
			}

			const moduleName = resolveModuleName({
				compilerOptions,
				mappings,
				request: importee,
				importer,
				host: ts.sys,
			})

			if (!moduleName) {
				// fallback
				return this.resolve(importee, importer, { skipSelf: true }).then(resolved => {
					let finalResult: PartialResolvedId = resolved
					if (!finalResult) {
						finalResult = { id: importee }
					}
					return finalResult
				})
			}

			const { name, isNodeModules } = moduleName

			if (isNodeModules) {
				if (logLevel === "debug") {
					console.log(formatLog("info", PLUGIN_NAME, `${importee} -> ${name}`))
				}
				return this.resolve(name, importer, { skipSelf: true }).then(resolved => {
					let finalResult: PartialResolvedId = resolved
					if (!finalResult) {
						finalResult = { id: name }
					}
					return finalResult
				})
			}

			if (logLevel === "debug") {
				console.log(formatLog("info", PLUGIN_NAME, `${importee} -> ${name}`))
			}

			return name
		},
	}
}
