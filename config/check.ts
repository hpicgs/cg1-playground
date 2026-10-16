// Checks the repository conventions before a PR, since there is no CI (requirements §7.2).
// Run it with `npm run check:repo`. Node runs this file directly and only strips the types.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const errors: string[] = [];

// Files that must be byte-identical in every exercise.
const sharedInExercises = [
    "config/plugin.ts",
    "config/markdown.ts",
    "config/page.ts",
    "config/editor.ts",
    "config/vite.config.ts",
    "config/tsconfig.json",
    "config/tsconfig.node.json",
    "config/eslint.config.js",
    "config/.prettierrc.json",
    "tsconfig.json",
    "eslint.config.js",
    ".prettierignore",
];

// Server-side files that must also be identical between the repository root and every exercise,
// because the root server runs its own copy of them.
const sharedWithRoot = ["config/plugin.ts", "config/markdown.ts", "config/vite.config.ts"];

// Exercise folders are named <chapter>-<n>-<slug>, for example 02-1-dithering.
const exerciseName = /^\d{2}-\d+-[a-z0-9]+(-[a-z0-9]+)*$/;

// Every folder in exercises/ is an exercise. Plain files such as .gitkeep are skipped.
const exercises = readdirSync(join(root, "exercises"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

// Reads a file as text, or returns undefined if it does not exist.
function readText(path: string): string | undefined {
    return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}

// 1. Folder names.
for (const name of exercises) {
    if (!exerciseName.test(name)) {
        errors.push(`exercises/${name}: folder name does not match <chapter>-<n>-<slug>`);
    }
}

// 2. Package names. npm workspaces need unique names, and a copied exercise with an unchanged
// name breaks `npm install` for the whole repository.
type PackageJson = {
    name?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
};
const rootPackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as PackageJson;
const packages: { path: string; json: PackageJson }[] = [
    { path: "package.json", json: rootPackage },
];
for (const name of exercises) {
    const path = `exercises/${name}/package.json`;
    const text = readText(join(root, path));
    if (text === undefined) {
        errors.push(`${path}: missing`);
        continue;
    }
    const json = JSON.parse(text) as PackageJson;
    packages.push({ path, json });
    if (json.name !== name) {
        errors.push(`${path}: package name is "${json.name}", but must be "${name}"`);
    }
}

// 3. Versions. A package used in several package.json files must have the same version in all
// of them, so that no exercise runs the shared plugin against another version.
const firstSeen = new Map<string, { version: string; path: string }>();
for (const { path, json } of packages) {
    const dependencies = { ...json.dependencies, ...json.devDependencies };
    for (const [dependency, version] of Object.entries(dependencies)) {
        const first = firstSeen.get(dependency);
        if (first === undefined) {
            firstSeen.set(dependency, { version, path });
        } else if (first.version !== version) {
            errors.push(
                `${path}: ${dependency} is ${version}, but ${first.version} in ${first.path}`,
            );
        }
    }
}

// 4. Shared files. Each exercise is compared with the first exercise, and the server-side files
// also with the root. A missing file counts as a difference.
const reference = exercises[0];
if (reference !== undefined) {
    for (const file of sharedInExercises) {
        const expected = readText(join(root, "exercises", reference, file));
        for (const name of exercises.slice(1)) {
            if (readText(join(root, "exercises", name, file)) !== expected) {
                errors.push(`exercises/${name}/${file}: differs from exercises/${reference}`);
            }
        }
    }
    for (const file of sharedWithRoot) {
        const expected = readText(join(root, file));
        for (const name of exercises) {
            if (readText(join(root, "exercises", name, file)) !== expected) {
                errors.push(`exercises/${name}/${file}: differs from the root's ${file}`);
            }
        }
    }
}

// Report the result. A non-zero exit code stops `npm run check`.
if (errors.length > 0) {
    for (const error of errors) {
        console.error(error);
    }
    console.error(`check:repo found ${errors.length} problem(s).`);
    process.exit(1);
}
console.log(`check:repo passed (${exercises.length} exercise(s)).`);
