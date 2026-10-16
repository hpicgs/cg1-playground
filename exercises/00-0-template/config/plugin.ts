import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { basename, join, relative } from "node:path";
import type { Plugin } from "vite";
import { renderContent } from "./markdown.ts";

/** Exercise folder names: `<chapter>-<n>-<slug>`. */
const exerciseName = /^\d{2}-\d+-[a-z0-9]+(-[a-z0-9]+)*$/;

/** Files the page is built from, which Vite does not track itself. */
const contentFile = /(^|[\\/])(content\.md|meta\.json|config[\\/]macros\.json)$/;

/** Shader files inside a demo folder: `src/<demo>/<file>.vert|frag`. */
const shaderFile = /[\\/]src[\\/][\w-]+[\\/][\w.-]+\.(vert|frag)$/;

/** Request body of the save endpoint: the new source and the text the editor loaded. */
type SaveRequest = {
    page: string;
    demo: string;
    file: string;
    source: string;
    loaded: string;
};

/**
 * Vite plugin shared by the root server and every exercise.
 *
 * @remarks Renders `content.md` into `index.html` and reloads the page when content files change.
 * @returns The plugin for `vite.config.ts`.
 */
export function playground(): Plugin {
    let root = "";

    return {
        name: "cg1-playground",

        configResolved(config) {
            root = config.root;
        },

        configureServer(server) {
            // Redirect /exercises/<name> to /exercises/<name>/ so relative paths work.
            server.middlewares.use((request, response, next) => {
                const match = /^\/exercises\/([^/?]+)(\?.*)?$/.exec(request.url ?? "");
                if (match && exerciseName.test(match[1])) {
                    response.statusCode = 301;
                    response.setHeader("Location", `/exercises/${match[1]}/${match[2] ?? ""}`);
                    response.end();
                    return;
                }
                next();
            });

            // Save endpoint for the shader editor.
            server.middlewares.use("/__playground/save", (request, response) => {
                void save(root, request, response);
            });

            // Pages that do not exist redirect to their exercise, or else to the start page.
            return () => {
                server.middlewares.use((request, response, next) => {
                    const url = decodeURIComponent((request.url ?? "/").split("?")[0]);
                    const file = join(root, url);
                    const isPage = request.headers.accept?.includes("text/html") ?? false;
                    const isFile = existsSync(file) && statSync(file).isFile();
                    if (request.method !== "GET" || !isPage || isFile) {
                        next();
                        return;
                    }
                    const folder = exerciseFolder(root, url);
                    const inExercise =
                        folder !== undefined && folder !== root && existsSync(folder);
                    response.statusCode = 302;
                    response.setHeader(
                        "Location",
                        inExercise ? `/exercises/${basename(folder)}/` : "/",
                    );
                    response.end();
                });
            };
        },

        // Header and rendered content.md into index.html.
        transformIndexHtml(html, context) {
            const folder = exerciseFolder(root, context.path);
            if (folder === undefined) {
                return html;
            }
            const meta = readJson(join(folder, "meta.json")) as { title: string };
            const macros = readJson(join(folder, "config/macros.json")) as Record<string, string>;
            const markdown = readFileSync(join(folder, "content.md"), "utf8");
            const content = renderContent(markdown, macros, folder);

            // The chapter is the first part of the folder name, e.g. 02 in 02-1-dithering.
            const chapter = Number(basename(folder).slice(0, 2));
            const title = escapeHtml(meta.title);
            const header = `<header><p class="chapter">Kapitel ${chapter}</p><h1>${title}</h1></header>`;

            return html
                .replace(/<title>.*<\/title>/, `<title>${title}</title>`)
                .replace(
                    '<main id="content"></main>',
                    `<main id="content">\n${header}\n${content}</main>`,
                );
        },

        // Full reload on content changes, which Vite does not track. Shader changes go to the
        // page as an event instead, so only the affected demo recompiles.
        async hotUpdate({ file, server, read, modules }) {
            if (contentFile.test(file)) {
                if (this.environment.name === "client") {
                    server.ws.send({ type: "full-reload" });
                }
                return [];
            }
            if (shaderFile.test(file)) {
                // Drop Vite's cached copy so a later page load gets the new source.
                for (const module of modules) {
                    this.environment.moduleGraph.invalidateModule(module);
                }
                if (this.environment.name === "client") {
                    server.ws.send("playground:shader", {
                        path: `/${relative(root, file).replaceAll("\\", "/")}`,
                        source: await read(),
                    });
                }
                return [];
            }
        },
    };
}

/**
 * Finds the exercise folder a request belongs to.
 *
 * @param root - The server's root folder.
 * @param url - The request path, e.g. `/exercises/00-0-template/`.
 * @returns The absolute folder, the root itself when an exercise runs standalone, or
 *   `undefined` for requests outside an exercise (landing page).
 */
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

/**
 * Writes a shader file for the editor.
 *
 * @remarks Accepts only same-origin requests and only shaders declared editable in the
 *   exercise's `\demo` lines. Refuses with 409 if the file changed since the editor loaded it.
 * @param root - The server's root folder.
 * @param request - POST request with a {@link SaveRequest} body.
 * @param response - Answers 200, or an error status with a message.
 */
async function save(
    root: string,
    request: IncomingMessage,
    response: ServerResponse,
): Promise<void> {
    function answer(status: number, body: object): void {
        response.statusCode = status;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify(body));
    }

    if (request.method !== "POST" || request.headers.origin !== `http://${request.headers.host}`) {
        answer(403, { error: "Anfrage nicht erlaubt" });
        return;
    }

    let text = "";
    for await (const chunk of request) {
        text += String(chunk);
    }
    let body: SaveRequest;
    try {
        body = JSON.parse(text) as SaveRequest;
    } catch {
        answer(400, { error: "Ungültige Anfrage" });
        return;
    }

    const folder = exerciseFolder(root, String(body.page));
    if (
        folder === undefined ||
        !editableShaders(folder).includes(`${body.demo}/${body.file}`) ||
        typeof body.source !== "string"
    ) {
        answer(403, { error: "Diese Datei darf nicht gespeichert werden" });
        return;
    }

    const path = join(folder, "src", body.demo, body.file);
    if (readFileSync(path, "utf8").replaceAll("\r\n", "\n") !== body.loaded) {
        answer(409, { error: "Die Datei wurde inzwischen geändert" });
        return;
    }
    writeFileSync(path, body.source);
    answer(200, {});
}

/**
 * Lists the shaders an exercise declares editable.
 *
 * @param folder - Absolute exercise folder.
 * @returns Entries like `quad/quad.vert`, from lines like `\demo{quad}[quad.vert, quad.frag]`.
 */
function editableShaders(folder: string): string[] {
    const content = readFileSync(join(folder, "content.md"), "utf8");
    const files: string[] = [];
    for (const match of content.matchAll(/^\\demo\{([\w-]+)\}\[(.*)\]\s*$/gm)) {
        for (const file of match[2].split(",")) {
            if (/^[\w.-]+\.(vert|frag)$/.test(file.trim())) {
                files.push(`${match[1]}/${file.trim()}`);
            }
        }
    }
    return files;
}

function readJson(path: string): unknown {
    return JSON.parse(readFileSync(path, "utf8"));
}

function escapeHtml(text: string): string {
    return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
