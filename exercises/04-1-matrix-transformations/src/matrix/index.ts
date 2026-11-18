import GUI from "lil-gui";
import * as renderer from "./renderer";

// The part of the plane the demo shows.
const view = { left: -5.5, right: 5.5, bottom: -2.5, top: 7.5 };

// The polygon, as the corners of its outline. It is the polygon of the last task.
const polygon = [0, 0, 2, 0, 2, 1, 1, 1, 1, 3, 0, 3];

// All nine entries of the matrix. With the last row (0, 0, 1) the transformation is affine.
const params = { a: 1, b: 0, c: 0, d: 0, e: 1, f: 0, g: 0, h: 0, i: 1 };

// The determinant of the upper left part, read-only.
const readout = { determinant: "" };

// Colours: grid, axes, and the polygon before and after the transformation.
const halfGridColor = [0.21, 0.22, 0.27];
const gridColor = [0.34, 0.36, 0.43];
const axisColor = [0.56, 0.59, 0.67];
const originalColor = [0.62, 0.65, 0.72];
const imageFillColor = [0.45, 0.29, 0.19];
const imageColor = [0.88, 0.56, 0.36];

// Size of the drawn corners in CSS pixels, and the margin and the controls column around the
// drawing area.
const cornerSize = 8;
// Length of a dash on the half coordinates and the gap between two dashes, in units.
const dashLength = 0.14;
const dashStep = 0.28;

const padding = 16;
const sideWidth = 250;

let canvas: HTMLCanvasElement;
let gui: GUI;

export function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): void {
    canvas = element;
    const gl = renderer.init(canvas, sources, view);

    // The nine entries as a table, under each other like the rows of the matrix.
    gui = new GUI({ container: controls, title: "Matrix", width: 234 });
    const table = gui.addFolder("Einträge");
    table.domElement.classList.add("cells", "cells-3", "matrix");
    for (const key of ["a", "b", "c", "d", "e", "f", "g", "h", "i"] as const) {
        table.add(params, key).step(0.25).name("");
    }
    gui.add(readout, "determinant").name("det A").disable();
    gui.onChange(draw);

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

// Where the plane goes on the canvas, in device pixels: as large as possible left of the
// controls, with the same scale in x and y.
function layout(): renderer.Rect {
    const dpr = window.devicePixelRatio || 1;
    const margin = Math.round(padding * dpr);
    const side = Math.round(sideWidth * dpr);
    const unit = Math.min(
        (canvas.width - side - 2 * margin) / (view.right - view.left),
        (canvas.height - 2 * margin) / (view.top - view.bottom),
    );
    const width = Math.round(unit * (view.right - view.left));
    const height = Math.round(unit * (view.top - view.bottom));
    return {
        left: margin,
        top: Math.round((canvas.height - height) / 2),
        width,
        height,
    };
}

// Short dashes along the half coordinates, between the grid lines.
function halfGrid(): number[] {
    const dashes: number[] = [];
    for (let x = Math.ceil(view.left - 0.5) + 0.5; x <= view.right; x++) {
        for (let y = view.bottom; y < view.top; y += dashStep) {
            dashes.push(x, y, x, y + dashLength);
        }
    }
    for (let y = Math.ceil(view.bottom - 0.5) + 0.5; y <= view.top; y++) {
        for (let x = view.left; x < view.right; x += dashStep) {
            dashes.push(x, y, x + dashLength, y);
        }
    }
    return dashes;
}

// The full lines at the whole numbers, without the two axes. The view starts at a half
// number, so the loops start at the first whole number inside it.
function grid(): number[] {
    const lines: number[] = [];
    for (let x = Math.ceil(view.left); x <= view.right; x++) {
        if (x !== 0) {
            lines.push(x, view.bottom, x, view.top);
        }
    }
    for (let y = Math.ceil(view.bottom); y <= view.top; y++) {
        if (y !== 0) {
            lines.push(view.left, y, view.right, y);
        }
    }
    return lines;
}

function draw(): void {
    const rect = layout();
    const dpr = window.devicePixelRatio || 1;
    const m = [
        params.a,
        params.b,
        params.c,
        params.d,
        params.e,
        params.f,
        params.g,
        params.h,
        params.i,
    ];

    renderer.clear();
    renderer.drawShape(rect, "lines", halfGrid(), halfGridColor);
    renderer.drawShape(rect, "lines", grid(), gridColor);
    const axes = [view.left, 0, view.right, 0, 0, view.bottom, 0, view.top];
    renderer.drawShape(rect, "lines", axes, axisColor);

    renderer.drawShape(rect, "loop", polygon, originalColor);
    renderer.drawShape(rect, "points", polygon, originalColor, undefined, cornerSize * dpr);
    renderer.drawShape(rect, "fan", polygon, imageFillColor, m);
    renderer.drawShape(rect, "loop", polygon, imageColor, m);
    renderer.drawShape(rect, "points", polygon, imageColor, m, cornerSize * dpr);

    // The determinant of the upper left 2 x 2 part says what happens to area and orientation.
    const determinant = params.a * params.e - params.b * params.d;
    readout.determinant = String(Number(determinant.toFixed(3)));
    for (const controller of gui.controllersRecursive()) {
        controller.updateDisplay();
    }
}
