import "katex/dist/katex.min.css";
import "./style.css";
import { createEditor, showListings, type Editor } from "./editor";

/** Functions a demo's `index.ts` exports. */
type DemoModule = {
    start: (
        canvas: HTMLCanvasElement,
        controls: HTMLElement,
        sources: Record<string, string>,
    ) => void | Promise<void>;
    rebuild?: (sources: Record<string, string>) => void;
    setVisible?: (visible: boolean) => void;
};

/** A demo on the page, with its current shader sources and its editor, if any. */
type Mounted = {
    name: string;
    path: string;
    view: HTMLElement;
    sources: Record<string, string>;
    module: DemoModule | undefined;
    editor: Editor | undefined;
    visible: boolean;
};

/** Most WebGL demos a page may have; browsers allow about 16 contexts. */
const maxWebglDemos = 12;

// Demo modules, loaded when mounted.
const modules = import.meta.glob<DemoModule>("../src/*/index.ts");

// All shader sources, keyed by path, e.g. ../src/quad/quad.frag.
const shaders = import.meta.glob<string>("../src/*/*.{vert,frag}", {
    query: "?raw",
    import: "default",
    eager: true,
});

// Step-throughs from stepper.ts, if this exercise has one.
const stepperFiles = import.meta.glob<{
    steppers: Record<string, (element: HTMLElement) => void>;
}>("./stepper.ts", { eager: true });
const steppers = stepperFiles["./stepper.ts"]?.steppers ?? {};

const mounted: Mounted[] = [];

// The shader sources of one demo, keyed by file name, e.g. { "quad.frag": "…" }.
function sourcesOf(name: string): Record<string, string> {
    const sources: Record<string, string> = {};
    for (const [path, source] of Object.entries(shaders)) {
        if (path.startsWith(`../src/${name}/`)) {
            sources[path.slice(`../src/${name}/`.length)] = source;
        }
    }
    return sources;
}

function errorBox(message: string): HTMLElement {
    const box = document.createElement("div");
    box.className = "demo-error";
    box.textContent = message;
    return box;
}

function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Recompiles a demo's shaders and shows the result in its editor log.
 *
 * @remarks A demo that has not started, or has no `rebuild`, is started again on a new canvas.
 * @param demo - The mounted demo.
 */
function rebuild(demo: Mounted): void {
    if (demo.module?.rebuild === undefined) {
        void startDemo(demo);
        return;
    }
    try {
        demo.module.rebuild(demo.sources);
        demo.editor?.showLog("Kompiliert.", false);
    } catch (error) {
        console.error(`Demo ${demo.name}:`, error);
        demo.editor?.showLog(messageOf(error), true);
    }
}

/**
 * Starts a demo on a new canvas inside its view.
 *
 * @remarks The canvas is in the page before `start` runs, so it already has its size. An
 *   error replaces the canvas with an error box; the editor stays, so the shader can be fixed.
 * @param demo - The mounted demo.
 */
async function startDemo(demo: Mounted): Promise<void> {
    const canvas = document.createElement("canvas");
    const controls = document.createElement("div");
    controls.className = "controls";
    demo.view.replaceChildren(canvas, controls);
    demo.module = undefined;

    try {
        const load = modules[`../src/${demo.name}/index.ts`];
        if (load === undefined) {
            throw new Error(`src/${demo.name}/index.ts nicht gefunden`);
        }
        const module = await load();
        await module.start(canvas, controls, demo.sources);
        demo.module = module;
        // The observer may have reported visibility while the module was still loading.
        module.setVisible?.(demo.visible);
        demo.editor?.showLog("", false);
    } catch (error) {
        console.error(`Demo ${demo.name}:`, error);
        const message = messageOf(error);
        demo.view.replaceChildren(
            errorBox(`Demo konnte nicht gestartet werden: ${message.split("\n")[0]}`),
        );
        demo.editor?.showLog(message, true);
    }
}

/**
 * Mounts one demo into its placeholder: view, fullscreen button and, if declared, the editor.
 *
 * @remarks Animated demos pause while scrolled out of view, through `setVisible`.
 *
 * @param box - The `.demo` placeholder written by `markdown.ts`.
 */
