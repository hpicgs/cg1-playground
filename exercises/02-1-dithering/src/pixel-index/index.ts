import * as renderer from "./renderer";

// A test image of 6 × 4 pixels, row by row from the top, four bytes per pixel: R, G, B, A.
const width = 6;
const height = 4;
// prettier-ignore
const data = new Uint8ClampedArray([
    255, 0, 0, 255,     255, 128, 0, 255,   255, 255, 0, 255,   0, 200, 0, 255,     0, 200, 255, 255,   0, 0, 255, 255,
    255, 255, 255, 255, 192, 192, 192, 255, 128, 128, 128, 255, 64, 64, 64, 255,    0, 0, 0, 255,       128, 0, 192, 255,
    255, 128, 192, 255, 128, 64, 0, 255,    30, 90, 160, 255,   0, 128, 128, 255,   200, 40, 40, 128,   250, 200, 120, 255,
    60, 180, 75, 255,   245, 130, 48, 255,  145, 30, 180, 255,  70, 240, 240, 255,  240, 50, 230, 255,  210, 245, 60, 255,
]);

// What the mouse is over: a pixel, a byte or nothing.
let hovered: renderer.Hit | null = null;

let context: CanvasRenderingContext2D;

export function start(canvas: HTMLCanvasElement): void {
    const result = canvas.getContext("2d");
    if (result === null) {
        throw new Error("Canvas 2D wird von diesem Browser nicht unterstützt");
    }
    context = result;

    canvas.addEventListener("pointermove", hover);
    canvas.addEventListener("pointerleave", () => {
        hovered = null;
        draw();
    });

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
    renderer.draw(context, { data, width, height, hovered });
}

function hover(event: PointerEvent): void {
    hovered = renderer.hitTest(context, width, height, event.offsetX, event.offsetY);
    draw();
}
