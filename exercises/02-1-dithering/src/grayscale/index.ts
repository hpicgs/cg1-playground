import flowerUrl from "../../assets/flower.png";
import { averageGray, weightedGray } from "./gray";
import * as renderer from "./renderer";

// TODO: task "Graustufen" b and c
// Colours of the two patches below the photo.
const patches = ["#ff0000", "#0000ff"];

// The weights for weightedGray: BT.709 (Kapitel 2, Folie 44).
const wR = 0.2126;
const wG = 0.7152;
const wB = 0.0722;

// Size of the input in pixels: the photo is scaled to this width, the patches are this high.
const inputWidth = 480;
const patchHeight = 60;

let context: CanvasRenderingContext2D;
let input: ImageData;

export async function start(canvas: HTMLCanvasElement): Promise<void> {
    const result = canvas.getContext("2d");
    if (result === null) {
        throw new Error("Canvas 2D wird von diesem Browser nicht unterstützt");
    }
    context = result;

    input = await loadInput();

    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", resize);
    resize();
}

// Loads the photo and adds the colour patches below it.
async function loadInput(): Promise<ImageData> {
    const photo = new Image();
    photo.src = flowerUrl;
    await photo.decode();

    const photoHeight = Math.round((inputWidth * photo.height) / photo.width);
    const patchWidth = inputWidth / patches.length;

    const canvas = document.createElement("canvas");
    canvas.width = inputWidth;
    canvas.height = photoHeight + patchHeight;
    const offscreen = canvas.getContext("2d");
    if (offscreen === null) {
        throw new Error("Canvas 2D wird von diesem Browser nicht unterstützt");
    }

    offscreen.drawImage(photo, 0, 0, inputWidth, photoHeight);
    patches.forEach((color, k) => {
        offscreen.fillStyle = color;
        offscreen.fillRect(k * patchWidth, photoHeight, patchWidth, patchHeight);
    });

    return offscreen.getImageData(0, 0, canvas.width, canvas.height);
}

// A copy, so that a function that changes its input cannot change the other panels.
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
    const average = averageGray(copy(input));
    const weighted = weightedGray(copy(input), wR, wG, wB);

    renderer.draw(context, {
        panels: [
            { title: "Original", image: input },
            { title: "Mittelwert (averageGray)", image: average },
            { title: "Gewichtet (weightedGray)", image: weighted },
        ],
        patchCount: patches.length,
        patchHeight,
    });
}