function mountDemo(box: HTMLElement): void {
    const name = box.dataset.demo ?? "";
    // Editor tabs: vertex shaders first, then fragment shaders.
    const files = (box.dataset.files ?? "")
        .split(",")
        .filter((file) => file !== "")
        .sort((a, b) => Number(a.endsWith(".frag")) - Number(b.endsWith(".frag")));

    const view = document.createElement("div");
    view.className = "demo-view";
    const fullscreen = document.createElement("button");
    fullscreen.className = "fullscreen";
    fullscreen.textContent = "Vollbild";
    fullscreen.addEventListener("click", () => {
        if (document.fullscreenElement === box) {
            void document.exitFullscreen();
        } else {
            void box.requestFullscreen();
        }
    });
    box.append(view, fullscreen);

    const demo: Mounted = {
        name,
        path: new URL(`./src/${name}/`, location.href).pathname,
        view,
        sources: sourcesOf(name),
        module: undefined,
        editor: undefined,
        visible: false,
    };
    mounted.push(demo);

    new IntersectionObserver((entries) => {
        for (const entry of entries) {
            demo.visible = entry.isIntersecting;
            demo.module?.setVisible?.(demo.visible);
        }
    }).observe(box);

    if (files.length > 0) {
        const editor = document.createElement("div");
        editor.className = "editor";
        box.classList.add("has-editor");
        box.prepend(editor);
        demo.editor = createEditor(editor, name, files, demo.sources, (sources) => {
            demo.sources = { ...demo.sources, ...sources };
            rebuild(demo);
        });
    }

    void startDemo(demo);
}

// Read-only code listings.
showListings();

// Copy buttons after IDE links copy the file's full path.
for (const button of document.querySelectorAll<HTMLButtonElement>(".copy-path")) {
    button.addEventListener("click", () => {
        void navigator.clipboard.writeText(button.dataset.path ?? "").then(() => {
            button.classList.add("copied");
            setTimeout(() => button.classList.remove("copied"), 1500);
        });
    });
}

// Self-tests: Auswerten colours the checked options, marks each question and counts the
// right ones. A question is right if exactly its right options are checked.
for (const quiz of document.querySelectorAll<HTMLElement>(".quiz")) {
    const questions = [...quiz.querySelectorAll<HTMLElement>(".question")];
    const score = quiz.querySelector(".quiz-result span");

    quiz.querySelector(".quiz-result button")?.addEventListener("click", () => {
        let rightQuestions = 0;
        for (const question of questions) {
            let allRight = true;
            for (const input of question.querySelectorAll<HTMLInputElement>("input")) {
                const correct = input.dataset.correct === "true";
                const option = input.closest(".option");
                option?.classList.toggle("right", input.checked && correct);
                option?.classList.toggle("wrong", input.checked && !correct);
                if (input.checked !== correct) {
                    allRight = false;
                }
            }
            question.classList.toggle("right", allRight);
            question.classList.toggle("wrong", !allRight);
            if (allRight) {
                rightQuestions += 1;
            }
        }
        if (score !== null) {
            score.textContent = `${rightQuestions} von ${questions.length} Fragen richtig`;
        }
    });

    // Changing an answer clears that question's marks until the next evaluation.
    for (const question of questions) {
        question.addEventListener("change", () => {
            for (const element of [question, ...question.querySelectorAll(".option")]) {
                element.classList.remove("right", "wrong");
            }
        });
    }
}

// Step-throughs.
for (const element of document.querySelectorAll<HTMLElement>(".stepper")) {
    const name = element.dataset.stepper ?? "";
    try {
        const stepper = steppers[name];
        if (stepper === undefined) {
            throw new Error(`${name} nicht in config/stepper.ts gefunden`);
        }
        stepper(element);
    } catch (error) {
        console.error(`Step-through ${name}:`, error);
        element.replaceChildren(
            errorBox(
                `Step-through konnte nicht gestartet werden: ${messageOf(error).split("\n")[0]}`,
            ),
        );
    }
}

// Start every demo. Demos with shader files count as WebGL demos; those beyond the limit
// are not started.
let webglDemos = 0;
for (const box of document.querySelectorAll<HTMLElement>(".demo")) {
    if (Object.keys(sourcesOf(box.dataset.demo ?? "")).length > 0) {
        webglDemos += 1;
    }
    if (webglDemos <= maxWebglDemos) {
        mountDemo(box);
    }
}
if (webglDemos > maxWebglDemos) {
    document
        .querySelector("main header")
        ?.after(
            errorBox(
                `Diese Seite hat ${webglDemos} WebGL-Demos, erlaubt sind höchstens ${maxWebglDemos}.`,
            ),
        );
}

// A shader changed on disk: update its tab and recompile only the demo that uses it.
import.meta.hot?.on("playground:shader", (event: { path: string; source: string }) => {
    for (const demo of mounted) {
        if (event.path.startsWith(demo.path)) {
            const file = event.path.slice(demo.path.length);
            demo.sources[file] = event.source;
            if (demo.editor?.setSource(file, event.source) ?? true) {
                rebuild(demo);
            }
        }
    }
});
