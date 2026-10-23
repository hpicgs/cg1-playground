export type Panel = { title: string; image: ImageData };

export type GrayScene = {
    panels: Panel[];
    patchCount: number;
    patchHeight: number;
};

const colors = {
    background: "#15171c",
    text: "#d9dce2",
    muted: "#949aa6",
};

// Sizes in CSS pixels.
const padding = 16;
const titleHeight = 24;
const bytesHeight = 28;

// Draws the panels side by side, each with the bytes R, G, B of its patches below, in CSS pixels.
export function draw(context: CanvasRenderingContext2D, scene: GrayScene): void {
    const canvasWidth = context.canvas.clientWidth;
    const canvasHeight = context.canvas.clientHeight;

    context.fillStyle = colors.background;
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    // All panels have the same size: as large as the width and the height allow.
    const count = scene.panels.length;
    const image = scene.panels[0].image;
    const panelWidth = (canvasWidth - (count + 1) * padding) / count;
    const scale = Math.min(
        panelWidth / image.width,
        (canvasHeight - 2 * padding - titleHeight - bytesHeight) / image.height,
    );
    const width = image.width * scale;
    const height = image.height * scale;
    const top = padding + titleHeight;

    scene.panels.forEach((panel, p) => {
        const left = padding + p * (panelWidth + padding) + (panelWidth - width) / 2;

        context.font = "15px system-ui, sans-serif";
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.fillStyle = colors.text;
        context.fillText(panel.title, left, padding + titleHeight / 2 - 2);

        context.drawImage(toCanvas(panel.image), left, top, width, height);

        drawPatchBytes(context, panel.image, scene, left, top + height, scale);
    });
}

// The bytes R, G, B of the centre pixel of every patch, below the patch.
function drawPatchBytes(
    context: CanvasRenderingContext2D,
    image: ImageData,
    scene: GrayScene,
    left: number,
    top: number,
    scale: number,
): void {
    const patchWidth = image.width / scene.patchCount;
    const j = image.height - Math.floor(scene.patchHeight / 2);

    context.font = "13px ui-monospace, monospace";
    context.textAlign = "center";
    context.fillStyle = colors.muted;

    for (let k = 0; k < scene.patchCount; k++) {
        const i = Math.floor((k + 0.5) * patchWidth);
        const index = 4 * (j * image.width + i);
        const r = image.data[index];
        const g = image.data[index + 1];
        const b = image.data[index + 2];
        const x = left + (k + 0.5) * patchWidth * scale;

        context.fillText(`${r}, ${g}, ${b}`, x, top + 16);
    }
}

// An offscreen canvas that holds the image, so it can be drawn scaled.
function toCanvas(image: ImageData): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d")?.putImageData(image, 0, 0);
    return canvas;
}
