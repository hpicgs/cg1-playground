import GUI from "lil-gui";
import flowerUrl from "../../assets/flower.png";
import { laplace } from "./laplace";
import * as renderer from "./renderer";

const params = {
    alpha: 1,
    beta: 128 / 255,
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

let context: CanvasRenderingContext2D;
let photo: ImageData;
let test: ImageData;

export async function start(canvas: HTMLCanvasElement, controls: HTMLElement): Promise<void> {
    const result = canvas.getContext("2d");
    if (result === null) {
        throw new Error("Canvas 2D wird von diesem Browser nicht unterstützt");
    }
    context = result;

    photo = await loadPhoto();
    test = makeTestImage();

    // α is a whole number and β a whole number of bytes, so the results are whole bytes.
    const gui = new GUI({ container: controls, title: "Laplace-Filter (CPU)" });
    gui.add(params, "alpha", 1, 8, 1).name("Verstärkung α").onChange(draw);
    gui.add(params, "beta", 0, 1, 1 / 255)
        .name("Versatz β")
        .decimals(3)
        .onChange(draw);

    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", resize);
    resize();
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
    const offscreenContext = offscreen.getContext("2d");
    if (offscreenContext === null) {
        throw new Error("Canvas 2D wird von diesem Browser nicht unterstützt");
    }

    offscreenContext.drawImage(image, 0, 0, width, height);
    return offscreenContext.getImageData(0, 0, width, height);
}

// A copy, so that a function that writes into its input cannot change the stored image.
function copy(image: ImageData): ImageData {
    return new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
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
    // Your laplace runs on a copy of both images, one pixel after the other.
    renderer.draw(context, {
        photo: laplace(copy(photo), params.alpha, params.beta),
        test: laplace(copy(test), params.alpha, params.beta),
    });
}
