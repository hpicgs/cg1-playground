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

// The current corners, the chosen triangle and how far the triangle is moved to the right.
const corners: Point[] = shapes.Groß.map((corner) => ({ ...corner }));
const params = { shape: "Groß", shift: 0 };

// Values shown read-only.
const readout = { setPixels: "–", area: "–" };

// Colours of the lines and points drawn on top of the raster.
const gridColor = [0.24, 0.26, 0.31];
const centreColor = [0.45, 0.48, 0.55];
const outlineColor = [0.95, 0.55, 0.25];

// Sizes of the drawn points in CSS pixels: pixel centres and corners.
const centreSize = 3;
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
let dragged: Point | null = null;

export function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): void {
    canvas = element;
    const gl = renderer.init(canvas, sources, W, H);

    gui = new GUI({ container: controls, title: "Aliasing", width: 220 });
    gui.add(params, "shape", Object.keys(shapes))
        .name("Dreieck")
        .onChange((name: string) => {
            shapes[name].forEach((corner, k) => Object.assign(corners[k], corner));
            draw();
        });
    gui.add(params, "shift", 0, 1, 0.01).name("Verschiebung");

    // The corners as a table: one row per corner with x and y.
    const table = gui.addFolder("Eckpunkte: x, y");
    table.domElement.classList.add("cells", "cells-2");
    corners.forEach((corner, k) => {
        table.add(corner, "x").step(cornerStep).name(`v${"₀₁₂"[k]}`);
        table.add(corner, "y").step(cornerStep).name("");
    });
    gui.add(readout, "setPixels").name("Gesetzte Pixel").disable();
    gui.add(readout, "area").name("Fläche").disable();
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

// Where the raster goes on the canvas, in device pixels: as large as possible left of the
// controls, with square pixels.
function layout(): renderer.Rect {
    const dpr = window.devicePixelRatio || 1;
    const margin = Math.round(padding * dpr);
    const side = Math.round(sideWidth * dpr);
    const cell = Math.min((canvas.width - side - 2 * margin) / W, (canvas.height - 2 * margin) / H);
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

function move(event: PointerEvent): void {
    if (dragged === null) {
        return;
    }
    const point = pointAt(event);
    dragged.x = snap(point.x - params.shift, W);
    dragged.y = snap(point.y, H);
    draw();
}

// Twice the signed area of the triangle a, b, c: (b − a) × (c − a).
function doubleArea(a: Point, b: Point, c: Point): number {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function draw(): void {
    // The GPU rasterizes the triangle into the raster, which is then shown enlarged.
    const shifted = shiftedCorners();
    renderer.drawTriangle(new Float32Array(shifted.flatMap((corner) => [corner.x, corner.y])));
    const rect = layout();
    renderer.showRaster(rect);

    // On top: grid lines, pixel centres, the exact outline and the corners.
    const dpr = window.devicePixelRatio || 1;
    const grid: number[] = [];
    for (let i = 0; i <= W; i++) {
        grid.push(i, 0, i, H);
    }
    for (let j = 0; j <= H; j++) {
        grid.push(0, j, W, j);
    }
    renderer.drawShape(rect, "lines", grid, gridColor);

    const centres: number[] = [];
    for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
            centres.push(i + 0.5, j + 0.5);
        }
    }
    renderer.drawShape(rect, "points", centres, centreColor, centreSize * dpr);

    const outline = shifted.flatMap((corner) => [corner.x, corner.y]);
    renderer.drawShape(rect, "loop", outline, outlineColor);
    renderer.drawShape(rect, "points", outline, outlineColor, cornerSize * dpr);
    placeLabels(rect, shifted);

    // The read-only values: the pixels the GPU has set and the area A(v0, v1, v2).
    readout.setPixels = String(renderer.countSetPixels());
    readout.area = Math.abs(doubleArea(shifted[0], shifted[1], shifted[2]) / 2).toFixed(2);
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
