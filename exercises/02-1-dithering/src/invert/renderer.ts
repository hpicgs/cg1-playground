export type Panel = { title: string; image: ImageData };

export type InvertScene = {
    panels: Panel[];
    patchCount: number;
    patchHeight: number;
};

const colors = {
    background: "#15171c",
    text: "#d9dce2",
    muted: "#949aa6",
    checkerDark: "#8a8f99",
    checkerLight: "#c4c8d0",
};

// Sizes in CSS pixels.
const padding = 16;
const titleHeight = 24;
const lineHeight = 16;

// Room below the images for four lines of bytes and the fullscreen button.
const bytesHeight = 4 * lineHeight + 40;

// Draws the panels side by side, each with the bytes R, G, B, A of its patches below, in CSS pixels.
export function draw(context: CanvasRenderingContext2D, scene: InvertScene): void {
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

        // A checkerboard behind the image shows where it is transparent.
        drawCheckerboard(context, left, top, width, height);
        context.drawImage(toCanvas(panel.image), left, top, width, height);

        drawPatchBytes(context, panel.image, scene, left, top + height, scale);
    });
}

// The four bytes of the centre pixel of every patch, below the patch.
function drawPatchBytes(
    context: CanvasRenderingContext2D,
    image: ImageData,
    scene: InvertScene,
    left: number,
    top: number,
    scale: number,
): void {
    const patchWidth = image.width / scene.patchCount;
    const j = image.height - Math.floor(scene.patchHeight / 2);

    context.font = "12px ui-monospace, monospace";
    context.textAlign = "center";
    context.fillStyle = colors.muted;

    for (let k = 0; k < scene.patchCount; k++) {
        const i = Math.floor((k + 0.5) * patchWidth);
        const index = 4 * (j * image.width + i);
        const x = left + (k + 0.5) * patchWidth * scale;

        ["R", "G", "B", "A"].forEach((channel, c) => {
            const y = top + 14 + lineHeight * c;
            context.fillText(`${channel} ${image.data[index + c]}`, x, y);
        });
    }
}

function drawCheckerboard(
    context: CanvasRenderingContext2D,
    left: number,
    top: number,
    width: number,
    height: number,
): void {
    const size = 12;
    for (let y = 0; y < height; y += size) {
        for (let x = 0; x < width; x += size) {
            const dark = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0;
            context.fillStyle = dark ? colors.checkerDark : colors.checkerLight;
            context.fillRect(
                left + x,
                top + y,
                Math.min(size, width - x),
                Math.min(size, height - y),
            );
        }
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
