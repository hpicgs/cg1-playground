import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

// Exercise folders are named <chapter>-<n>-<slug>, for example 00-0-template.
const exerciseName = /^\d{2}-\d+-[a-z0-9]+(-[a-z0-9]+)*$/;

export function playground(): Plugin {
    return {
        name: "cg1-playground",
    };
}

// Works out which exercise folder a request belongs to.
// On the repository root's server, every exercise is served under /exercises/<name>/.
// When an exercise runs on its own, the server's root folder is the exercise itself.
// Returns undefined if the request belongs to no exercise, for example the landing page.
export function exerciseFolder(root: string, url: string): string | undefined {
    if (!existsSync(join(root, "exercises"))) {
        return root;
    }
    const name = url.split("/")[2];
    if (url.startsWith("/exercises/") && name !== undefined && exerciseName.test(name)) {
        return join(root, "exercises", name);
    }
    return undefined;
}
