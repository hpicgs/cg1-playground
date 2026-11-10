import GUI from "lil-gui";
import * as renderer from "./renderer";
import savedResolve from "../supersampling/resolve.frag?raw";

// The raster: W × H pixels. Pixel coordinates (x, y) run from (0, 0) at the top left to (W, H).
const W = 32;
const H = 18;

type Point = renderer.Point;

// The two lines, equally long and equally steep: the upper one is a thin rectangle of two
// triangles, the lower one is drawn by the fragment shader on the background.
const geometryLine: Point[] = [
    { x: 2, y: 3.5 },
    { x: 30, y: 8.5 },
];
const shaderLine: Point[] = [
    { x: 2, y: 9.5 },
    { x: 30, y: 14.5 },
];

// The width of both lines in pixels of the image they are drawn into, how far they are moved to
// the right, the samples per pixel that MSAA asks for and supersampling takes (4 for n = 2, 16 for
// n = 4) and whether they move by themselves.
const params = { lineWidth: 0.5, shift: 0, samples: 4, animate: false };
const offeredCounts = [4, 16];

// "Animieren" moves the lines to the right and back once per shiftPeriod seconds.
const shiftPeriod = 8;

// The samples the GPU really took for MSAA, shown read-only.
const readout = { msaa: "–" };

// The names above the views: the three methods on the raster, then in full resolution.
const rowNames = ["", "Volle Auflösung: "];
const methodNames = ["1 Sample", "MSAA", "Supersampling"];
const viewNames = rowNames.flatMap((row) => methodNames.map((method) => row + method));

// The last saved source of the student's resolve.frag, and whether it compiles.
let resolveSource = savedResolve;
let resolveCompiles = true;

// Colour of the pixel grid on top of the views on the raster.
const gridColor = [0.2, 0.22, 0.27];

// Sizes in CSS pixels: the margin around and between the views, the line with the names above
// them and the column on the right with the controls.
const padding = 16;
const labelHeight = 24;
const sideWidth = 236;

let canvas: HTMLCanvasElement | undefined;
let gui: GUI;
let labels: HTMLElement[] = [];

export function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): void {
    canvas = element;
    const gl = renderer.init(element, sources, W, H);

    gui = new GUI({ container: controls, title: "Multisampling", width: 220 });
    gui.add(params, "lineWidth", 0.1, 2, 0.05).name("Linienbreite");
    gui.add(params, "shift", 0, 1, 0.01).name("Verschiebung");
    // 16 only where the GPU offers it for MSAA.
    const supported = renderer.sampleCounts();
    const counts = offeredCounts.filter((count) => supported.includes(count));
    gui.add(params, "samples", counts).name("Samples pro Pixel");
    gui.add(params, "animate")
        .name("Animieren")
        .onChange((on: boolean) => {
            if (on) {
                requestAnimationFrame(animate);
            }
        });
    gui.add(readout, "msaa").name("MSAA-Samples").disable();
    gui.onChange(draw);

    labels = viewNames.map((name) => {
        const label = document.createElement("span");
        label.className = "panel-label";
        label.textContent = name;
        element.parentElement?.append(label);
        return label;
    });
    useResolve(resolveSource);

    // Keep the drawing buffer at the canvas's displayed size (in device pixels).
    function resize(): void {
        const dpr = window.devicePixelRatio || 1;
        const w = Math.floor(element.clientWidth * dpr);
        const h = Math.floor(element.clientHeight * dpr);
        if (element.width !== w || element.height !== h) {
            element.width = w;
            element.height = h;
            gl.viewport(0, 0, w, h);
            draw();
        }
    }
    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", resize);
    resize();
}

export function rebuild(sources: Record<string, string>): void {
    renderer.setShaders(sources);
    useResolve(resolveSource);
    draw();
}

// The saved resolve.frag of the demo "supersampling" changed on disk: compile it again.
import.meta.hot?.on("playground:shader", (event: { path: string; source: string }) => {
    if (canvas !== undefined && event.path.endsWith("/src/supersampling/resolve.frag")) {
        useResolve(event.source);
        draw();
    }
});

// Compiles the student's resolve.frag; the next draw names the views after the result.
function useResolve(source: string): void {
    resolveSource = source;
    resolveCompiles = renderer.setResolve(source);
}

// Adds to the names of the supersampling views that resolve.frag does not compile.
function useResolveName(): void {
    if (!resolveCompiles) {
        for (const k of [2, 5]) {
            labels[k].textContent = `${labels[k].textContent ?? ""} (resolve.frag fehlerhaft)`;
        }
    }
}

