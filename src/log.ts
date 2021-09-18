export const PLUGIN_NAME = "tsconfig-paths"

export type LogLevel = "warn" | "debug" | "none"

export function formatLog(level: "error" | "warn" | "info", value: unknown) {
	switch (level) {
		case "error":
			return `\x1b[1;31m[${PLUGIN_NAME}]: ${value}\x1b[0m`
		case "warn":
			return `\x1b[1;33m[${PLUGIN_NAME}]: ${value}\x1b[0m`
		default:
			return `\x1b[1;34m[${PLUGIN_NAME}]: ${value}\x1b[0m`
	}
}
