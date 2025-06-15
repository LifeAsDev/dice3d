import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			entry: "src/DiceScene.js",
			name: "DiceScene",
			fileName: "dice-scene",
			formats: ["es"], // Asegúrate de incluir UMD
		},
	},
});
