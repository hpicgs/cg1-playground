import GUI from "lil-gui";
import * as renderer from "./renderer";

// The raster: W × H pixels. Pixel coordinates (x, y) run from (0, 0) at the top left to (W, H).
const W = 32;
const H = 18;

type Point = { x: number; y: number };

// The corners v0 … v5 in the order of the vertex array.
const corners: Point[] = [
    { x: 4, y: 8 },
    { x: 8, y: 2 },
    { x: 20, y: 3 },
    { x: 28, y: 8 },
    { x: 22, y: 16 },
    { x: 8, y: 16 },
];
const names = ["v₀", "v₁", "v₂", "v₃", "v₄", "v₅"];

// The settings and the values shown read-only.
const settings = {
    primitive: 0,
    view: "Dreiecke",
};
const readout = {
    fragments: 0,
    pixels: 0,
    several: 0,
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
const sideWidth = 266;

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
    settings.primitive = gl.TRIANGLE_FAN;

    gui = new GUI({ container: controls, title: "Primitive", width: 250 });
    gui.add(settings, "primitive", {
        TRIANGLES: gl.TRIANGLES,
        TRIANGLE_STRIP: gl.TRIANGLE_STRIP,
        TRIANGLE_FAN: gl.TRIANGLE_FAN,
    }).name("Primitiv");
    gui.add(settings, "view", ["Dreiecke", "Fragmente pro Pixel"]).name("Anzeige");

    // The corners as a table: one row per corner with x and y.
    const table = gui.addFolder("Ecken: x, y");
    table.domElement.classList.add("cells", "cells-2");
    corners.forEach((corner, k) => {
        table.add(corner, "x").step(0.5).name(names[k]);
        table.add(corner, "y").step(0.5).name("");
    });
    gui.add(readout, "fragments").name("Fragmente").disable();
    gui.add(readout, "pixels").name("Pixel gesetzt").disable();
    gui.add(readout, "several").name("Pixel mehrfach").disable();
    gui.onChange(draw);

    // The names of the corners, as text over the canvas.
    labels = names.map((name) => {
        const label = document.createElement("span");
        label.className = "corner-label";
        label.textContent = name;
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
    if (dragged === null) {
        return;
    }
    const point = pointAt(event);
    dragged.x = Math.min(Math.max(Math.round(point.x * 2) / 2, 0), W);
    dragged.y = Math.min(Math.max(Math.round(point.y * 2) / 2, 0), H);
    for (const controller of gui.controllersRecursive()) {
        controller.updateDisplay();
    }
    draw();
}

function draw(): void {
    // The vertex array: x, y for each corner.
    const vertices = new Float32Array(corners.flatMap((corner) => [corner.x, corner.y]));

    // The GPU draws the corners with the chosen primitive into the raster, which is then shown
    // enlarged. A second raster counts the fragments of every pixel.
    const counting = settings.view === "Fragmente pro Pixel";
    renderer.drawPrimitive(vertices, settings.primitive, counting);
    const counts = renderer.countFragments(vertices, settings.primitive);
    readout.fragments = counts.reduce((sum, count) => sum + count, 0);
    readout.pixels = counts.filter((count) => count > 0).length;
    readout.several = counts.filter((count) => count > 1).length;
    for (const controller of gui.controllersRecursive()) {
        controller.updateDisplay();
    }

    // Nothing to draw while the canvas has no room for the raster.
    const rect = layout();
    if (rect.width <= 0 || rect.height <= 0) {
        return;
    }
    renderer.showRaster(rect);

    // On top: grid lines, pixel centres, the outline of the corners in order and the corners.
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

    renderer.drawShape(rect, "loop", Array.from(vertices), outlineColor);
    for (const corner of corners) {
        const point = [corner.x, corner.y];
        renderer.drawShape(rect, "points", point, outlineColor, cornerRingSize * dpr);
        renderer.drawShape(rect, "points", point, gridColor, cornerSize * dpr);
    }

    placeLabels(rect);
}

// Puts each corner's name next to it, on the side away from the centre of all corners.
function placeLabels(rect: renderer.Rect): void {
    const dpr = window.devicePixelRatio || 1;
    const centre = {
        x: corners.reduce((sum, corner) => sum + corner.x, 0) / corners.length,
        y: corners.reduce((sum, corner) => sum + corner.y, 0) / corners.length,
    };
    corners.forEach((corner, k) => {
        const length = Math.hypot(corner.x - centre.x, corner.y - centre.y) || 1;
        const x = corner.x + (labelOffset * (corner.x - centre.x)) / length;
        const y = corner.y + (labelOffset * (corner.y - centre.y)) / length;
        labels[k].style.left = `${(rect.left + (x / W) * rect.width) / dpr}px`;
        labels[k].style.top = `${(rect.top + (y / H) * rect.height) / dpr}px`;
    });
}
