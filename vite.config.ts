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
		},
		sourcemap: true,
		emptyOutDir: true,
	},
	test: {
		include: ["src/**/*.test.ts"],
	},
})
