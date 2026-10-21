// Repository convention checks (npm run check:repo).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharedFiles from "./check.json" with { type: "json" };

const root = resolve(import.meta.dirname, "..");
const errors: string[] = [];

/** Files that must be identical in every exercise, and those that must also match the root. */
const { sharedInExercises, sharedWithRoot } = sharedFiles;

/** Exercise folder names: `<chapter>-<n>-<slug>`. */
const exerciseName = /^\d{2}-\d+-[a-z0-9]+(-[a-z0-9]+)*$/;

// Exercise folders.
const exercises = readdirSync(join(root, "exercises"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

function readText(path: string): string | undefined {
    return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}

// 1. Folder names.
for (const name of exercises) {
    if (!exerciseName.test(name)) {
        errors.push(`exercises/${name}: folder name does not match <chapter>-<n>-<slug>`);
    }
}

// 2. Package names.
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

// 3. Versions.
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

// 4. Shared files.
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

// Result.
if (errors.length > 0) {
    for (const error of errors) {
        console.error(error);
    }
    console.error(`check:repo found ${errors.length} problem(s).`);
    process.exit(1);
}
console.log(`check:repo passed (${exercises.length} exercise(s)).`);
