import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		dts(),
	],
	build: {
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			formats: ["es", "cjs"],
			fileName: (format) => format === "cjs" ? "index.cjs" : `index.${format}.js`,
		},
		rollupOptions: {
			external: ["react", "react-dom", "react/jsx-runtime"],
		},
		sourcemap: true,
		emptyOutDir: true,
	},
})
