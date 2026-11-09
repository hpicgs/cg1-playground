import GUI from "lil-gui";
import * as renderer from "./renderer";

// The raster: W × H pixels. Pixel coordinates (x, y) run from (0, 0) at the top left to (W, H).
const W = 32;
const H = 18;

type Point = { x: number; y: number };

// The corners of the two triangles that the dropdown "Dreieck" offers.
const shapes: Record<string, Point[]> = {
    Groß: [
        { x: 3.3, y: 2.6 },
        { x: 28.6, y: 7.2 },
        { x: 11.2, y: 15.7 },
    ],
    Schmal: [
        { x: 2, y: 3 },
        { x: 30, y: 13.75 },
        { x: 30, y: 14.25 },
    ],
};

// The current corners, the chosen triangle, how far the triangle is moved to the right, the
// number n of samples per pixel along each axis and what the canvas shows.
const corners: Point[] = shapes.Groß.map((corner) => ({ ...corner }));
const params = { shape: "Groß", shift: 0, n: 4, view: "Samples" };
const sampleCounts = [1, 2, 4, 8, 16];
const views = ["Samples", "Ergebnis"];

// Values for the pixel the mouse was over last, shown read-only.
const readout = { pixel: "–", covered: "–", bytes: "–" };

// Colours of the lines and points drawn on top of the raster.
// The grid is bright over the samples and dark over the result, where thin parts are dark gray.
const sampleGridColor = [0.45, 0.6, 0.9];
const resultGridColor = [0.2, 0.22, 0.27];
const outlineColor = [0.95, 0.55, 0.25];
const dimOutlineColor = [0.6, 0.35, 0.15];
const hoverColor = [1, 0.3, 0.85];

// Samples are drawn as dots while they are at least minDotSpacing device pixels apart. Size of
// the corners in CSS pixels.
const minDotSpacing = 3;
const cornerSize = 10;

// Corners move in steps of this size; a click closer than grabRadius (in pixels of the raster)
// grabs a corner, and a corner's name stands labelOffset away from it.
const cornerStep = 0.1;
const grabRadius = 0.8;
const labelOffset = 1.3;

// Sizes in CSS pixels: the margin around the raster and the column on the right with the
// controls.
const padding = 16;
const sideWidth = 236;

let canvas: HTMLCanvasElement;
let gui: GUI;
let labels: HTMLElement[];
// The last mouse position on the raster.
let mouse: Point | null = null;
let dragged: Point | null = null;