// One frame of "Animieren": moves the lines, then asks for the next frame.
function animate(time: number): void {
    if (!params.animate) {
        return;
    }
    const seconds = time / 1000;
    params.shift = Number((0.5 - 0.5 * Math.cos((2 * Math.PI * seconds) / shiftPeriod)).toFixed(2));
    draw();
    requestAnimationFrame(animate);
}

// The scene for one resolution: the background, the thin rectangle along geometryLine and the
// line from the shader along shaderLine, both width wide (in pixels of the raster) and moved by
// "Verschiebung".
function scene(width: number): renderer.Scene {
    const move = (p: Point): Point => ({ x: p.x + params.shift, y: p.y });
    const [a, b] = geometryLine.map(move);

    // Half the width across the line, at both ends.
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const across = {
        x: (-(b.y - a.y) / length) * (width / 2),
        y: ((b.x - a.x) / length) * (width / 2),
    };
    const corners = [
        { x: a.x + across.x, y: a.y + across.y },
        { x: b.x + across.x, y: b.y + across.y },
        { x: b.x - across.x, y: b.y - across.y },
        { x: a.x - across.x, y: a.y - across.y },
    ];
    const rectangle = [0, 1, 2, 0, 2, 3].flatMap((k) => [corners[k].x, corners[k].y]);
    // One triangle larger than the raster, so that no edge of the background crosses a line.
    const background = [-1, -1, 2 * W + 2, -1, -1, 2 * H + 2];

    const [start, end] = shaderLine.map(move);
    return {
        vertices: new Float32Array([...background, ...rectangle]),
        lineStart: start,
        lineEnd: end,
        lineWidth: width,
    };
}

// Where the six views go on the canvas, in device pixels: two rows of three left of the controls,
// as large as possible with square pixels of the raster of a whole number of device pixels.
function layout(element: HTMLCanvasElement): renderer.Rect[] {
    const dpr = window.devicePixelRatio || 1;
    const margin = Math.round(padding * dpr);
    const label = Math.round(labelHeight * dpr);
    const side = Math.round(sideWidth * dpr);
    const rows = rowNames.length;
    const cell = Math.max(
        1,
        Math.floor(
            Math.min(
                (element.width - side - 4 * margin) / (3 * W),
                (element.height - (rows + 1) * margin - rows * label) / (rows * H),
            ),
        ),
    );
    const width = cell * W;
    const height = cell * H;
    const first = Math.round((element.height - rows * (label + height) - (rows - 1) * margin) / 2);
    const rects: renderer.Rect[] = [];
    for (let row = 0; row < rows; row++) {
        const top = first + row * (label + height + margin) + label;
        for (let k = 0; k < 3; k++) {
            rects.push({ left: margin + k * (width + margin), top, width, height });
        }
    }
    return rects;
}

function draw(): void {
    if (canvas === undefined) {
        return;
    }
    const dpr = window.devicePixelRatio || 1;
    const rects = layout(canvas);
    const { width, height } = rects[0];

    // In full resolution a pixel of the raster is width / W device pixels, so the lines are
    // narrower in pixels of the raster there.
    const cell = width / W;
    const fragments = renderer.drawScenes(
        scene(params.lineWidth),
        scene(params.lineWidth / cell),
        params.samples,
        width,
        height,
    );
    renderer.showResults(rects);

    // On top: the grid of the pixels over the views on the raster, and the names above all views.
    const grid: number[] = [];
    for (let i = 0; i <= W; i++) {
        grid.push(i, 0, i, H);
    }
    for (let j = 0; j <= H; j++) {
        grid.push(0, j, W, j);
    }
    rects.forEach((rect, k) => {
        if (k < 3) {
            renderer.drawLines(rect, grid, gridColor);
        }
        labels[k].style.left = `${(rect.left + rect.width / 2) / dpr}px`;
        labels[k].style.top = `${(rect.top - (labelHeight * dpr) / 2) / dpr}px`;
    });

    // On the raster, the names say how often the fragment shader of the lines runs.
    viewNames.forEach((name, k) => {
        labels[k].textContent = k < 3 ? `${name}: ${fragments[k]} Aufrufe` : name;
    });
    useResolveName();

    readout.msaa = String(renderer.msaaSamples());
    for (const controller of gui.controllersRecursive()) {
        controller.updateDisplay();
    }
}
