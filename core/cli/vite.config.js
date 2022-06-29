import { defineConfig } from "vite"
import babel from "@rollup/plugin-babel"

export default defineConfig({
	base: "./",
	build: {
		rollupOptions: {
			input: "lib/index.js",
			output: {
				entryFileNames: "core.js",
				format: "commonjs",
			},
		},
	},
	plugins: [
		babel({
			presets: [["@babel/preset-env"]],
		}),
	],
})
