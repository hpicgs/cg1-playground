import GUI from "lil-gui";
import flowerUrl from "../../assets/flower.png";
import * as renderer from "./renderer";

const params = {
    alpha: 1,
    beta: 128 / 255,
    noise: 0,
};

// The photo is scaled to this width when it is loaded.
const photoWidth = 480;

// The test image: 6 × 4 gray values, one array per row, from the top.
const testRows = [
    [240, 60, 60, 120, 120, 120],
    [60, 60, 60, 120, 120, 120],
    [60, 60, 60, 120, 120, 120],
    [60, 60, 60, 120, 120, 120],
];

// Sizes in CSS pixels: the margin, and the column on the right with the controls on top and
// the test image below them.
const padding = 16;
const sideWidth = 245;
const controlsHeight = 120;

let canvas: HTMLCanvasElement;
let photo: ImageData;
let photoLayer: renderer.Layer;
let testLayer: renderer.Layer;

export async function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): Promise<void> {
    canvas = element;
    const gl = renderer.init(canvas, sources);

    photo = await loadPhoto();
    photoLayer = renderer.createLayer(photo);
    testLayer = renderer.createLayer(makeTestImage());

    // α is a whole number and β a whole number of bytes, as in the demo for the CPU.
    const gui = new GUI({ container: controls, title: "Laplace-Filter (GPU)" });
    gui.add(params, "alpha", 1, 8, 1).name("Verstärkung α").onChange(draw);
    gui.add(params, "beta", 0, 1, 1 / 255)
        .name("Versatz β")
        .decimals(3)
        .onChange(draw);
    gui.add(params, "noise", 0, 0.1, 0.01).name("Rauschen a").onChange(changeNoise);

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
        row.forEach((value, i) => {
            image.data.set([value, value, value, 255], 4 * (j * width + i));
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

// Adds new random noise between -a and a to every pixel of the photo. R, G and B get the
// same value, so the noise is gray and not coloured.
function changeNoise(): void {
    const noisy = new ImageData(new Uint8ClampedArray(photo.data), photo.width, photo.height);
    for (let index = 0; index < photo.data.length; index += 4) {
        const offset = (2 * Math.random() - 1) * params.noise * 255;
        for (let c = 0; c < 3; c++) {
            noisy.data[index + c] = photo.data[index + c] + offset;
        }
    }
    renderer.setImage(photoLayer, noisy);
    draw();
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

function draw(): void {
    const places = layout();
    renderer.clear();

    // Your shader runs once for every canvas pixel of both images.
    renderer.draw(photoLayer, places.photo, params.alpha, params.beta);
    renderer.draw(testLayer, places.test, params.alpha, params.beta);
}
