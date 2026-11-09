import GUI from "lil-gui";
import photoUrl from "../../assets/flower-16.png";
import * as renderer from "./renderer";

// Every image of the demo has 160 × 120 pixels.
const W = 160;
const H = 120;

// The operations in the order of operation.frag.
const operations = ["Gammakorrektur", "Kontrastanpassung", "Glättung", "Vignette"];

const settings = {
    operation: operations[0],
};

// The values shown read-only, for the colour under the mouse.
const readout = {
    input: "–",
    pixels: "–",
    outputs: "–",
    output: "–",
};

// Sizes in CSS pixels: the margin, the gap between the images, the column on the right with the
// controls, and the height of the image titles.
const padding = 16;
const gap = 24;
const sideWidth = 300;
const titleHeight = 28;

let canvas: HTMLCanvasElement;
let gui: GUI;
let input: ImageData;
let output: Uint8Array;
let hovered: { i: number; j: number } | null = null;
let titles: HTMLElement[];

export async function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): Promise<void> {
    canvas = element;
    const gl = renderer.init(canvas, sources, W, H);
    input = await loadImage(photoUrl);
    renderer.setInput(input);

    gui = new GUI({ container: controls, title: "Farbraum-Transformation", width: 284 });
    gui.add(settings, "operation", operations).name("Operation");
    gui.add(readout, "input").name("Eingabefarbe (R, G, B)").disable();
    gui.add(readout, "pixels").name("Pixel mit dieser Farbe").disable();
    gui.add(readout, "outputs").name("Verschiedene Ausgabefarben").disable();
    gui.add(readout, "output").name("Ausgabefarbe (R, G, B)").disable();
    gui.onChange(update);

    // The titles above both images, as text over the canvas.
    titles = ["Eingabe", "Ausgabe"].map((name) => {
        const title = document.createElement("span");
        title.className = "image-title";
        title.textContent = name;
        canvas.parentElement?.append(title);
        return title;
    });

    canvas.addEventListener("pointermove", (event) => {
        hovered = hitTest(event);
        draw();
    });
    canvas.addEventListener("pointerleave", () => {
        hovered = null;
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
    update();
    resize();
}

// Loads an image at its own size as an ImageData. PNGs without colour information keep their
// bytes.
async function loadImage(url: string): Promise<ImageData> {
    const image = new Image();
    image.src = url;
    await image.decode();
    const offscreen = document.createElement("canvas");
    offscreen.width = image.width;
    offscreen.height = image.height;
    const context = offscreen.getContext("2d");
    if (context === null) {
        throw new Error("Canvas 2D wird von diesem Browser nicht unterstützt");
    }
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, image.width, image.height);
}

// Computes the output with the chosen operation.
function update(): void {
    output = renderer.apply(operations.indexOf(settings.operation));
    draw();
}

// Where the input and the output image go, in device pixels: side by side left of the
// controls, as large as possible.
function layout(): { input: renderer.Rect; output: renderer.Rect } {
    const dpr = window.devicePixelRatio || 1;
    const margin = Math.round(padding * dpr);
    const between = Math.round(gap * dpr);
    const side = Math.round(sideWidth * dpr);
    const title = Math.round(titleHeight * dpr);
    const fit = Math.min(
        (canvas.width - side - 2 * margin - between) / (2 * W),
        (canvas.height - 2 * margin - title) / H,
    );
    const scale = Math.max(0.1, fit);
    const width = Math.round(scale * W);
    const height = Math.round(scale * H);
    const top = Math.round((canvas.height - height + title) / 2);
    const inputRect = { left: margin, top, width, height };
    const outputRect = { left: margin + width + between, top, width, height };
    return { input: inputRect, output: outputRect };
}

// The pixel (i, j) under the mouse in either image, or null.
function hitTest(event: PointerEvent): { i: number; j: number } | null {
    const dpr = window.devicePixelRatio || 1;
    const x = event.offsetX * dpr;
    const y = event.offsetY * dpr;
    const places = layout();
    for (const rect of [places.input, places.output]) {
        const i = Math.floor(((x - rect.left) / rect.width) * W);
        const j = Math.floor(((y - rect.top) / rect.height) * H);
        if (i >= 0 && i < W && j >= 0 && j < H) {
            return { i, j };
        }
    }
    return null;
}

// The bytes R, G, B of pixel p of an RGBA byte array.
function colorAt(data: Uint8Array | Uint8ClampedArray, p: number): number[] {
    return [data[4 * p], data[4 * p + 1], data[4 * p + 2]];
}

function draw(): void {
    const places = layout();
    renderer.clear();

    // All pixels with the input colour under the mouse, and their different output colours.
    let highlight: number[] | null = null;
    if (hovered === null) {
        readout.input = "–";
        readout.pixels = "–";
        readout.outputs = "–";
        readout.output = "–";
    } else {
        const color = colorAt(input.data, hovered.j * W + hovered.i);
        const outputs = new Set<string>();
        let pixels = 0;
        for (let p = 0; p < W * H; p++) {
            if (colorAt(input.data, p).join() === color.join()) {
                pixels += 1;
                outputs.add(colorAt(output, p).join(", "));
            }
        }
        highlight = color.map((value) => value / 255);
        readout.input = color.join(", ");
        readout.pixels = String(pixels);
        readout.outputs = String(outputs.size);
        readout.output = colorAt(output, hovered.j * W + hovered.i).join(", ");
    }
    renderer.show("input", places.input, highlight);
    renderer.show("output", places.output, highlight);

    // The titles sit above the images.
    const dpr = window.devicePixelRatio || 1;
    [places.input, places.output].forEach((rect, n) => {
        titles[n].style.left = `${rect.left / dpr}px`;
        titles[n].style.top = `${rect.top / dpr - titleHeight}px`;
    });
    for (const controller of gui.controllers) {
        controller.updateDisplay();
    }
}
