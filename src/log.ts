export const PLUGIN_NAME = "tsconfig-paths"

export type LogLevel = "warn" | "debug" | "none"

export function formatLog({
	level,
	value,
	colors = true,
}: {
	level: "error" | "warn" | "info"
	value: unknown
	colors?: boolean
}) {
	let message = ""
	switch (level) {
		case "error":
			message = `[${PLUGIN_NAME}]: ${value}`
		case "warn":
			message = `[${PLUGIN_NAME}]: ${value}`
		default:
			message = `[${PLUGIN_NAME}]: ${value}`
	}

	if (colors) {
		switch (level) {
			case "error":
				return `\x1b[1;31m${message}\x1b[0m`
			case "warn":
				return `\x1b[1;33m${message}\x1b[0m`
			default:
				return `\x1b[1;34m${message}\x1b[0m`
		}
	}

	return message
}
