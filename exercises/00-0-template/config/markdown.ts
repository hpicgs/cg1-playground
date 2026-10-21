// content.md to HTML: Markdown, KaTeX formulas and LaTeX-style elements.
import { join } from "node:path";
import katex from "katex";
import MarkdownIt from "markdown-it";
import boxes from "./boxes.json" with { type: "json" };

/** Box environments and their default titles. */
const boxTitles: Record<string, string> = boxes;

/** All environment names the parser knows; others stay text. */
const environments = ["task", "solution", "question", ...Object.keys(boxTitles)];

// An option of a self-test question: "- [x] right" or "- [ ] wrong".
const optionLine = /^- \[([ xX])\] (.*)$/;

// Code: fenced blocks and inline code.
const codeBlock = /^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm;
const inlineCode = /(`+)[^`\n][^\n]*?\1(?!`)/g;

// Formulas: $$…$$ and $…$, but not \$.
const blockFormula = /(?<!\\)\$\$([\s\S]+?)\$\$/g;
const inlineFormula = /(?<!\\)\$((?:\\.|[^$\\])+?)\$/g;

// \vscode{path:line}[title], with line and title optional.
const ideLink = /\\vscode\{([^}:]+)(?::(\d+))?\}(?:\[([^\]]*)\])?/g;

// Commands that stand alone on their line.
const beginLine = /^\\begin\{(\w+)\}(?:\[(.*)\])?\s*$/;
const endLine = /^\\end\{(\w+)\}\s*$/;
const demoLine = /^\\demo\{([\w-]+)\}(?:\[(.*)\])?\s*$/;
const stepperLine = /^\\stepper\{([\w-]+)\}\s*$/;

// Placeholders look like \uE000code3\uE001 or \uE000html7\uE001. The two private-use
// characters never appear in normal text, and markdown-it leaves them alone.
const anyPlaceholder = /\uE000\w+?\d+\uE001/g;
const codePlaceholder = /\uE000code(\d+)\uE001/g;
const htmlPlaceholder = /\uE000html(\d+)\uE001/g;
const htmlParagraph = /<p>(\uE000html\d+\uE001)<\/p>/g;

/** A block of the page: Markdown text, an environment with its content, or finished HTML. */
type Node =
    | { kind: "text"; lines: string[] }
    | { kind: "environment"; name: string; argument: string | undefined; children: Node[] }
    | { kind: "html"; html: string };

/**
 * Renders `content.md` to HTML.
 *
 * @remarks Order: code is set aside, formulas and IDE links become placeholders, environments
 *   are parsed line by line, markdown-it renders the text, placeholders are restored.
 * @param source - The content of `content.md`.
 * @param macros - KaTeX macros from `config/macros.json`.
 * @param folder - Absolute exercise folder, used for IDE links.
 * @returns The page body as HTML.
 */
export function renderContent(
    source: string,
    macros: Record<string, string>,
    folder: string,
): string {
    // Code is put back before markdown-it runs, finished HTML after it.
    const code: string[] = [];
    const html: string[] = [];
    // Line breaks each placeholder hides, so error messages can name the right line.
    const hiddenLines = new Map<string, number>();

    function placeholder(kind: "code" | "html", index: number, original: string): string {
        const key = `\uE000${kind}${index}\uE001`;
        hiddenLines.set(key, original.split("\n").length - 1);
        return key;
    }
    function hideCode(text: string): string {
        code.push(text);
        return placeholder("code", code.length - 1, text);
    }
    function hideHtml(result: string, original: string): string {
        html.push(result);
        return placeholder("html", html.length - 1, original);
    }
    function formula(tex: string, displayMode: boolean): string {
        const result = katex.renderToString(tex, {
            displayMode,
            macros: { ...macros },
            throwOnError: false,
        });
        return hideHtml(result, tex);
    }

    // 1. Set aside code, so nothing inside it is parsed.
    let text = source.replaceAll("\r\n", "\n");
    text = text.replace(codeBlock, hideCode);
    text = text.replace(inlineCode, hideCode);

    // 2. Render formulas first, so markdown-it does not read `_` or `*` in them as emphasis.
    text = text.replace(blockFormula, (_, tex: string) => formula(tex, true));
    text = text.replace(inlineFormula, (_, tex: string) => formula(tex, false));

    // 3. IDE links.
    text = text.replace(
        ideLink,
        (_, path: string, line: string | undefined, title: string | undefined) =>
            hideHtml(ideLinkHtml(folder, path, line, title), ""),
    );

    // 4. Environments, demos and step-throughs.
    const tree = parseLines(text.split("\n"), hiddenLines);

    // 5. Render the tree with markdown-it and put the placeholders back.
    const md = createMarkdown();
    let taskNumber = 0;
    let questionNumber = 0;

    function restoreCode(markdown: string): string {
        return markdown.replace(codePlaceholder, (_, index: string) => code[Number(index)]);
    }
    function restoreHtml(result: string): string {
        return result.replace(htmlPlaceholder, (_, index: string) => html[Number(index)]);
    }

    function renderTitle(title: string): string {
        return restoreHtml(md.renderInline(restoreCode(title)));
    }

    function renderText(lines: string[]): string {
        let result = md.render(restoreCode(lines.join("\n")));
        // A formula alone in a paragraph is a block formula and needs no paragraph.
        result = result.replace(htmlParagraph, "$1");
        result = restoreHtml(result);
        // An image alone in a paragraph is a figure; its alt text becomes the caption.
        result = result.replace(
            /<p><img src="([^"]*)" alt="([^"]*)"( title="[^"]*")?><\/p>/g,
            (_: string, src: string, alt: string) =>
                `<figure><img src="${src}" alt="${alt}"><figcaption>${alt}</figcaption></figure>`,
        );
        return result;
    }

    // A self-test question: its text, then one checkbox per option line. Whether an option is
    // right is kept in data-correct for page.ts.
    function renderQuestion(children: Node[], number: number): string {
        const lines = children.flatMap((child) => (child.kind === "text" ? child.lines : []));
        const text = lines.filter((line) => !optionLine.test(line));
        let options = "";
        for (const line of lines) {
            const option = optionLine.exec(line);
            if (option) {
                const correct = option[1] !== " ";
                options += `<label class="option"><input type="checkbox" data-correct="${correct}"> ${renderTitle(option[2])}</label>\n`;
            }
        }
        if (options === "") {
            return errorBox(`question ${number} has no options (- [x] or - [ ])`);
        }
        let result = `<fieldset class="question">\n`;
        result += `<legend>Frage ${number}</legend>\n`;
        result += renderText(text);
        result += options;
        result += `</fieldset>\n`;
        return result;
    }

    function renderNodes(nodes: Node[]): string {
        let result = "";
        for (const node of nodes) {
            if (node.kind === "text") {
                result += renderText(node.lines);
            } else if (node.kind === "html") {
                result += `${node.html}\n`;
            } else if (node.name === "task") {
                taskNumber += 1;
                let title = `Aufgabe ${taskNumber}`;
                if (node.argument) {
                    title += `: ${renderTitle(node.argument)}`;
                }
                result += `<section class="task">\n`;
                result += `<h3 class="task-title">${title}</h3>\n`;
                result += renderNodes(node.children);
                result += `</section>\n`;
            } else if (node.name === "quiz") {
                questionNumber = 0;
                result += `<aside class="box quiz">\n`;
                result += `<p class="box-title">${renderTitle(node.argument ?? boxTitles.quiz)}</p>\n`;
                result += renderNodes(node.children);
                result += `<p class="quiz-result"><button type="button">Auswerten</button> <span></span></p>\n`;
                result += `</aside>\n`;
            } else if (node.name === "question") {
                questionNumber += 1;
                result += renderQuestion(node.children, questionNumber);
            } else if (node.name === "solution") {
                result += `<details class="solution">\n`;
                result += `<summary>Mögliche Lösung anzeigen</summary>\n`;
                result += renderNodes(node.children);
                result += `</details>\n`;
            } else {
                const title = renderTitle(node.argument ?? boxTitles[node.name]);
                result += `<aside class="box ${node.name}">\n`;
                result += `<p class="box-title">${title}</p>\n`;
                result += renderNodes(node.children);
                result += `</aside>\n`;
            }
        }
        return result;
    }

    return renderNodes(tree);
}

/**
 * Builds the tree of environments from the lines of `content.md`.
 *
 * @remarks A `\begin` or `\end` counts only at the start of a line and only for a known name.
 *   A stack of open environments handles nesting. Errors become red boxes on the page.
 * @param lines - The text, with code and formulas already replaced by placeholders.
 * @param hiddenLines - Line breaks hidden in each placeholder, to count lines correctly.
 * @returns The top-level nodes.
 */
function parseLines(lines: string[], hiddenLines: Map<string, number>): Node[] {
    const root: Node[] = [];
    const open: { name: string; children: Node[]; line: number }[] = [];

    // New content goes into the innermost open environment, or else the top level.
    function current(): Node[] {
        return open.length > 0 ? open[open.length - 1].children : root;
    }

    function addText(line: string): void {
        const nodes = current();
        const last = nodes[nodes.length - 1];
        if (last?.kind === "text") {
            last.lines.push(line);
        } else {
            nodes.push({ kind: "text", lines: [line] });
        }
    }

    function addHtml(html: string): void {
        current().push({ kind: "html", html });
    }

    function addError(message: string): void {
        addHtml(errorBox(message));
    }

    let lineNumber = 0;
    for (const line of lines) {
        lineNumber += 1;
        const begin = beginLine.exec(line);
        const end = endLine.exec(line);
        const demo = demoLine.exec(line);
        const stepper = stepperLine.exec(line);

        if (begin && environments.includes(begin[1])) {
            const children: Node[] = [];
            current().push({ kind: "environment", name: begin[1], argument: begin[2], children });
            open.push({ name: begin[1], children, line: lineNumber });
        } else if (end && environments.includes(end[1])) {
            if (open[open.length - 1]?.name === end[1]) {
                open.pop();
            } else {
                addError(`line ${lineNumber}: \\end{${end[1]}} has no matching \\begin{${end[1]}}`);
            }
        } else if (demo) {
            const name = escapeHtml(demo[1]);
            const files = (demo[2] ?? "")
                .split(",")
                .map((file) => file.trim())
                .filter((file) => file !== "");
            addHtml(
                `<div class="demo" data-demo="${name}" data-files="${escapeHtml(files.join(","))}"></div>`,
            );
        } else if (stepper) {
            addHtml(`<div class="stepper" data-stepper="${escapeHtml(stepper[1])}"></div>`);
        } else {
            addText(line);
        }

        for (const key of line.match(anyPlaceholder) ?? []) {
            lineNumber += hiddenLines.get(key) ?? 0;
        }
    }

    // Environments still open at the end were never closed.
    for (const environment of open) {
        const message = `line ${environment.line}: \\begin{${environment.name}} is never closed`;
        root.push({ kind: "html", html: errorBox(message) });
    }
    return root;
}

/** markdown-it with heading anchors, links in a new tab and code listings for `editor.ts`. */
function createMarkdown() {
    const md = new MarkdownIt({ html: false });
    const usedIds = new Set<string>();

    // Every heading gets a unique id and an anchor link.
    md.renderer.rules.heading_open = (tokens, index) => {
        const tag = tokens[index].tag;
        const base = slugOf(tokens[index + 1]?.content ?? "");
        let id = base;
        for (let n = 2; usedIds.has(id); n++) {
            id = `${base}-${n}`;
        }
        usedIds.add(id);
        return `<${tag} id="${id}"><a class="anchor" href="#${id}">#</a> `;
    };

    // Links open in a new tab; links to headings on the same page stay in place.
    md.renderer.rules.link_open = (tokens, index, options, _env, self) => {
        const token = tokens[index];
        if (!String(token.attrGet("href")).startsWith("#")) {
            token.attrSet("target", "_blank");
            token.attrSet("rel", "noopener");
        }
        return self.renderToken(tokens, index, options);
    };

    // Code blocks become listings that editor.ts turns into read-only editors.
    md.renderer.rules.fence = (tokens, index) => {
        const token = tokens[index];
        const language = escapeHtml(token.info.trim().split(/\s+/)[0] ?? "");
        return `<pre class="listing" data-language="${language}"><code>${escapeHtml(token.content)}</code></pre>\n`;
    };

    return md;
}

