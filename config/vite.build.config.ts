import { cpSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig, mergeConfig } from "vite";
import devConfig from "./vite.config.ts";

const root = resolve(import.meta.dirname, "..");
const exercises = readdirSync(join(root, "exercises"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join("exercises", entry.name));

export default mergeConfig(
    devConfig,
    defineConfig({
        // Relative URLs work under the repository's GitHub Pages path and in forks.
        base: "./",
        build: {
            rolldownOptions: {
                input: ["index.html", ...exercises.map((folder) => join(folder, "index.html"))].map(
                    (file) => join(root, file),
                ),
            },
        },
        plugins: [
            {
                name: "exercise-assets",
                // Images rendered from Markdown keep their paths relative to the exercise.
                writeBundle(options) {
                    for (const folder of exercises) {
                        const assets = join(root, folder, "assets");
                        if (existsSync(assets) && options.dir !== undefined) {
                            cpSync(assets, join(options.dir, folder, "assets"), {
                                recursive: true,
                            });
                        }
                    }
                },
            },
        ],
    }),
);