export function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): void {
    canvas = element;
    const gl = renderer.init(canvas, sources, W, H);

    gui = new GUI({ container: controls, title: "Supersampling", width: 220 });
    gui.add(params, "n", sampleCounts).name("n");
    gui.add(params, "view", views).name("Anzeige");
    gui.add(params, "shape", Object.keys(shapes))
        .name("Dreieck")
        .onChange((name: string) => {
            shapes[name].forEach((corner, k) => Object.assign(corners[k], corner));
            draw();
        });
    gui.add(params, "shift", 0, 1, 0.01).name("Verschiebung");

    // The corners as a table: one row per corner with x and y.
    const table = gui.addFolder("Ecken: x, y");
    table.domElement.classList.add("cells", "cells-2");
    corners.forEach((corner, k) => {
        table.add(corner, "x").step(cornerStep).name(`v${"₀₁₂"[k]}`);
        table.add(corner, "y").step(cornerStep).name("");
    });
    gui.add(readout, "pixel").name("Pixel (i, j)").disable();
    gui.add(readout, "covered").name("Samples im Dreieck").disable();
    gui.add(readout, "bytes").name("Bytes (R, G, B)").disable();
    gui.onChange(draw);

    // The names of the corners, as text over the canvas.
    labels = corners.map((_, k) => {
        const label = document.createElement("span");
        label.className = "corner-label";
        label.textContent = `v${"₀₁₂"[k]}`;
        canvas.parentElement?.append(label);
        return label;
    });

    canvas.addEventListener("pointerdown", grab);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", () => {
        dragged = null;
    });

    // Keep the drawing buffer at the canvas's displayed size (in device pixels).
    function resize(): void {
        const dpr = window.devicePixelRatio || 1;
        const w = Math.floor(canvas.clientWidth * dpr);
        const h = Math.floor(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
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
    draw();
}

// The device pixels per sample when the view "Samples" shows dots, a whole number so that the
// dots are sharp, or 0 without dots. cell is the size of a pixel in device pixels.
function dotSpacing(cell: number): number {
    const spacing = Math.floor(cell / params.n);
    return params.view === "Samples" && spacing >= minDotSpacing ? spacing : 0;
}

// Where the raster goes on the canvas, in device pixels: as large as possible left of the
// controls, with square pixels. With dots, a pixel is a whole number of dots.
function layout(): renderer.Rect {
    const dpr = window.devicePixelRatio || 1;
    const margin = Math.round(padding * dpr);
    const side = Math.round(sideWidth * dpr);
    let cell = Math.min((canvas.width - side - 2 * margin) / W, (canvas.height - 2 * margin) / H);
    if (dotSpacing(cell) > 0) {
        cell = dotSpacing(cell) * params.n;
    }
    const width = Math.round(cell * W);
    const height = Math.round(cell * H);
    return {
        left: margin,
        top: Math.round((canvas.height - height) / 2),
        width,
        height,
    };
}

// The mouse position in pixel coordinates of the raster.
function pointAt(event: PointerEvent): Point {
    const dpr = window.devicePixelRatio || 1;
    const rect = layout();
    return {
        x: ((event.offsetX * dpr - rect.left) / rect.width) * W,
        y: ((event.offsetY * dpr - rect.top) / rect.height) * H,
    };
}

// The corners as drawn: moved to the right by "Verschiebung".
function shiftedCorners(): Point[] {
    return corners.map((corner) => ({ x: corner.x + params.shift, y: corner.y }));
}

// Rounds a coordinate to the step of the corners and keeps it between 0 and max.
function snap(value: number, max: number): number {
    const rounded = Math.round(value / cornerStep) * cornerStep;
    return Number(Math.min(Math.max(rounded, 0), max).toFixed(1));
}

// Dragging a corner with the mouse.
function grab(event: PointerEvent): void {
    const point = pointAt(event);
    dragged = null;
    shiftedCorners().forEach((corner, k) => {
        if (Math.hypot(corner.x - point.x, corner.y - point.y) < grabRadius) {
            dragged = corners[k];
        }
    });
    if (dragged !== null) {
        canvas.setPointerCapture(event.pointerId);
    }
}

// Remembers the last position on the raster, so the readout stays while the controls are used.
function move(event: PointerEvent): void {
    const point = pointAt(event);
    if (isOnRaster(point)) {
        mouse = point;
    }
    if (dragged !== null) {
        dragged.x = snap(point.x - params.shift, W);
        dragged.y = snap(point.y, H);
    }
    draw();
}

// Whether a point lies on the raster.
function isOnRaster(point: Point): boolean {
    return point.x >= 0 && point.x < W && point.y >= 0 && point.y < H;
}

function draw(): void {
    // The GPU rasterizes the triangle with n × n samples per pixel, and resolve.frag writes the
    // raster. Either the samples or the raster are then shown enlarged.
    const n = params.n;
    const shifted = shiftedCorners();
    renderer.drawTriangle(new Float32Array(shifted.flatMap((corner) => [corner.x, corner.y])), n);
    const rect = layout();
    const dpr = window.devicePixelRatio || 1;
    if (params.view === "Samples") {
        renderer.showSamples(rect, dotSpacing(rect.width / W) > 0);
    } else {
        renderer.showResult(rect);
    }

    // On top: the grid of the pixels, the pixel the mouse was over last, the corners and, over
    // the samples, the exact outline.
    const grid: number[] = [];
    for (let i = 0; i <= W; i++) {
        grid.push(i, 0, i, H);
    }
    for (let j = 0; j <= H; j++) {
        grid.push(0, j, W, j);
    }
    const samplesShown = params.view === "Samples";
    renderer.drawShape(rect, "lines", grid, samplesShown ? sampleGridColor : resultGridColor);

    if (mouse !== null && isOnRaster(mouse)) {
        const i = Math.floor(mouse.x);
        const j = Math.floor(mouse.y);
        renderer.drawShape(rect, "loop", [i, j, i + 1, j, i + 1, j + 1, i, j + 1], hoverColor);
    }

    const outline = shifted.flatMap((corner) => [corner.x, corner.y]);
    if (samplesShown) {
        renderer.drawShape(rect, "loop", outline, dimOutlineColor);
    }
    renderer.drawShape(rect, "points", outline, outlineColor, cornerSize * dpr);
    placeLabels(rect, shifted);
    showReadout();
}

// The pixel the mouse was over last, how many of its samples lie in the triangle and its bytes
// in the raster.
function showReadout(): void {
    if (mouse === null || !isOnRaster(mouse)) {
        readout.pixel = "–";
        readout.covered = "–";
        readout.bytes = "–";
    } else {
        const i = Math.floor(mouse.x);
        const j = Math.floor(mouse.y);
        readout.pixel = `(${i}, ${j})`;
        readout.covered = `${renderer.countSamples(i, j)} von ${params.n * params.n}`;
        readout.bytes = renderer.readPixel(i, j).join(", ");
    }
    for (const controller of gui.controllersRecursive()) {
        controller.updateDisplay();
    }
}

// Puts each corner's name next to it, on the side away from the triangle's centre.
function placeLabels(rect: renderer.Rect, shifted: Point[]): void {
    const dpr = window.devicePixelRatio || 1;
    const centre = {
        x: (shifted[0].x + shifted[1].x + shifted[2].x) / 3,
        y: (shifted[0].y + shifted[1].y + shifted[2].y) / 3,
    };
    shifted.forEach((corner, k) => {
        const length = Math.hypot(corner.x - centre.x, corner.y - centre.y) || 1;
        const x = corner.x + (labelOffset * (corner.x - centre.x)) / length;
        const y = corner.y + (labelOffset * (corner.y - centre.y)) / length;
        labels[k].style.left = `${(rect.left + (x / W) * rect.width) / dpr}px`;
        labels[k].style.top = `${(rect.top + (y / H) * rect.height) / dpr}px`;
    });
}
