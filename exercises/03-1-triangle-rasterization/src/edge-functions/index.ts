import GUI from "lil-gui";
import * as renderer from "./renderer";

// The raster: W × H pixels. Pixel coordinates (x, y) run from (0, 0) at the top left to (W, H).
const W = 32;
const H = 18;

type Point = { x: number; y: number };

// The corners v0, v1, v2 and the point p, in pixel coordinates.
const corners: Point[] = [
    { x: 6, y: 3 },
    { x: 25, y: 5 },
    { x: 12, y: 15 },
];
const p: Point = { x: 16.5, y: 8.5 };

// The edge whose half-spaces are shown: 0 none, 1 v0 → v1, 2 v1 → v2, 3 v2 → v0.
const params = { edge: 0 };
const edgeOptions = { keine: 0, "v₀ → v₁": 1, "v₁ → v₂": 2, "v₂ → v₀": 3 };

// Values at p, shown read-only.
const readout = {
    p: "–",
    e01: "–",
    e12: "–",
    e20: "–",
    area: "–",
    alpha: "–",
    beta: "–",
    gamma: "–",
};

// Colours: the raster, the grid, the positive and the negative half-space, the triangle and p.
const rasterColor = [0.13, 0.14, 0.17];
const gridColor = [0.24, 0.26, 0.31];
const positiveColor = [0.16, 0.38, 0.26];
const negativeColor = [0.42, 0.16, 0.19];
const triangleColor = [0.85, 0.86, 0.89];
const pointColor = [0.95, 0.78, 0.3];

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

    // The corners as a table: one row per corner with x and y.
    gui = new GUI({ container: controls, title: "Edge Functions", width: 220 });
    const table = gui.addFolder("Ecken: x, y");
    table.domElement.classList.add("cells", "cells-2");
    corners.forEach((corner, k) => {
        table.add(corner, "x").step(0.5).name(`v${k}`);
        table.add(corner, "y").step(0.5).name("");
    });
    gui.add(params, "edge", edgeOptions).name("Kante");
    gui.add(readout, "p").name("p").disable();
    gui.add(readout, "e01").name("E⁰¹(p)").disable();
    gui.add(readout, "e12").name("E¹²(p)").disable();
    gui.add(readout, "e20").name("E²⁰(p)").disable();
    gui.add(readout, "area").name("A").disable();
    gui.add(readout, "alpha").name("α").disable();
    gui.add(readout, "beta").name("β").disable();
    gui.add(readout, "gamma").name("γ").disable();
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

