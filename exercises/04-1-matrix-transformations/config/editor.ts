import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import {
    bracketMatching,
    defaultHighlightStyle,
    HighlightStyle,
    indentOnInput,
    syntaxHighlighting,
} from "@codemirror/language";
import { EditorState, StateEffect, StateField, type Extension } from "@codemirror/state";
import {
    Decoration,
    type DecorationSet,
    EditorView,
    highlightActiveLine,
    keymap,
    lineNumbers,
} from "@codemirror/view";
import { glsl } from "codemirror-lang-glsl";
import colors from "./highlight.json";

/** Functions page.ts uses to talk to one demo's editor. */
export type Editor = {
    setSource: (file: string, source: string) => boolean;
    showLog: (message: string, failed: boolean) => void;
};

// CodeMirror's default colours, made readable on a dark background.
const darkColors: Record<string, string> = colors;
const highlightStyle = HighlightStyle.define(
    defaultHighlightStyle.specs.map((spec) => ({
        ...spec,
        color: typeof spec.color === "string" ? (darkColors[spec.color] ?? spec.color) : undefined,
    })),
);

// Editor look; the colours come from style.css.
const theme = EditorView.theme(
    {
        "&": { height: "100%", backgroundColor: "var(--surface)", color: "var(--text)" },
        ".cm-scroller": { fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" },
        ".cm-content": { caretColor: "var(--text)" },
        ".cm-gutters": { backgroundColor: "var(--surface)", color: "var(--muted)", border: "none" },
        ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#ffffff0a" },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
            backgroundColor: "#3a4252",
        },
        ".cm-error-line": { backgroundColor: "color-mix(in srgb, var(--error) 22%, transparent)" },
    },
    { dark: true },
);

// Marks the lines named in a compile error; cleared on the next edit.
const setErrorLines = StateEffect.define<number[]>();
const errorLines = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(lines, transaction) {
        for (const effect of transaction.effects) {
            if (effect.is(setErrorLines)) {
                const doc = transaction.state.doc;
                const ranges = effect.value
                    .filter((line) => line >= 1 && line <= doc.lines)
                    .map((line) =>
                        Decoration.line({ class: "cm-error-line" }).range(doc.line(line).from),
                    );
                return Decoration.set(ranges, true);
            }
        }
        return transaction.docChanged ? Decoration.none : lines;
    },
    provide: (field) => EditorView.decorations.from(field),
});

function languageOf(name: string): Extension {
    if (name === "glsl" || /\.(vert|frag)$/.test(name)) {
        return glsl();
    }
    if (["ts", "typescript", "js", "javascript"].includes(name)) {
        return javascript({ typescript: true });
    }
    return [];
}

/** Turns every `pre.listing` from markdown.ts into a read-only, highlighted CodeMirror view. */
export function showListings(): void {
    for (const pre of document.querySelectorAll<HTMLElement>("pre.listing")) {
        const view = new EditorView({
            doc: (pre.textContent ?? "").replace(/\n$/, ""),
            extensions: [
                theme,
                syntaxHighlighting(highlightStyle),
                EditorState.readOnly.of(true),
                EditorView.editable.of(false),
                languageOf(pre.dataset.language ?? ""),
            ],
        });
        view.dom.classList.add("listing");
        pre.replaceWith(view.dom);
    }
}

/**
 * Builds the shader editor of one demo: file tabs, Save and Run in the header, the console below.
 *
 * @remarks Saving goes through the plugin's endpoint and carries the text the editor loaded,
 *   so the server can refuse to overwrite a newer version from the IDE.
 * @param container - Element the editor is built into.
 * @param demo - Name of the demo folder in `src/`.
 * @param files - The shader files declared in `\demo{…}[…]`.
 * @param sources - Shader sources by file name, as loaded with the page.
 * @param run - Called by Run with the current sources of all tabs.
 * @returns The functions page.ts needs for events from the IDE and for the log.
 */
