import { createHandler, createLogger, LogLevel } from "typescript-paths"
import path from "path"
import fs from "fs"

const log = createLogger({ logLevel: LogLevel.None })

test("resolving paths", async () => {
	const handler = createHandler({
		log,
		tsConfigPath: [path.resolve(__dirname, "t0/tsconfig.json")],
		falllback: moduleName => (fs.existsSync(moduleName) ? moduleName : undefined),
	})

	expect(handler).toBeTruthy()
	const resolve = (request: string) => handler!(request, path.resolve(__dirname, "t0/index.ts"))

	expect(resolve("~/hello")).toEqual(path.resolve(__dirname, "t0", "hello.ts"))
	expect(resolve("~/qqq/hello")).toEqual(require.resolve(path.join(__dirname, "t0", "qqq/hello.js")))
	expect(resolve("@xxx/abc/xxx")).toEqual(path.resolve(__dirname, "t0", "xyz/abc/xyz.ts"))
	expect(resolve("@xxx/fff")).toEqual(path.resolve(__dirname, "t0", "abc/fff.js"))
	expect(resolve("#m/abc")).toEqual(path.resolve(__dirname, "t0", "xyz/abc/xyz.ts"))
	expect(resolve("#m/fff")).toEqual(path.resolve(__dirname, "t0", "abc/fff.js"))

	expect(resolve("@xxx/ggg.svg")).toEqual(path.resolve(__dirname, "t0", "abc/ggg.svg"))
	expect(resolve("@xxx/App.tsx")).toEqual(path.resolve(__dirname, "t0", "abc/App.tsx"))
	expect(resolve("roll")).toEqual(require.resolve("rollup"))
	expect(resolve("./t0/abc/App")).toBeFalsy()
	expect(resolve("rollup")).toBeFalsy()
})
