import GUI from "lil-gui";
import * as renderer from "./renderer";

// The raster: W × H pixels. Pixel coordinates (x, y) run from (0, 0) at the top left to (W, H).
const W = 32;
const H = 18;

// A corner of the triangle: its position in pixel coordinates and its colour (r, g, b in [0, 1]).
type Corner = {
    x: number;
    y: number;
    color: [number, number, number];
};

type Point = { x: number; y: number };

const corners: Corner[] = [
    { x: 4, y: 3, color: [1, 0, 0] },
    { x: 27, y: 6, color: [0, 1, 0] },
    { x: 11, y: 16, color: [0, 0, 1] },
];

// Values for the pixel under the mouse, shown read-only.
const readout = {
    pixel: "–",
    barycentric: "–",
    bytes: "–",
};

// Colours of the lines and points drawn on top of the raster.
const gridColor = [0.24, 0.26, 0.31];
const centreColor = [0.45, 0.48, 0.55];
const outlineColor = [0.85, 0.86, 0.89];

// Sizes of the drawn points in CSS pixels: pixel centres, corners and the ring around a corner.
const centreSize = 3;
const cornerSize = 10;
const cornerRingSize = 14;

// How close to a corner, in pixels of the raster, a click grabs it, and how far a corner's name
// stands from the corner.
const grabRadius = 0.8;
const labelOffset = 1.3;

// Sizes in CSS pixels: the margin around the raster and the column on the right with the
// controls.
const padding = 16;
const sideWidth = 236;

let canvas: HTMLCanvasElement;
let gui: GUI;
let labels: HTMLElement[];
let mouse: Point | null = null;
let dragged: Corner | null = null;

export function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): void {
    canvas = element;
    const gl = renderer.init(canvas, sources, W, H);

    // The corners as a table: one row per corner with x, y and colour.
    gui = new GUI({ container: controls, title: "Dreieck", width: 220 });
    const table = gui.addFolder("Eckpunkte: x, y, Farbe");
    table.domElement.classList.add("cells", "cells-3");
    corners.forEach((corner, k) => {
        table.add(corner, "x").step(0.5).name(`v${"₀₁₂"[k]}`);
        table.add(corner, "y").step(0.5).name("");
        table.addColor(corner, "color").name("");
    });
    gui.add(readout, "pixel").name("Pixel (i, j)").disable();
    gui.add(readout, "barycentric").name("α, β, γ").disable();
    gui.add(readout, "bytes").name("Bytes (R, G, B)").disable();
    gui.onChange(draw);

    // The names of the corners, as text over the canvas.
    labels = corners.map((corner, k) => {
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
    canvas.addEventListener("pointerleave", () => {
        mouse = null;
        draw();
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

// Whether a point lies on the raster.
function isOnRaster(point: Point): boolean {
    return point.x >= 0 && point.x < W && point.y >= 0 && point.y < H;
}

// Dragging a corner with the mouse. Corners snap to multiples of 0.5 and stay on the raster.
function grab(event: PointerEvent): void {
    const point = pointAt(event);
    dragged = null;
    for (const corner of corners) {
        if (Math.hypot(corner.x - point.x, corner.y - point.y) < grabRadius) {
            dragged = corner;
        }
    }
    if (dragged !== null) {
        canvas.setPointerCapture(event.pointerId);
    }
}

function move(event: PointerEvent): void {
    mouse = pointAt(event);
    if (dragged !== null) {
        dragged.x = Math.min(Math.max(Math.round(mouse.x * 2) / 2, 0), W);
        dragged.y = Math.min(Math.max(Math.round(mouse.y * 2) / 2, 0), H);
        for (const controller of gui.controllersRecursive()) {
            controller.updateDisplay();
        }
    }
    draw();
}

function draw(): void {
    // The vertex array: x, y, r, g, b for each corner.
    const vertices = new Float32Array(
        corners.flatMap((corner) => [corner.x, corner.y, ...corner.color]),
    );

    // The GPU rasterizes the triangle into the raster, which is then shown enlarged.
    renderer.drawTriangle(vertices);
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

    const outline = corners.flatMap((corner) => [corner.x, corner.y]);
    renderer.drawShape(rect, "loop", outline, outlineColor);
    for (const corner of corners) {
        renderer.drawShape(
            rect,
            "points",
            [corner.x, corner.y],
            outlineColor,
            cornerRingSize * dpr,
        );
        renderer.drawShape(rect, "points", [corner.x, corner.y], corner.color, cornerSize * dpr);
    }

    placeLabels(rect);
    showReadout();
}

// Puts each corner's name next to it, on the side away from the triangle's centre.
function placeLabels(rect: renderer.Rect): void {
    const dpr = window.devicePixelRatio || 1;
    const centre = {
        x: (corners[0].x + corners[1].x + corners[2].x) / 3,
        y: (corners[0].y + corners[1].y + corners[2].y) / 3,
    };
    corners.forEach((corner, k) => {
        const length = Math.hypot(corner.x - centre.x, corner.y - centre.y) || 1;
        const x = corner.x + (labelOffset * (corner.x - centre.x)) / length;
        const y = corner.y + (labelOffset * (corner.y - centre.y)) / length;
        labels[k].style.left = `${(rect.left + (x / W) * rect.width) / dpr}px`;
        labels[k].style.top = `${(rect.top + (y / H) * rect.height) / dpr}px`;
    });
}

// Twice the signed area of the triangle a, b, c.
function doubleArea(a: Point, b: Point, c: Point): number {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

// The barycentric coordinates of q (Kapitel 3, Edge Function Testing: Baryzentrische
// Koordinaten): the partial areas A(v1, v2, q), A(v2, v0, q) and A(v0, v1, q), each divided by
// the area A(v0, v1, v2) of the whole triangle.
function barycentric(q: Point): [number, number, number] | null {
    const [v0, v1, v2] = corners;
    const area = doubleArea(v0, v1, v2);
    if (area === 0) {
        return null;
    }
    return [
        doubleArea(v1, v2, q) / area,
        doubleArea(v2, v0, q) / area,
        doubleArea(v0, v1, q) / area,
    ];
}

// The pixel under the mouse, the barycentric coordinates of its centre and its bytes.
function showReadout(): void {
    if (mouse === null || !isOnRaster(mouse)) {
        readout.pixel = "–";
        readout.barycentric = "–";
        readout.bytes = "–";
    } else {
        const i = Math.floor(mouse.x);
        const j = Math.floor(mouse.y);
        const weights = barycentric({ x: i + 0.5, y: j + 0.5 });
        readout.pixel = `(${i}, ${j})`;
        readout.barycentric =
            weights === null ? "–" : weights.map((w) => Number(w.toFixed(4))).join(", ");
        readout.bytes = renderer.readPixel(i, j).join(", ");
    }
    for (const controller of gui.controllersRecursive()) {
        controller.updateDisplay();
    }
}