// Two overlapping squares, the usual copy symbol.
const copyIcon =
    '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor">' +
    '<rect x="5.5" y="5.5" width="9" height="9" rx="1.5"/>' +
    '<path d="M10.5 3V2.5a1 1 0 0 0-1-1h-7a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1H3"/></svg>';

/**
 * Link that opens a file of the exercise in VS Code, followed by a button that copies the
 * file's full path for other IDEs.
 */
function ideLinkHtml(
    folder: string,
    path: string,
    line: string | undefined,
    title: string | undefined,
): string {
    const file = join(folder, path);
    const absolute = file.replaceAll("\\", "/");
    const position = line === undefined ? "" : `:${line}`;
    // Windows paths like C:/… need a slash after vscode://file.
    const href = `vscode://file${absolute.startsWith("/") ? "" : "/"}${absolute}${position}`;
    const label = `<code>${escapeHtml(path)}${position}</code>`;
    const text = title ? `${escapeHtml(title)} (${label})` : label;
    const link = `<a class="ide-link" href="${escapeHtml(href)}">${text}</a>`;
    const copy = `<button type="button" class="copy-path" data-path="${escapeHtml(file)}" title="Pfad kopieren" aria-label="Pfad kopieren">${copyIcon}</button>`;
    return link + copy;
}

/** Heading id: lower case, umlauts spelled out, everything else joined with dashes. */
function slugOf(title: string): string {
    const slug = title
        .toLowerCase()
        .replace(anyPlaceholder, "")
        .replaceAll("ä", "ae")
        .replaceAll("ö", "oe")
        .replaceAll("ü", "ue")
        .replaceAll("ß", "ss")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return slug || "abschnitt";
}

/** Red box on the page for a mistake in content.md; also logged in the server's terminal. */
function errorBox(message: string): string {
    console.warn(`content.md: ${message}`);
    return `<div class="parse-error">content.md: ${escapeHtml(message)}</div>`;
}

function escapeHtml(text: string): string {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
