import GUI, { type Controller } from "lil-gui";
import * as renderer from "./renderer";

// The part of the plane the demo shows.
const view = { left: -5.5, right: 5.5, bottom: -2.5, top: 7.5 };

// The polygon, as the corners of its outline. It is the polygon of the last task.
const polygon = [0, 0, 2, 0, 2, 1, 1, 1, 1, 3, 0, 3];

// The chosen transformation and the parameters of all five.
const params = {
    kind: "translation",
    dx: 3,
    dy: 1,
    sx: 1.5,
    sy: 1,
    angle: 45,
    mirror: "x",
    kxy: 0.5,
    kyx: 0,
};

const kindOptions = {
    Translation: "translation",
    Skalierung: "scaling",
    Rotation: "rotation",
    Spiegelung: "mirror",
    Scherung: "shear",
};

const mirrorOptions = { "Mx: x umkehren": "x", "My: y umkehren": "y" };

// The matrix and two values derived from it, shown read-only.
const readout = { row0: "", row1: "", row2: "", determinant: "", image: "" };

// Colours: grid, axes, the polygon before and after the transformation, and the two basis
// vectors before and after.
const halfGridColor = [0.21, 0.22, 0.27];
const gridColor = [0.34, 0.36, 0.43];
const axisColor = [0.56, 0.59, 0.67];
const originalColor = [0.62, 0.65, 0.72];
const imageFillColor = [0.45, 0.29, 0.19];
const imageColor = [0.88, 0.56, 0.36];
const basisColor = [0.37, 0.4, 0.47];
const imageBasisColor = [0.47, 0.7, 1.0];

// Sizes of the drawn corners in CSS pixels, and the margin and the controls column around the
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

    gui = new GUI({ container: controls, title: "Transformation", width: 234 });
    gui.add(params, "kind", kindOptions).name("Transformation");

    // The parameters of each transformation; only those of the chosen one are shown.
    const parameters: Record<string, Controller[]> = {
        translation: [
            gui.add(params, "dx", -4, 4, 0.5).name("dx"),
            gui.add(params, "dy", -4, 4, 0.5).name("dy"),
        ],
        scaling: [
            gui.add(params, "sx", -2, 2, 0.25).name("sx"),
            gui.add(params, "sy", -2, 2, 0.25).name("sy"),
        ],
        rotation: [gui.add(params, "angle", -180, 180, 15).name("θ in Grad")],
        mirror: [gui.add(params, "mirror", mirrorOptions).name("Spiegelung")],
        shear: [
            gui.add(params, "kxy", -1, 1, 0.25).name("kxy"),
            gui.add(params, "kyx", -1, 1, 0.25).name("kyx"),
        ],
    };

    const matrixFolder = gui.addFolder("Matrix");
    matrixFolder.domElement.classList.add("matrix");
    matrixFolder.add(readout, "row0").name("").disable();
    matrixFolder.add(readout, "row1").name("").disable();
    matrixFolder.add(readout, "row2").name("").disable();
    gui.add(readout, "determinant").name("det A").disable();
    gui.add(readout, "image").name("Bild von (1, 0)").disable();

    gui.onChange(() => {
        for (const [kind, controllers] of Object.entries(parameters)) {
            for (const controller of controllers) {
                controller.show(kind === params.kind);
            }
        }
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

    for (const [kind, controllers] of Object.entries(parameters)) {
        for (const controller of controllers) {
            controller.show(kind === params.kind);
        }
    }
    resize();
}

/**
 * The matrix of the chosen transformation in homogeneous coordinates, written row by row as in
 * the lecture.
 */
function matrix(): number[] {
    switch (params.kind) {
        case "translation":
            return [1, 0, params.dx, 0, 1, params.dy, 0, 0, 1];
        case "scaling":
            return [params.sx, 0, 0, 0, params.sy, 0, 0, 0, 1];
        case "rotation": {
            const radians = (params.angle * Math.PI) / 180;
            const c = Math.cos(radians);
            const s = Math.sin(radians);
            return [c, -s, 0, s, c, 0, 0, 0, 1];
        }
        case "mirror": {
            // M_x reverses the x coordinate, M_y the y coordinate, as in the lecture.
            const sx = params.mirror === "x" ? -1 : 1;
            const sy = params.mirror === "y" ? -1 : 1;
            return [sx, 0, 0, 0, sy, 0, 0, 0, 1];
        }
        default:
            return [1, params.kxy, 0, params.kyx, 1, 0, 0, 0, 1];
    }
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

// An arrow from a to b: the segment and a small head at b.
function arrow(ax: number, ay: number, bx: number, by: number): number[] {
    const length = Math.hypot(bx - ax, by - ay) || 1;
    const dx = (bx - ax) / length;
    const dy = (by - ay) / length;
    return [
        bx,
        by,
        bx - 0.3 * dx - 0.15 * dy,
        by - 0.3 * dy + 0.15 * dx,
        bx - 0.3 * dx + 0.15 * dy,
        by - 0.3 * dy - 0.15 * dx,
    ];
}

function draw(): void {
    const rect = layout();
    const dpr = window.devicePixelRatio || 1;
    const m = matrix();
    renderer.clear();

    renderer.drawShape(rect, "lines", halfGrid(), halfGridColor);
    renderer.drawShape(rect, "lines", grid(), gridColor);
    const axes = [view.left, 0, view.right, 0, 0, view.bottom, 0, view.top];
    renderer.drawShape(rect, "lines", axes, axisColor);

    // The polygon before the transformation as an outline, after it filled.
    renderer.drawShape(rect, "loop", polygon, originalColor);
    renderer.drawShape(rect, "points", polygon, originalColor, undefined, cornerSize * dpr);
    renderer.drawShape(rect, "fan", polygon, imageFillColor, m);
    renderer.drawShape(rect, "loop", polygon, imageColor, m);
    renderer.drawShape(rect, "points", polygon, imageColor, m, cornerSize * dpr);

    // The two basis vectors, before and after the transformation, over everything else. Their
    // images are the first two columns of the matrix.
    for (const [x, y] of [
        [1, 0],
        [0, 1],
    ]) {
        renderer.drawShape(rect, "lines", [0, 0, x, y], basisColor);
        renderer.drawShape(rect, "triangles", arrow(0, 0, x, y), basisColor);
        renderer.drawShape(rect, "lines", [0, 0, x, y], imageBasisColor, m);
        renderer.drawShape(rect, "triangles", arrow(0, 0, x, y), imageBasisColor, m);
    }

    showReadout(m);
}

// The matrix row by row, its determinant and the image of the point (1, 0).
function showReadout(m: number[]): void {
    readout.row0 = row(m, 0);
    readout.row1 = row(m, 1);
    readout.row2 = row(m, 2);
    readout.determinant = format(m[0] * m[4] - m[1] * m[3]);
    readout.image = `(${format(m[0])}, ${format(m[3])})`;
    for (const controller of gui.controllersRecursive()) {
        controller.updateDisplay();
    }
}

// One row of the matrix, with the entries under each other.
function row(m: number[], index: number): string {
    return m
        .slice(3 * index, 3 * index + 3)
        .map((value) => format(value).padStart(6))
        .join(" ");
}

// A number with at most three decimals, e.g. 1.5 or -0.707.
function format(value: number): string {
    return String(Number(value.toFixed(3)));
}
