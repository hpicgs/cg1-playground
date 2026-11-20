import { resolve } from "node:path";
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default defineConfig(
    js.configs.recommended,

    tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: resolve(import.meta.dirname, ".."),
            },
        },
    },
    {
        rules: {
            "@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
        },
    },
    {
        files: ["**/*.js"],
        extends: [tseslint.configs.disableTypeChecked],
    },
);
