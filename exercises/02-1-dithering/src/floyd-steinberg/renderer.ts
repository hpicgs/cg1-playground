// Where a raster goes on the canvas, in device pixels: its top left corner, its size in raster
// pixels, and the size of one raster pixel.
export type Place = {
    left: number;
    top: number;
    columns: number;
    rows: number;
    pixelSize: number;
};

// The places of the four rasters, and the free column on the right below the controls.
export type Layout = {
    dpr: number;
    inputPhoto: Place;
    outputPhoto: Place;
    inputRamp: Place;
    outputRamp: Place;
    side: { left: number; top: number; width: number };
};

export type FloydSteinbergScene = {
    photo: ImageData;
    photoOutput: Float32Array;
    ramp: Float32Array;
    rampOutput: Float32Array;
    testGray: Float32Array;
    testOutput: Float32Array;
};

const colors = {
    background: "#15171c",
    text: "#d9dce2",
    muted: "#949aa6",
    grid: "#2e333d",
};

// Fits input and output side by side, each with the photo above the ramp. The column on the
// right keeps the top right corner free for the controls.
export function layout(
    canvasWidth: number,
    canvasHeight: number,
    pixelSize: number,
    aspect: number,
): Layout {
    const dpr = window.devicePixelRatio || 1;
    const padding = Math.round(14 * dpr);
    const titleHeight = Math.round(24 * dpr);

    // The side column, below the controls.
    const sideWidth = Math.max(Math.round(270 * dpr), Math.round(canvasWidth * 0.24));
    const sideTop = Math.round(140 * dpr);

    // Input and output share the rest of the width.
    const columnWidth = Math.floor((canvasWidth - sideWidth - 4 * padding) / 2);

    // The ramp takes about an eighth of the height, in whole multiples of 8 rows.
    const rampRows = Math.max(8, 8 * Math.round((canvasHeight * 0.12) / pixelSize / 8));

    // The photo gets as many columns as fit, both into the column and into the height left.
    const photoSpace = canvasHeight - 3 * padding - titleHeight - rampRows * pixelSize;
    const columnsByWidth = Math.floor(columnWidth / pixelSize);
    const columnsByHeight = Math.floor(photoSpace / (pixelSize * aspect));
    const columns = Math.max(8, Math.min(columnsByWidth, columnsByHeight));
    const photoRows = Math.round(columns * aspect);

    // Positions: both rasters are centred in their column.
    const margin = Math.floor((columnWidth - columns * pixelSize) / 2);
    const inputLeft = padding + margin;
    const outputLeft = 2 * padding + columnWidth + margin;
    const photoTop = padding + titleHeight;
    const rampTop = photoTop + photoRows * pixelSize + Math.round(padding / 2);

    return {
        dpr,
        inputPhoto: { left: inputLeft, top: photoTop, columns, rows: photoRows, pixelSize },
        outputPhoto: { left: outputLeft, top: photoTop, columns, rows: photoRows, pixelSize },
        inputRamp: { left: inputLeft, top: rampTop, columns, rows: rampRows, pixelSize },
        outputRamp: { left: outputLeft, top: rampTop, columns, rows: rampRows, pixelSize },
        side: { left: 3 * padding + 2 * columnWidth, top: sideTop, width: sideWidth - padding },
    };
}

// Draws input and output, each as photo and ramp, in device pixels.
// On the right, below the controls, it shows the test raster.
export function draw(
    context: CanvasRenderingContext2D,
    layout: Layout,
    scene: FloydSteinbergScene,
): void {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = colors.background;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    drawTitle(context, "Eingabe", layout.inputPhoto, layout.dpr);
    drawTitle(context, "Ausgabe", layout.outputPhoto, layout.dpr);

    drawImage(context, scene.photo, layout.inputPhoto);
    drawRaster(context, scene.photoOutput, layout.outputPhoto);
    drawRaster(context, scene.ramp, layout.inputRamp);
    drawRaster(context, scene.rampOutput, layout.outputRamp);

    drawTestRaster(context, scene.testGray, scene.testOutput, layout);
}

// A title above a raster.
function drawTitle(
    context: CanvasRenderingContext2D,
    text: string,
    place: Place,
    dpr: number,
): void {
    context.font = `${15 * dpr}px system-ui, sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillStyle = colors.text;
    context.fillText(text, place.left, place.top - 24 * dpr);
}

// Draws an image pixel by pixel, without smoothing.
function drawImage(context: CanvasRenderingContext2D, image: ImageData, place: Place): void {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d")?.putImageData(image, 0, 0);

    context.imageSmoothingEnabled = false;
    context.drawImage(
        canvas,
        place.left,
        place.top,
        place.columns * place.pixelSize,
        place.rows * place.pixelSize,
    );
}

// Draws values in [0, 1] as gray pixels, without smoothing. Each pixel is black with opacity
// 1 - v on a white background, so 0 is black and 1 is white.
function drawRaster(context: CanvasRenderingContext2D, values: Float32Array, place: Place): void {
    const image = new ImageData(place.columns, place.rows);
    for (let k = 0; k < place.columns * place.rows; k++) {
        image.data[4 * k + 3] = 255 * (1 - values[k]);
    }

    context.fillStyle = "#ffffff";
    context.fillRect(
        place.left,
        place.top,
        place.columns * place.pixelSize,
        place.rows * place.pixelSize,
    );
    drawImage(context, image, place);
}

// The test raster: each cell is filled with its output and shows the value it had when it was
// processed.
function drawTestRaster(
    context: CanvasRenderingContext2D,
    values: Float32Array,
    output: Float32Array,
    layout: Layout,
): void {
    const { side, dpr } = layout;
    const labelSize = 34 * dpr;
    const cell = Math.min((side.width - labelSize) / 4, 64 * dpr);
    const gridLeft = side.left + labelSize;
    const gridTop = side.top + 24 * dpr + labelSize;

    // Title.
    context.font = `${15 * dpr}px system-ui, sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillStyle = colors.text;
    context.fillText("Testraster 4 × 4", side.left, side.top);

    // Column numbers i and row numbers j.
    context.font = `${13 * dpr}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = colors.muted;
    for (let n = 0; n < 4; n++) {
        context.fillText(`${n}`, gridLeft + (n + 0.5) * cell, gridTop - labelSize / 2);
        context.fillText(`${n}`, gridLeft - labelSize / 2, gridTop + (n + 0.5) * cell);
    }
    context.fillText("j \\ i", gridLeft - labelSize / 2, gridTop - labelSize / 2);

    // Cells: colour from the output, number from the value at the visit.
    context.font = `${13 * dpr}px ui-monospace, monospace`;
    for (let j = 0; j < 4; j++) {
        for (let i = 0; i < 4; i++) {
            const left = gridLeft + i * cell;
            const top = gridTop + j * cell;
            const brightness = Math.round(255 * Math.min(Math.max(output[j * 4 + i], 0), 1));

            context.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
            context.fillRect(left, top, cell, cell);
            context.strokeStyle = colors.grid;
            context.lineWidth = dpr;
            context.strokeRect(left, top, cell, cell);

            context.fillStyle = brightness > 128 ? colors.background : colors.text;
            context.fillText(values[j * 4 + i].toFixed(3), left + cell / 2, top + cell / 2);
        }
    }

    // Legend.
    const legendTop = gridTop + 4 * cell + 10 * dpr;
    context.font = `${12 * dpr}px system-ui, sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillStyle = colors.muted;
    context.fillText("Zahl: Wert beim Besuch", side.left, legendTop);
    context.fillText("Farbe: Ergebnis", side.left, legendTop + 18 * dpr);
}
