import { createMappings, dtsExcludedHost, findMatch, getTsConfig, resolveModuleName } from "../src"
import ts from "typescript"
import path from "path"

test("read config", async () => {
	const compilerOptions = getTsConfig(path.resolve(__dirname, "bad.tsconfig.json"), "TEST", ts.sys)
	expect(compilerOptions).toBeTruthy()
	expect(compilerOptions.baseUrl).toBeTruthy()
	expect(compilerOptions.paths).toBeTruthy()
	expect(!(compilerOptions.paths instanceof Array)).toBeTruthy()
})

test("path mappings", async () => {
	let mappings = createMappings({
		paths: {
			"~/*": ["*"],
			"abc/*": ["xxx/*"],
			"abc/hello/*": ["cde/hello/*", "cde/hello2/*"],
			"kkk/*": ["xxx/*"],
			"kkk/*/def": ["cde/*/world", "world/*/cde"],
		},
	})
	expect(mappings).toHaveLength(5)

	// 1. not match
	let request = "abc"
	let match = findMatch(request, mappings)
	expect(match).toBeFalsy()

	// 2. match the longest prefix
	request = "abc/hello/def"
	match = findMatch(request, mappings)
	expect(match).toBeTruthy()
	if (match) {
		expect(match?.pattern).toEqual("abc/hello/*")
	}

	// 2. match the first pattern
	request = "kkk/hello/def"
	match = findMatch(request, mappings)
	expect(match).toBeTruthy()
	if (match) {
		expect(match?.pattern).toEqual("kkk/*")
	}

	// 3. match the first pattern
	mappings = createMappings({
		paths: {
			"~/*": ["./*"],
			"abc/*": ["xxx/*"],
			"abc/hello/*": ["cde/hello/*", "cde/hello2/*"],
			"kkk/*/def": ["cde/*/world", "world/*/cde"],
			"kkk/*": ["xxx/*"],
		},
	})
	match = findMatch(request, mappings)
	expect(match).toBeTruthy()
	if (match) {
		expect(match?.pattern).toEqual("kkk/*/def")
	}

	// 2. invalid pattern
	mappings = createMappings({
		paths: {
			"~/**/*": ["./*"],
			"abc/*": ["*/xxx/*"],
			"kkk/**/*/def": ["cde/*/world", "world/*/cde"],
		},
	})
	expect(mappings).toHaveLength(0)
})

test("resolving paths", async () => {
	let compilerOptions = getTsConfig(path.resolve(__dirname, "tsconfig.json"), "TEST", ts.sys)
	let mappings = createMappings({ paths: compilerOptions.paths! })
	const opts = {
		mappings,
		compilerOptions,
		host: dtsExcludedHost,
		importer: path.resolve(__dirname, "t0", "index.ts"),
		request: "~/hello",
	}
	let result = resolveModuleName(opts)
	expect(result.isNodeModules).toBeFalsy()
	expect(result.moduleName).toBeTruthy()
	expect(result.moduleName!).toEqual(path.resolve(__dirname, "t0", "hello.ts"))

	opts.request = "~/qqq/hello"
	result = resolveModuleName(opts)
	expect(result.isNodeModules).toBeFalsy()
	expect(result.moduleName).toBeTruthy()
	expect(path.resolve(__dirname, "t0", "qqq/hello.js").startsWith(result.moduleName!)).toBe(true)

	opts.request = "@xxx/abc/xxx"
	result = resolveModuleName(opts)
	expect(result.isNodeModules).toBeFalsy()
	expect(result.moduleName).toBeTruthy()
	expect(result.moduleName!).toEqual(path.resolve(__dirname, "t0", "xyz/abc/xyz.ts"))

	opts.request = "@xxx/fff"
	result = resolveModuleName(opts)
	expect(result.isNodeModules).toBeFalsy()
	expect(result.moduleName).toBeTruthy()
	expect(result.moduleName!).toEqual(path.resolve(__dirname, "t0", "abc/fff.js"))

	opts.request = "#m/abc"
	result = resolveModuleName(opts)
	expect(result.isNodeModules).toBeFalsy()
	expect(result.moduleName).toBeTruthy()
	expect(result.moduleName!).toEqual(path.resolve(__dirname, "t0", "xyz/abc/xyz.ts"))

	opts.request = "#m/fff"
	result = resolveModuleName(opts)
	expect(result.isNodeModules).toBeFalsy()
	expect(result.moduleName).toBeTruthy()
	expect(result.moduleName!).toEqual(path.resolve(__dirname, "t0", "abc/fff.js"))

	opts.request = "@xxx/ggg.svg"
	result = resolveModuleName(opts)
	expect(result.isNodeModules).toBeFalsy()
	expect(result.moduleName).toBeTruthy()
	expect(path.normalize(result.moduleName!)).toEqual(path.resolve(__dirname, "t0", "abc/ggg.svg"))

	opts.request = "@xxx/App.tsx"
	result = resolveModuleName(opts)
	expect(result.isNodeModules).toBeFalsy()
	expect(result.moduleName).toBeTruthy()
	expect(path.normalize(result.moduleName!)).toEqual(path.resolve(__dirname, "t0", "abc/App.tsx"))

	opts.request = "roll"
	result = resolveModuleName(opts)
	expect(result.isNodeModules).toBeTruthy()
	expect(result.moduleName).toBeTruthy()
	expect(result.pattern).toBeTruthy()
	expect(result.target).toBeTruthy()
	expect(result.pattern?.prefix).toEqual("")
	expect(result.pattern?.suffix).toEqual("roll")
	expect(require.resolve("rollup").startsWith(result.moduleName!)).toBe(true)

	opts.request = path.resolve(__dirname, "t0/abc/App.tsx")
	result = resolveModuleName(opts)
	expect(result.moduleName).toBeFalsy()

	opts.request = "rollup"
	result = resolveModuleName(opts)
	expect(result.moduleName).toBeFalsy()
})
