import GUI, { type Controller } from "lil-gui";
import filmUrl from "../../assets/luts/film-33.png";
import identityUrl from "../../assets/luts/identitaet-4.png";
import riddleUrl from "../../assets/luts/raetsel-8.png";
import * as renderer from "./renderer";

// The LUT files the demo shows.
const files: Record<string, string> = {
    Identität: identityUrl,
    Rätsel: riddleUrl,
    Film: filmUrl,
};

const settings = {
    lut: "Identität",
    slice: 0,
};

// The values shown read-only, for the pixel of the LUT image under the mouse.
const readout = {
    pixel: "–",
    bytes: "–",
};

// Sizes in CSS pixels: the margin, the column on the right with the controls, the room for
// the fullscreen button at the bottom right, the height of the titles, and the largest share of
// the canvas height for the whole LUT image.
const padding = 16;
const sideWidth = 270;
const buttonWidth = 110;
const titleHeight = 28;
const imageShare = 0.32;

// Grid lines are drawn between entries when an entry is at least this large, in device pixels.
const minGridCell = 6;

// Colours of the grid, the outline of the slice and the outline of the pixel under the mouse.
const gridColor = [0.08, 0.09, 0.11];
const sliceColor = [0.88, 0.56, 0.36];
const hoverColor = [0.85, 0.86, 0.89];

let canvas: HTMLCanvasElement;
let gui: GUI;
let sliceController: Controller;
const images: Record<string, ImageData> = {};
let lut: ImageData;
let hovered: { i: number; j: number } | null = null;
let titles: HTMLElement[];

export async function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): Promise<void> {
    canvas = element;
    const gl = renderer.init(canvas, sources);
    for (const [name, url] of Object.entries(files)) {
        images[name] = await loadImage(url);
    }

    gui = new GUI({ container: controls, title: "3D-LUT", width: 254 });
    gui.add(settings, "lut", Object.keys(files)).name("LUT").onChange(chooseLut);
    sliceController = gui.add(settings, "slice", 0, 1, 1).name("Schicht").onChange(draw);
    gui.add(readout, "pixel").name("Pixel (i, j)").disable();
    gui.add(readout, "bytes").name("Bytes (R, G, B)").disable();

    titles = ["", "LUT-Bild"].map((name) => {
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
    chooseLut();
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

// Uploads the chosen LUT; its N is the height of the image.
function chooseLut(): void {
    lut = images[settings.lut];
    renderer.setLut(lut);
    const N = lut.height;
    settings.slice = Math.min(settings.slice, N - 1);
    sliceController.max(N - 1);
    sliceController.updateDisplay();
    draw();
}

// Where the magnified slice and the whole LUT image go, in device pixels: the slice at the
// top left, the whole image across the width below it.
function layout(): { slice: renderer.Rect; image: renderer.Rect } {
    const dpr = window.devicePixelRatio || 1;
    const margin = Math.round(padding * dpr);
    const side = Math.round(sideWidth * dpr);
    const title = Math.round(titleHeight * dpr);
    const N = lut.height;

    const button = Math.round(buttonWidth * dpr);
    const imageScale = Math.min(
        (canvas.width - 2 * margin - button) / (N * N),
        (canvas.height * imageShare) / N,
    );
    const imageWidth = Math.max(1, Math.round(N * N * imageScale));
    const imageHeight = Math.max(1, Math.round(N * imageScale));
    const image = {
        left: margin,
        top: canvas.height - margin - imageHeight,
        width: imageWidth,
        height: imageHeight,
    };

    const sliceSize = Math.max(
        1,
        Math.floor(Math.min(canvas.width - side - 2 * margin, image.top - 2 * title - margin) / N) *
            N,
    );
    const slice = { left: margin, top: margin + title, width: sliceSize, height: sliceSize };
    return { slice, image };
}

// The pixel (i, j) of the LUT image under the mouse, in the slice or in the whole image.
function hitTest(event: PointerEvent): { i: number; j: number } | null {
    const dpr = window.devicePixelRatio || 1;
    const x = event.offsetX * dpr;
    const y = event.offsetY * dpr;
    const places = layout();
    const N = lut.height;

    const slice = places.slice;
    const mr = Math.floor(((x - slice.left) / slice.width) * N);
    const mg = Math.floor(((y - slice.top) / slice.height) * N);
    if (mr >= 0 && mr < N && mg >= 0 && mg < N) {
        return { i: settings.slice * N + mr, j: mg };
    }

    const image = places.image;
    const i = Math.floor(((x - image.left) / image.width) * N * N);
    const j = Math.floor(((y - image.top) / image.height) * N);
    if (i >= 0 && i < N * N && j >= 0 && j < N) {
        return { i, j };
    }
    return null;
}

function draw(): void {
    const places = layout();
    const N = lut.height;
    renderer.clear();

    // The slice: the N × N pixels from column i = slice · N on.
    const u0 = (settings.slice * N) / (N * N);
    const u1 = ((settings.slice + 1) * N) / (N * N);
    renderer.drawLut(places.slice, u0, 0, u1, 1);
    if (places.slice.width / N >= minGridCell) {
        const grid: number[] = [];
        for (let m = 1; m < N; m++) {
            grid.push(m, 0, m, N, 0, m, N, m);
        }
        renderer.drawShape(places.slice, [N, N], "lines", grid, gridColor);
    }

    // The whole image, with the slice outlined.
    renderer.drawLut(places.image, 0, 0, 1, 1);
    const left = settings.slice * N;
    const outline = [left, 0, left + N, 0, left + N, N, left, N];
    renderer.drawShape(places.image, [N * N, N], "loop", outline, sliceColor);

    // The pixel under the mouse, outlined in both views, and its bytes.
    if (hovered === null) {
        readout.pixel = "–";
        readout.bytes = "–";
    } else {
        const { i, j } = hovered;
        const square = [i, j, i + 1, j, i + 1, j + 1, i, j + 1];
        renderer.drawShape(places.image, [N * N, N], "loop", square, hoverColor);
        if (Math.floor(i / N) === settings.slice) {
            const mr = i - settings.slice * N;
            const cell = [mr, j, mr + 1, j, mr + 1, j + 1, mr, j + 1];
            renderer.drawShape(places.slice, [N, N], "loop", cell, hoverColor);
        }
        const p = 4 * (j * lut.width + i);
        readout.pixel = `(${i}, ${j})`;
        readout.bytes = Array.from(lut.data.slice(p, p + 3)).join(", ");
    }

    const dpr = window.devicePixelRatio || 1;
    titles[0].textContent = `Schicht ${settings.slice}, vergrößert`;
    [places.slice, places.image].forEach((rect, n) => {
        titles[n].style.left = `${rect.left / dpr}px`;
        titles[n].style.top = `${rect.top / dpr - titleHeight}px`;
    });
    for (const controller of gui.controllers) {
        controller.updateDisplay();
    }
}
