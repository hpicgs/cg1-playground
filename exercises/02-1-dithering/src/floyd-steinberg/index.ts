import GUI from "lil-gui";
import flowerUrl from "../../assets/flower.png";
import { weightedGray } from "../grayscale/gray";
import { floydSteinberg } from "./floyd-steinberg";
import * as renderer from "./renderer";

const params = {
    threshold: 0.5,
    testValue: 0.25,
    pixelSize: 3,
};

// TODO: task "Jarvis oder Stucki"
const dither = floydSteinberg;

// The BT.709 weights for weightedGray (Kapitel 2, Folie 44).
const wR = 0.2126;
const wG = 0.7152;
const wB = 0.0722;

let context: CanvasRenderingContext2D;
let photo: HTMLImageElement;

export async function start(canvas: HTMLCanvasElement, controls: HTMLElement): Promise<void> {
    const result = canvas.getContext("2d");
    if (result === null) {
        throw new Error("Canvas 2D wird von diesem Browser nicht unterstützt");
    }
    context = result;

    photo = new Image();
    photo.src = flowerUrl;
    await photo.decode();

    const gui = new GUI({ container: controls, title: "Floyd–Steinberg" });
    gui.add(params, "threshold", 0, 1, 0.01).name("Schwellwert T");
    gui.add(params, "testValue", 0, 1, 0.01).name("Testwert");
    gui.add(params, "pixelSize", 1, 8, 1).name("Pixelgröße");
    gui.onChange(draw);

    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", resize);
    resize();
}

// The photo at the given size, converted by your weightedGray from the grayscale demo.
// As long as weightedGray returns its input, this is the colour photo.
function grayPhoto(width: number, height: number): ImageData {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const offscreen = canvas.getContext("2d");
    if (offscreen === null) {
        throw new Error("Canvas 2D wird von diesem Browser nicht unterstützt");
    }

    offscreen.drawImage(photo, 0, 0, width, height);
    const image = offscreen.getImageData(0, 0, width, height);
    return weightedGray(image, wR, wG, wB);
}

// The R channel of an image as values in [0, 1], one per pixel.
function channelR(image: ImageData): Float32Array {
    const values = new Float32Array(image.width * image.height);
    for (let k = 0; k < values.length; k++) {
        values[k] = image.data[4 * k] / 255;
    }
    return values;
}

// A gray ramp from 0 on the left to 1 on the right: I = i / (W - 1) in every row.
function makeRamp(width: number, height: number): Float32Array {
    const ramp = new Float32Array(width * height);
    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            ramp[j * width + i] = i / (width - 1);
        }
    }
    return ramp;
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
    const aspect = photo.height / photo.width;
    const layout = renderer.layout(
        context.canvas.width,
        context.canvas.height,
        params.pixelSize,
        aspect,
    );
    const columns = layout.inputPhoto.columns;
    const photoRows = layout.inputPhoto.rows;
    const rampRows = layout.inputRamp.rows;

    // Input: the photo in gray and a gray ramp.
    const grayImage = grayPhoto(columns, photoRows);
    const photoValues = channelR(grayImage);
    const ramp = makeRamp(columns, rampRows);

    // Output: your dithering, on copies of the input.
    const photoOutput = dither(photoValues.slice(), columns, photoRows, params.threshold);
    const rampOutput = dither(ramp.slice(), columns, rampRows, params.threshold);

    // The 4 × 4 test raster. After the run, testGray holds each pixel's value at its visit.
    const testGray = new Float32Array(16).fill(params.testValue);
    const testOutput = dither(testGray, 4, 4, params.threshold);

    renderer.draw(context, layout, {
        photo: grayImage,
        photoOutput,
        ramp,
        rampOutput,
        testGray,
        testOutput,
    });
}
