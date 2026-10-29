// What the mouse is over: a pixel of the image or a byte of the table.
export type Hit = { kind: "pixel"; i: number; j: number } | { kind: "byte"; index: number };

export type PixelIndexScene = {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    hovered: Hit | null;
};

const channels = ["R", "G", "B", "A"];

const colors = {
    background: "#15171c",
    text: "#d9dce2",
    muted: "#949aa6",
    byte: "#1d2027",
    byteOfPixel: "#3a3f4a",
    accent: "#e0905c",
};

// Space around the table and between its rows, in CSS pixels.
const padding = 16;
const rowGap = 4;
const rowLabelWidth = 48;

// Positions in CSS pixels: the magnified image at the top, the byte table at the bottom.
type Layout = {
    imageLeft: number;
    imageTop: number;
    cell: number;
    tableLeft: number;
    tableTop: number;
    box: number;
    boxHeight: number;
};

function layout(context: CanvasRenderingContext2D, width: number, height: number): Layout {
    const canvasWidth = context.canvas.clientWidth;
    const canvasHeight = context.canvas.clientHeight;

    // The table spans the full width and leaves room for the fullscreen button below it.
    const box = (canvasWidth - 2 * padding - rowLabelWidth) / (4 * width);
    const boxHeight = Math.min(box * 0.8, 28);
    const tableTop = canvasHeight - 3 * padding - height * (boxHeight + rowGap);

    // The image is centred above the table.
    const cell = Math.min((canvasWidth * 0.5) / width, (tableTop - 5 * padding - 24) / height);
    const imageLeft = (canvasWidth - width * cell) / 2;

    return {
        imageLeft,
        imageTop: padding + 22,
        cell,
        tableLeft: padding + rowLabelWidth,
        tableTop,
        box,
        boxHeight,
    };
}

// Draws the magnified image and its bytes, one image row per table row, in CSS pixels.
// The pixel or byte under the mouse is highlighted together with its counterpart.
export function draw(context: CanvasRenderingContext2D, scene: PixelIndexScene): void {
    const positions = layout(context, scene.width, scene.height);

    // The hovered pixel, and the hovered byte if the mouse is over the table.
    let pixel = -1;
    let index = -1;
    if (scene.hovered?.kind === "pixel") {
        pixel = scene.hovered.j * scene.width + scene.hovered.i;
    } else if (scene.hovered?.kind === "byte") {
        index = scene.hovered.index;
        pixel = Math.floor(index / 4);
    }

    context.fillStyle = colors.background;
    context.fillRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);

    drawImage(context, scene, positions, pixel);
    drawTable(context, scene, positions, pixel, index);
    if (pixel >= 0) {
        drawHoverLabel(context, scene.width, positions, pixel, index);
    }
}

// The test image, magnified, with column and row numbers.
function drawImage(
    context: CanvasRenderingContext2D,
    scene: PixelIndexScene,
    positions: Layout,
    pixel: number,
): void {
    const { data, width, height } = scene;
    const { imageLeft, imageTop, cell } = positions;

    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            const k = 4 * (j * width + i);
            const alpha = data[k + 3] / 255;

            context.fillStyle = colors.byteOfPixel;
            context.fillRect(imageLeft + i * cell, imageTop + j * cell, cell, cell);
            context.fillStyle = `rgba(${data[k]}, ${data[k + 1]}, ${data[k + 2]}, ${alpha})`;
            context.fillRect(imageLeft + i * cell, imageTop + j * cell, cell, cell);
        }
    }

    context.font = "14px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = colors.muted;
    for (let i = 0; i < width; i++) {
        context.fillText(`i = ${i}`, imageLeft + (i + 0.5) * cell, imageTop - 11);
    }
    for (let j = 0; j < height; j++) {
        context.fillText(`j = ${j}`, imageLeft - 24, imageTop + (j + 0.5) * cell);
    }

    if (pixel >= 0) {
        const i = pixel % width;
        const j = Math.floor(pixel / width);
        context.strokeStyle = colors.accent;
        context.lineWidth = 3;
        context.strokeRect(imageLeft + i * cell, imageTop + j * cell, cell, cell);
    }
}

// The bytes, one image row per table row, each row labelled with the index of its first byte.
function drawTable(
    context: CanvasRenderingContext2D,
    scene: PixelIndexScene,
    positions: Layout,
    pixel: number,
    index: number,
): void {
    const { data, width, height } = scene;
    const { tableLeft, tableTop, box, boxHeight } = positions;
    const bytesPerRow = 4 * width;

    // Column heads R, G, B, A.
    context.font = "14px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = colors.muted;
    for (let b = 0; b < bytesPerRow; b++) {
        context.fillText(channels[b % 4], tableLeft + (b + 0.5) * box, tableTop - 10);
    }

    context.font = `${Math.min(14, box * 0.38)}px ui-monospace, monospace`;
    for (let j = 0; j < height; j++) {
        const top = tableTop + j * (boxHeight + rowGap);

        context.textAlign = "right";
        context.fillStyle = colors.muted;
        context.fillText(`${bytesPerRow * j}:`, tableLeft - 8, top + boxHeight / 2);

        context.textAlign = "center";
        for (let b = 0; b < bytesPerRow; b++) {
            const k = bytesPerRow * j + b;
            const left = tableLeft + b * box;

            let fill = colors.byte;
            if (k === index) {
                fill = colors.accent;
            } else if (Math.floor(k / 4) === pixel) {
                fill = colors.byteOfPixel;
            }
            context.fillStyle = fill;
            context.fillRect(left + 1, top, box - 2, boxHeight);

            context.fillStyle = k === index ? colors.background : colors.text;
            context.fillText(String(data[k]), left + box / 2, top + boxHeight / 2);
        }
    }
}

// A line above the table with the index of the hovered byte, or the bytes of the hovered pixel.
function drawHoverLabel(
    context: CanvasRenderingContext2D,
    width: number,
    positions: Layout,
    pixel: number,
    index: number,
): void {
    const i = pixel % width;
    const j = Math.floor(pixel / width);

    let text = `Pixel (${i}, ${j}): data[${4 * pixel}] bis data[${4 * pixel + 3}]`;
    if (index >= 0) {
        text = `data[${index}]: Pixel (${i}, ${j}), Kanal ${channels[index % 4]}`;
    }

    context.font = "15px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = colors.text;
    context.fillText(text, context.canvas.clientWidth / 2, positions.tableTop - 34);
}

// The pixel or byte under a point given in CSS pixels, or null.
export function hitTest(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    x: number,
    y: number,
): Hit | null {
    const positions = layout(context, width, height);

    const i = Math.floor((x - positions.imageLeft) / positions.cell);
    const j = Math.floor((y - positions.imageTop) / positions.cell);
    if (i >= 0 && i < width && j >= 0 && j < height) {
        return { kind: "pixel", i, j };
    }

    const b = Math.floor((x - positions.tableLeft) / positions.box);
    const row = Math.floor((y - positions.tableTop) / (positions.boxHeight + rowGap));
    if (b >= 0 && b < 4 * width && row >= 0 && row < height) {
        return { kind: "byte", index: 4 * width * row + b };
    }

    return null;
}
