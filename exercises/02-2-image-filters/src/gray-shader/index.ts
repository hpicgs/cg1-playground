import GUI from "lil-gui";
import flowerUrl from "../../assets/flower.png";
import * as renderer from "./renderer";

// The pixel of the test image under the mouse and its bytes, shown read-only.
const readout = {
    pixel: "–",
    bytes: "–",
};

// The photo is scaled to this width when it is loaded.
const photoWidth = 480;

// The test image: 4 × 2 colours as R, G, B, one array per row, from the top.
const testRows = [
    [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 255],
    ],
    [
        [0, 255, 255],
        [255, 0, 255],
        [255, 255, 0],
        [128, 128, 128],
    ],
];

// Sizes in CSS pixels: the margin, and the column on the right with the controls on top and
// the test image below them.
const padding = 16;
const sideWidth = 245;
const controlsHeight = 95;

let canvas: HTMLCanvasElement;
let photoLayer: renderer.Layer;
let testLayer: renderer.Layer;
let hovered: { i: number; j: number } | null = null;
let gui: GUI;

export async function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): Promise<void> {
    canvas = element;
    const gl = renderer.init(canvas, sources);

    photoLayer = renderer.createLayer(await loadPhoto());
    testLayer = renderer.createLayer(makeTestImage());

    gui = new GUI({ container: controls, title: "Testbild unter der Maus" });
    gui.add(readout, "pixel").name("Pixel (i, j)").disable();
    gui.add(readout, "bytes").name("R, G, B").disable();

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
    resize();
}

export function rebuild(sources: Record<string, string>): void {
    renderer.setShaders(sources);
    draw();
}

function makeTestImage(): ImageData {
    const width = testRows[0].length;
    const image = new ImageData(width, testRows.length);
    testRows.forEach((row, j) => {
        row.forEach(([r, g, b], i) => {
            image.data.set([r, g, b, 255], 4 * (j * width + i));
        });
    });
    return image;
}

// Loads the photo, scaled to photoWidth, as an ImageData.
async function loadPhoto(): Promise<ImageData> {
    const image = new Image();
    image.src = flowerUrl;
    await image.decode();

    const width = photoWidth;
    const height = Math.round((photoWidth * image.height) / image.width);
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const context = offscreen.getContext("2d");
    if (context === null) {
        throw new Error("Canvas 2D wird von diesem Browser nicht unterstützt");
    }

    context.drawImage(image, 0, 0, width, height);
    return context.getImageData(0, 0, width, height);
}

// Where the photo and the test image go, in device pixels. The photo fills the space on the
// left; the test image sits in the side column below the controls.
function layout(): { photo: renderer.Rect; test: renderer.Rect } {
    const dpr = window.devicePixelRatio || 1;
    const margin = Math.round(padding * dpr);
    const side = Math.round(sideWidth * dpr);

    const scale = Math.min(
        (canvas.width - side - 3 * margin) / photoLayer.width,
        (canvas.height - 2 * margin) / photoLayer.height,
    );
    const photo = {
        left: margin,
        top: margin,
        width: Math.round(photoLayer.width * scale),
        height: Math.round(photoLayer.height * scale),
    };

    const cellSize = Math.floor(side / testLayer.width);
    const test = {
        left: canvas.width - margin / 2 - side,
        top: Math.round(controlsHeight * dpr) + margin,
        width: cellSize * testLayer.width,
        height: cellSize * testLayer.height,
    };

    return { photo, test };
}

// The pixel (i, j) of the test image under the mouse, or null.
function hitTest(event: PointerEvent): { i: number; j: number } | null {
    const dpr = window.devicePixelRatio || 1;
    const test = layout().test;
    const cellSize = test.width / testLayer.width;
    const i = Math.floor((event.offsetX * dpr - test.left) / cellSize);
    const j = Math.floor((event.offsetY * dpr - test.top) / cellSize);
    if (i < 0 || i >= testLayer.width || j < 0 || j >= testLayer.height) {
        return null;
    }
    return { i, j };
}

function draw(): void {
    const places = layout();
    renderer.clear();

    // Your shader runs once for every canvas pixel of both images.
    renderer.draw(photoLayer, places.photo);
    renderer.draw(testLayer, places.test);

    // The bytes in the middle of the hovered pixel of the test image.
    if (hovered === null) {
        readout.pixel = "–";
        readout.bytes = "–";
    } else {
        const cellSize = places.test.width / testLayer.width;
        const x = Math.floor(places.test.left + (hovered.i + 0.5) * cellSize);
        const y = Math.floor(places.test.top + (hovered.j + 0.5) * cellSize);
        readout.pixel = `(${hovered.i}, ${hovered.j})`;
        readout.bytes = renderer.readPixel(x, y).join(", ");
    }
    for (const controller of gui.controllers) {
        controller.updateDisplay();
    }
}
