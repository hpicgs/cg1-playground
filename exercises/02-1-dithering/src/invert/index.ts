import flowerUrl from "../../assets/flower.png";
import { invert } from "./invert";
import * as renderer from "./renderer";

// Colour patches below the photo: white, black, red, green, blue and gray 128.
const patches = ["#ffffff", "#000000", "#ff0000", "#00ff00", "#0000ff", "#808080"];

// Size of the input in pixels: the photo is scaled to this width, the patches are this high.
const inputWidth = 480;
const patchHeight = 60;

let context: CanvasRenderingContext2D;
let input: ImageData;
let output: ImageData;

export async function start(canvas: HTMLCanvasElement): Promise<void> {
    const result = canvas.getContext("2d");
    if (result === null) {
        throw new Error("Canvas 2D wird von diesem Browser nicht unterstützt");
    }
    context = result;

    input = await loadInput();
    output = invert(input);

    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", resize);
    resize();
}

// Loads the photo and adds a row of colour patches below it.
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
    renderer.draw(context, {
        panels: [
            { title: "Eingabe", image: input },
            { title: "Ausgabe von invert", image: output },
        ],
        patchCount: patches.length,
        patchHeight,
    });
}
