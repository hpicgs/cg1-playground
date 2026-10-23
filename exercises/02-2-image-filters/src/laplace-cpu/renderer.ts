// What the demo shows: the filtered photo and the filtered test image.
export type Scene = {
    photo: ImageData;
    test: ImageData;
};

const colors = {
    background: "#15171c",
    muted: "#949aa6",
    grid: "#15171c",
};

// Sizes in CSS pixels: the margin, and the column on the right with the controls on top and
// the test image below them.
const padding = 16;
const sideWidth = 245;
const controlsHeight = 95;

// Room for the column numbers i above the test image and the row numbers j on its left.
const labelSize = 18;

// Draws the photo as large as possible on the left and the test image with its bytes in the
// side column, in CSS pixels.
export function draw(context: CanvasRenderingContext2D, scene: Scene): void {
    const canvasWidth = context.canvas.clientWidth;
    const canvasHeight = context.canvas.clientHeight;

    context.fillStyle = colors.background;
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    // The photo, scaled without smoothing, so its pixels look like on the GPU.
    const photo = scene.photo;
    const scale = Math.min(
        (canvasWidth - sideWidth - 3 * padding) / photo.width,
        (canvasHeight - 2 * padding) / photo.height,
    );
    context.imageSmoothingEnabled = false;
    context.drawImage(toCanvas(photo), padding, padding, photo.width * scale, photo.height * scale);

    // The test image below the controls.
    const sideLeft = canvasWidth - padding / 2 - sideWidth;
    const cellSize = Math.floor((sideWidth - labelSize) / scene.test.width);
    drawTestImage(context, scene.test, sideLeft, controlsHeight + padding, cellSize);
}

// The test image as large cells with the column numbers i above and the row numbers j on the
// left. Every cell shows its bytes: one number if R, G and B are equal, otherwise all three.
function drawTestImage(
    context: CanvasRenderingContext2D,
    image: ImageData,
    left: number,
    top: number,
    cellSize: number,
): void {
    const cellsLeft = left + labelSize;
    const cellsTop = top + labelSize;

    context.font = "12px ui-monospace, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = colors.muted;
    for (let i = 0; i < image.width; i++) {
        context.fillText(String(i), cellsLeft + (i + 0.5) * cellSize, top + labelSize / 2);
    }
    for (let j = 0; j < image.height; j++) {
        context.fillText(String(j), left + labelSize / 2, cellsTop + (j + 0.5) * cellSize);
    }

    for (let j = 0; j < image.height; j++) {
        for (let i = 0; i < image.width; i++) {
            const index = 4 * (j * image.width + i);
            const [r, g, b, a] = image.data.slice(index, index + 4);
            const x = cellsLeft + i * cellSize;
            const y = cellsTop + j * cellSize;

            context.fillStyle = `rgb(${r} ${g} ${b} / ${a / 255})`;
            context.fillRect(x, y, cellSize, cellSize);
            context.strokeStyle = colors.grid;
            context.lineWidth = 1;
            context.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);

            const lines = r === g && g === b ? [String(r)] : [`R ${r}`, `G ${g}`, `B ${b}`];
            drawLines(context, lines, x + cellSize / 2, y + cellSize / 2);
        }
    }
}

// Light text with a dark outline, readable on every cell colour, centred at (x, y).
function drawLines(context: CanvasRenderingContext2D, lines: string[], x: number, y: number): void {
    const lineHeight = 14;
    context.font = "12px ui-monospace, monospace";
    context.lineWidth = 2.5;
    context.lineJoin = "round";
    context.strokeStyle = "#000";
    context.fillStyle = "#fff";
    lines.forEach((line, k) => {
        const lineY = y + (k - (lines.length - 1) / 2) * lineHeight;
        context.strokeText(line, x, lineY);
        context.fillText(line, x, lineY);
    });
}

// An offscreen canvas that holds the image, so it can be drawn scaled.
function toCanvas(image: ImageData): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d")?.putImageData(image, 0, 0);
    return canvas;
}
