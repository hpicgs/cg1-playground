import GUI from "lil-gui";
import { rasterizeLine, type Pixel } from "./bresenham";
import * as renderer from "./renderer";

const params = {
    columns: 32,
    color: "#5c9ded",
};

let context: CanvasRenderingContext2D;
let lineStart: Pixel = [3, 4];
let lineEnd: Pixel = [26, 13];
let dragged: "start" | "end" | null = null;

export function start(canvas: HTMLCanvasElement, controls: HTMLElement): void {
    const result = canvas.getContext("2d");
    if (result === null) {
        throw new Error("Canvas 2D wird von diesem Browser nicht unterstützt");
    }
    context = result;

    const gui = new GUI({ container: controls, title: "Linie" });
    gui.add(params, "columns", 8, 64, 1).name("Spalten");
    gui.addColor(params, "color").name("Pixelfarbe");
    gui.onChange(draw);

    canvas.addEventListener("pointerdown", grab);
    canvas.addEventListener("pointermove", drag);
    canvas.addEventListener("pointerup", release);

    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", resize);
    resize();
}

// Keep the drawing buffer at the canvas's displayed size (in device pixels).
function resize(): void {
    const canvas = context.canvas;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
    }
}

function draw(): void {
    lineStart = insideGrid(lineStart);
    lineEnd = insideGrid(lineEnd);
    const pixels = rasterizeLine(lineStart[0], lineStart[1], lineEnd[0], lineEnd[1]);
    renderer.draw(context, {
        columns: params.columns,
        rows: rows(),
        lineStart,
        lineEnd,
        pixels,
        color: params.color,
    });
}

// The number of rows follows from the canvas's aspect ratio, so the cells stay square.
function rows(): number {
    const canvas = context.canvas;
    return Math.max(1, Math.round((params.columns * canvas.clientHeight) / canvas.clientWidth));
}

function insideGrid(pixel: Pixel): Pixel {
    const x = Math.min(Math.max(pixel[0], 0), params.columns - 1);
    const y = Math.min(Math.max(pixel[1], 0), rows() - 1);
    return [x, y];
}

// The grid cell under the mouse pointer.
function cellAt(event: PointerEvent): Pixel {
    const size = context.canvas.clientWidth / params.columns;
    return [Math.floor(event.offsetX / size), Math.floor(event.offsetY / size)];
}

function isNear(a: Pixel, b: Pixel): boolean {
    return Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1;
}

// Dragging an endpoint with the mouse.
function grab(event: PointerEvent): void {
    const cell = cellAt(event);
    if (isNear(cell, lineStart)) {
        dragged = "start";
    } else if (isNear(cell, lineEnd)) {
        dragged = "end";
    } else {
        return;
    }
    context.canvas.setPointerCapture(event.pointerId);
}

function drag(event: PointerEvent): void {
    if (dragged === "start") {
        lineStart = cellAt(event);
        draw();
    } else if (dragged === "end") {
        lineEnd = cellAt(event);
        draw();
    }
}

function release(): void {
    dragged = null;
}