// The edge function of the directed edge from a to b, at the point q (Kapitel 3, Edge
// Function Testing).
function edgeFunction(a: Point, b: Point, q: Point): number {
    return (a.y - b.y) * q.x + (b.x - a.x) * q.y + (a.x * b.y - b.x * a.y);
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

// Dragging a corner, or p. Corners snap to multiples of 0.5, p snaps to pixel centres. A click
// away from the corners moves p there.
function grab(event: PointerEvent): void {
    const point = pointAt(event);
    dragged = p;
    for (const corner of corners) {
        if (Math.hypot(corner.x - point.x, corner.y - point.y) < 0.8) {
            dragged = corner;
        }
    }
    canvas.setPointerCapture(event.pointerId);
    move(event);
}

function move(event: PointerEvent): void {
    if (dragged === null) {
        return;
    }
    const point = pointAt(event);
    if (dragged === p) {
        p.x = Math.min(Math.max(Math.floor(point.x), 0), W - 1) + 0.5;
        p.y = Math.min(Math.max(Math.floor(point.y), 0), H - 1) + 0.5;
    } else {
        dragged.x = Math.min(Math.max(Math.round(point.x * 2) / 2, 0), W);
        dragged.y = Math.min(Math.max(Math.round(point.y * 2) / 2, 0), H);
    }
    draw();
}

// The two half-spaces of the edge from a to b as large quads, one on each side of the edge's
// line. They reach far beyond the raster; the viewport cuts them off.
function halfSpaces(a: Point, b: Point): { positive: number[]; negative: number[] } {
    const far = 4 * (W + H);
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const dx = (b.x - a.x) / length;
    const dy = (b.y - a.y) / length;

    // The coefficients of x and y in the edge function point into the positive half-space.
    const nx = (a.y - b.y) / length;
    const ny = (b.x - a.x) / length;

    // Two points on the line, far before a and far after b.
    const start = { x: a.x - far * dx, y: a.y - far * dy };
    const end = { x: b.x + far * dx, y: b.y + far * dy };
    const quad = (side: number): number[] => {
        const ox = side * far * nx;
        const oy = side * far * ny;
        return [
            start.x,
            start.y,
            end.x,
            end.y,
            end.x + ox,
            end.y + oy,
            start.x,
            start.y,
            end.x + ox,
            end.y + oy,
            start.x + ox,
            start.y + oy,
        ];
    };
    return { positive: quad(1), negative: quad(-1) };
}

// An arrowhead in the middle of the edge from a to b, pointing towards b.
function arrowhead(a: Point, b: Point): number[] {
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const dx = (b.x - a.x) / length;
    const dy = (b.y - a.y) / length;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    return [
        mx + 0.5 * dx,
        my + 0.5 * dy,
        mx - 0.4 * dx - 0.35 * dy,
        my - 0.4 * dy + 0.35 * dx,
        mx - 0.4 * dx + 0.35 * dy,
        my - 0.4 * dy - 0.35 * dx,
    ];
}

function draw(): void {
    const rect = layout();
    const dpr = window.devicePixelRatio || 1;
    renderer.clear();

    // The raster and, for the chosen edge, its positive and negative half-space.
    renderer.drawShape(rect, "triangles", [0, 0, W, 0, W, H, 0, 0, W, H, 0, H], rasterColor);
    if (params.edge > 0) {
        const a = corners[params.edge - 1];
        const b = corners[params.edge % 3];
        const spaces = halfSpaces(a, b);
        renderer.drawShape(rect, "triangles", spaces.positive, positiveColor);
        renderer.drawShape(rect, "triangles", spaces.negative, negativeColor);
    }

    // Grid lines.
    const grid: number[] = [];
    for (let i = 0; i <= W; i++) {
        grid.push(i, 0, i, H);
    }
    for (let j = 0; j <= H; j++) {
        grid.push(0, j, W, j);
    }
    renderer.drawShape(rect, "lines", grid, gridColor);

    // Pixel centres, where p can be placed.
    const centres: number[] = [];
    for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
            centres.push(i + 0.5, j + 0.5);
        }
    }
    renderer.drawShape(rect, "points", centres, gridColor, 3 * dpr);

    // The triangle with an arrow on each directed edge, its corners and p.
    const outline = corners.flatMap((corner) => [corner.x, corner.y]);
    renderer.drawShape(rect, "loop", outline, triangleColor);
    for (let k = 0; k < 3; k++) {
        const arrow = arrowhead(corners[k], corners[(k + 1) % 3]);
        renderer.drawShape(rect, "triangles", arrow, triangleColor);
    }
    renderer.drawShape(rect, "points", outline, triangleColor, 10 * dpr);
    renderer.drawShape(rect, "points", [p.x, p.y], pointColor, 10 * dpr);

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
        const x = corner.x + (1.3 * (corner.x - centre.x)) / length;
        const y = corner.y + (1.3 * (corner.y - centre.y)) / length;
        labels[k].style.left = `${(rect.left + (x / W) * rect.width) / dpr}px`;
        labels[k].style.top = `${(rect.top + (y / H) * rect.height) / dpr}px`;
    });
}

// The edge functions at p, A = (v1 − v0) × (v2 − v0) as on the lecture's Winding Order slide, and
// the barycentric coordinates of p.
function showReadout(): void {
    const [v0, v1, v2] = corners;
    const e01 = edgeFunction(v0, v1, p);
    const e12 = edgeFunction(v1, v2, p);
    const e20 = edgeFunction(v2, v0, p);
    const area = (v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x);

    readout.p = `(${p.x}, ${p.y})`;
    readout.e01 = format(e01);
    readout.e12 = format(e12);
    readout.e20 = format(e20);
    readout.area = format(area);
    if (area === 0) {
        readout.alpha = "–";
        readout.beta = "–";
        readout.gamma = "–";
    } else {
        readout.alpha = format(e12 / area);
        readout.beta = format(e20 / area);
        readout.gamma = format(e01 / area);
    }
    for (const controller of gui.controllersRecursive()) {
        controller.updateDisplay();
    }
}

// A number with at most three decimals, e.g. 40.5 or 0.351.
function format(value: number): string {
    return String(Number(value.toFixed(3)));
}
