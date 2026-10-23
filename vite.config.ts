import { defineConfig } from 'vitest/config'
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		lib: {
			entry: resolve(import.meta.dirname, "src/index.ts"),
			formats: ["es", "cjs"],
			fileName: (format) => format === "cjs" ? "index.cjs" : `index.${format}.js`,
		},
		rolldownOptions: {
			external: ["react", "react-dom", "react/jsx-runtime"],
			output: {
				// Up to 0.2.0, require("react-raycaster") returned the component itself
				// The CommonJS build keeps it, with the named exports and default as properties of the component
				exports: "named",
			},
			plugins: [{
				name: "cjs-default-export",
				outputOptions: options => options.format === "cjs"
					? { ...options, footer: "module.exports = Object.assign(exports.default, exports);" }
					: null,
			}],
		},
		sourcemap: true,
		emptyOutDir: true,
	},
	test: {
		include: ["src/**/*.test.ts"],
	},
})
