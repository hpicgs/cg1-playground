import { resolve } from "node:path";
import { defineConfig } from "vite";
import { playground } from "./plugin.ts";

export default defineConfig({
    root: resolve(import.meta.dirname, ".."),
    appType: "mpa",
    server: {
        host: "localhost",
    },
    plugins: [playground()],
});
