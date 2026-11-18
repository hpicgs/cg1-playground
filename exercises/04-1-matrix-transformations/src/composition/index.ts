import GUI from "lil-gui";
import * as renderer from "./renderer";

// The part of the plane the demo shows.
const view = { left: -5.5, right: 5.5, bottom: -2.5, top: 7.5 };

// The polygon, as the corners of its outline. It is the polygon of the last task.
const polygon = [0, 0, 2, 0, 2, 1, 1, 1, 1, 3, 0, 3];

// The rotation R and the translation T, the order in which they are applied, the centre of the
// rotation and whether the step between the two is shown.
const params = {
    angle: 90,
    dx: 3,
    dy: 0,
    order: "TR",
    centre: "origin",
    step: "off",
};

const orderOptions = {
    "erst drehen, dann verschieben": "TR",
    "erst verschieben, dann drehen": "RT",
};
const centreOptions = { Ursprung: "origin", "Punkt c": "point" };
const stepOptions = { aus: "off", an: "on" };

// The centre of the rotation, dragged on the canvas.
const centre = { x: -2, y: 2 };

// The total transformation, shown read-only.
const readout = { row0: "", row1: "", row2: "" };

// Colours: grid, axes, the polygon before, between and after the two transformations, and the
// centre of the rotation.
const halfGridColor = [0.21, 0.22, 0.27];
const gridColor = [0.34, 0.36, 0.43];
const axisColor = [0.56, 0.59, 0.67];
const originalColor = [0.62, 0.65, 0.72];
const stepColor = [0.5, 0.42, 0.3];
const imageFillColor = [0.45, 0.29, 0.19];
const imageColor = [0.88, 0.56, 0.36];
const centreColor = [0.95, 0.78, 0.3];

// Sizes of the drawn points in CSS pixels, and the margin and the controls column around the
// drawing area.
const cornerSize = 8;
const centreSize = 11;
// Length of a dash on the half coordinates and the gap between two dashes, in units.
const dashLength = 0.14;
const dashStep = 0.28;

const padding = 16;
const sideWidth = 250;

// How close to the centre, in units of the plane, a click grabs it.
const grabRadius = 0.6;

let canvas: HTMLCanvasElement;
let gui: GUI;
let dragging = false;

export function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): void {
    canvas = element;
    const gl = renderer.init(canvas, sources, view);

    gui = new GUI({ container: controls, title: "Verkettung", width: 234 });
    gui.add(params, "angle", -180, 180, 15).name("R: θ in Grad");
    gui.add(params, "dx", -4, 4, 0.5).name("T: dx");
    gui.add(params, "dy", -4, 4, 0.5).name("T: dy");
    gui.add(params, "order", orderOptions).name("Reihenfolge");
    gui.add(params, "centre", centreOptions).name("Drehzentrum");
    gui.add(params, "step", stepOptions).name("Zwischenschritt");

    const matrixFolder = gui.addFolder("Gesamttransformation");
    matrixFolder.domElement.classList.add("matrix");
    matrixFolder.add(readout, "row0").name("").disable();
    matrixFolder.add(readout, "row1").name("").disable();
    matrixFolder.add(readout, "row2").name("").disable();
    gui.onChange(draw);

    canvas.addEventListener("pointerdown", grab);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", () => {
        dragging = false;
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

/**
 * The product of two transformations: first b, then a.
 */
function multiply(a: number[], b: number[]): number[] {
    const product = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 3; column++) {
            for (let k = 0; k < 3; k++) {
                product[3 * row + column] += a[3 * row + k] * b[3 * k + column];
            }
        }
    }
    return product;
}

// The translation by (dx, dy).
function translation(dx: number, dy: number): number[] {
    return [1, 0, dx, 0, 1, dy, 0, 0, 1];
}

// The rotation by the set angle, about the origin or about the centre c.
function rotation(): number[] {
    const radians = (params.angle * Math.PI) / 180;
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    const about = [c, -s, 0, s, c, 0, 0, 0, 1];
    if (params.centre === "origin") {
        return about;
    }
    return multiply(
        translation(centre.x, centre.y),
        multiply(about, translation(-centre.x, -centre.y)),
    );
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

// The mouse position in coordinates of the plane.
function pointAt(event: PointerEvent): { x: number; y: number } {
    const dpr = window.devicePixelRatio || 1;
    const rect = layout();
    return {
        x: view.left + ((event.offsetX * dpr - rect.left) / rect.width) * (view.right - view.left),
        y: view.top - ((event.offsetY * dpr - rect.top) / rect.height) * (view.top - view.bottom),
    };
}

// The centre of the rotation is dragged with the mouse and snaps to multiples of 0.5.
function grab(event: PointerEvent): void {
    if (params.centre !== "point") {
        return;
    }
    const point = pointAt(event);
    if (Math.hypot(centre.x - point.x, centre.y - point.y) > grabRadius) {
        return;
    }
    dragging = true;
    canvas.setPointerCapture(event.pointerId);
}

function move(event: PointerEvent): void {
    if (!dragging) {
        return;
    }
    const point = pointAt(event);
    centre.x = Math.min(Math.max(Math.round(point.x * 2) / 2, view.left), view.right);
    centre.y = Math.min(Math.max(Math.round(point.y * 2) / 2, view.bottom), view.top);
    draw();
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
    const rotate = rotation();
    const translate = translation(params.dx, params.dy);

    // The first transformation of the chosen order, and the product of both.
    const first = params.order === "TR" ? rotate : translate;
    const total = params.order === "TR" ? multiply(translate, rotate) : multiply(rotate, translate);

    renderer.clear();
    renderer.drawShape(rect, "lines", halfGrid(), halfGridColor);
    renderer.drawShape(rect, "lines", grid(), gridColor);
    const axes = [view.left, 0, view.right, 0, 0, view.bottom, 0, view.top];
    renderer.drawShape(rect, "lines", axes, axisColor);

    renderer.drawShape(rect, "loop", polygon, originalColor);
    renderer.drawShape(rect, "points", polygon, originalColor, undefined, cornerSize * dpr);
    if (params.step === "on") {
        renderer.drawShape(rect, "loop", polygon, stepColor, first);
    }
    renderer.drawShape(rect, "fan", polygon, imageFillColor, total);
    renderer.drawShape(rect, "loop", polygon, imageColor, total);
    renderer.drawShape(rect, "points", polygon, imageColor, total, cornerSize * dpr);

    if (params.centre === "point") {
        renderer.drawShape(
            rect,
            "points",
            [centre.x, centre.y],
            centreColor,
            undefined,
            centreSize * dpr,
        );
    }

    readout.row0 = row(total, 0);
    readout.row1 = row(total, 1);
    readout.row2 = row(total, 2);
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