export function createEditor(
    container: HTMLElement,
    demo: string,
    files: string[],
    sources: Record<string, string>,
    run: (sources: Record<string, string>) => void,
): Editor {
    // Header with file tabs and buttons, the code, and the console below.
    const header = document.createElement("div");
    header.className = "editor-header";
    const tabs = document.createElement("div");
    tabs.className = "editor-tabs";
    const saveButton = document.createElement("button");
    saveButton.className = "editor-save";
    saveButton.textContent = "Save";
    const runButton = document.createElement("button");
    runButton.className = "editor-run";
    runButton.textContent = "Run";
    header.append(tabs, saveButton, runButton);
    const code = document.createElement("div");
    code.className = "editor-code";
    const log = document.createElement("pre");
    log.className = "editor-log";
    container.append(header, code, log);

    // A notice from the IDE stays above the compile result that follows it.
    let notice = "";
    function print(message: string, failed: boolean): void {
        log.textContent = notice === "" ? message : `${notice}\n${message}`;
        log.classList.toggle("failed", failed);
        notice = "";
    }

    // Per file: its view and the text last loaded or saved.
    const views: Record<string, EditorView> = {};
    const saved: Record<string, string> = {};

    for (const file of files) {
        const source = sources[file] ?? "";
        saved[file] = source.replaceAll("\r\n", "\n");
        // Each view sits in its own wrapper, which is hidden while another tab is open.
        const wrapper = document.createElement("div");
        wrapper.className = "editor-file";
        code.append(wrapper);
        views[file] = new EditorView({
            doc: source,
            parent: wrapper,
            extensions: [
                theme,
                lineNumbers(),
                highlightActiveLine(),
                history(),
                indentOnInput(),
                bracketMatching(),
                syntaxHighlighting(highlightStyle),
                keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
                languageOf(file),
                errorLines,
            ],
        });

        const tab = document.createElement("button");
        tab.textContent = file;
        tab.addEventListener("click", () => select(file));
        tabs.append(tab);
    }

    function select(file: string): void {
        files.forEach((name, index) => {
            code.children[index].toggleAttribute("hidden", name !== file);
            tabs.children[index].classList.toggle("active", name === file);
        });
    }
    if (files.length > 0) {
        select(files[0]);
    }

    function currentSources(): Record<string, string> {
        const result: Record<string, string> = {};
        for (const file of files) {
            result[file] = views[file].state.doc.toString();
        }
        return result;
    }

    // Saves every tab with changes. Returns false if one save was refused.
    async function saveAll(): Promise<boolean> {
        for (const file of files) {
            const source = views[file].state.doc.toString();
            if (source === saved[file]) {
                continue;
            }
            const response = await fetch("/__playground/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    page: location.pathname,
                    demo,
                    file,
                    source,
                    loaded: saved[file],
                }),
            });
            if (!response.ok) {
                const result = (await response.json()) as { error?: string };
                print(`${file}: ${result.error ?? "Speichern fehlgeschlagen"}`, true);
                return false;
            }
            saved[file] = source;
        }
        print("Gespeichert.", false);
        return true;
    }

    saveButton.addEventListener("click", () => void saveAll());
    runButton.addEventListener("click", () => {
        void saveAll().then((ok) => {
            if (ok) {
                run(currentSources());
            }
        });
    });

    return {
        // A change from the IDE always wins over unsaved edits in the browser. Returns whether
        // the demo has to recompile: not if the text is what the editor itself just saved.
        setSource(file, source) {
            const view = views[file];
            if (view === undefined) {
                return true;
            }
            const text = source.replaceAll("\r\n", "\n");
            if (text === saved[file]) {
                return false;
            }
            const hadEdits = view.state.doc.toString() !== saved[file];
            view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
            saved[file] = text;
            notice = hadEdits
                ? `${file} wurde in der IDE geändert und neu geladen; deine ungespeicherten Änderungen sind verworfen.`
                : `${file} wurde in der IDE geändert und neu geladen.`;
            return true;
        },

        // Shows the compile result and marks the error lines in the matching tab.
        showLog(message, failed) {
            print(message, failed);
            for (const file of files) {
                let lines: number[] = [];
                if (failed && message.includes(`${file}:`)) {
                    const matches = message.matchAll(/ERROR: \d+:(\d+):/g);
                    lines = [...matches].map((match) => Number(match[1]));
                }
                views[file].dispatch({ effects: setErrorLines.of(lines) });
            }
        },
    };
}
