/** Step-throughs of this exercise, by the name used in `\stepper{name}`. */
export const steppers: Record<string, (element: HTMLElement) => void> = {
    "cpu-gpu": cpuGpuStepper,
};

/** Width and height of the raster in pixels. */
const columns = 6;
const rows = 4;

/** Milliseconds between two steps while playing. */
const playInterval = 500;

const colors = {
    background: "#15171c",
    empty: "#1d2027",
    grid: "#2e333d",
    done: "#5c9ded",
    current: "#e0905c",
    neighbourhood: "#d9dce2",
    neighbourhoods: "rgb(217 220 226 / 0.45)",
    text: "#d9dce2",
};

/**
 * Compares the order in which CPU and GPU compute a box filter with r = 1. Every pixel takes
 * two steps: one reads its neighbourhood, the next writes the result. The CPU does this for one
 * pixel after the other, the GPU for all pixels at once. Shows which pixels are done, not their
 * values.
 *
 * @param element - The `.stepper` placeholder written by `markdown.ts`.
 */
function cpuGpuStepper(element: HTMLElement): void {
    const pixels = columns * rows;
    const total = 2 * pixels;

    // Canvas and buttons.
    const canvas = document.createElement("canvas");
    const back = document.createElement("button");
    back.textContent = "Zurück";
    const next = document.createElement("button");
    next.textContent = "Weiter";
    const play = document.createElement("button");
    play.textContent = "Abspielen";
    const bar = document.createElement("div");
    bar.className = "stepper-bar";
    bar.append(back, next, play);

    // The current step as a table.
    const state = document.createElement("table");
    state.className = "stepper-state";
    state.innerHTML = `
        <tr><th>Schritt</th><th>CPU: fertige Pixel</th><th>GPU: fertige Pixel</th></tr>
        <tr><td></td><td></td><td></td></tr>`;
    const cells = state.querySelectorAll("td");
    element.append(canvas, bar, state);

    // Step 0 is the start. On the CPU, step 2p + 1 reads the neighbourhood of pixel p and
    // step 2p + 2 writes its result.
    let current = 0;
    let timer: number | undefined;

    back.addEventListener("click", () => {
        stop();
        current = Math.max(0, current - 1);
        draw();
    });
    next.addEventListener("click", () => {
        stop();
        current = Math.min(total, current + 1);
        draw();
    });
    play.addEventListener("click", () => {
        if (timer !== undefined) {
            stop();
            return;
        }
        if (current === total) {
            current = 0;
        }
        play.textContent = "Anhalten";
        timer = window.setInterval(() => {
            current += 1;
            if (current === total) {
                stop();
            }
            draw();
        }, playInterval);
        draw();
    });
    window.addEventListener("resize", draw);

    function stop(): void {
        window.clearInterval(timer);
        timer = undefined;
        play.textContent = "Abspielen";
    }

    function draw(): void {
        const context = canvas.getContext("2d");
        if (context === null) {
            return;
        }
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(canvas.clientWidth * dpr);
        canvas.height = Math.floor(canvas.clientHeight * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        context.fillStyle = colors.background;
        context.fillRect(0, 0, width, height);

        // Two rasters side by side, with a title above each.
        const padding = 16;
        const titleHeight = 28;
        const cell = Math.min(
            (width - 3 * padding) / 2 / columns,
            (height - 2 * padding - titleHeight) / rows,
        );
        const top = padding + titleHeight;
        const cpuLeft = padding;
        const gpuLeft = width / 2 + padding / 2;

        // CPU: the pixel being computed and how many are finished.
        const cpuPixel = Math.floor((current - 1) / 2);
        const cpuReading = current > 0 && (current - 1) % 2 === 0;
        const cpuDone = cpuReading ? cpuPixel : Math.floor(current / 2);
        drawTitle(context, "CPU: ein Pixel nach dem anderen", cpuLeft, padding);
        drawRaster(context, cpuLeft, top, cell, (index) => {
            if (index < cpuDone) {
                return colors.done;
            }
            return cpuReading && index === cpuPixel ? colors.current : colors.empty;
        });
        if (cpuReading) {
            drawNeighbourhood(
                context,
                cpuLeft,
                top,
                cell,
                cpuPixel % columns,
                Math.floor(cpuPixel / columns),
                colors.neighbourhood,
            );
        }

        // GPU: in the first step every pixel reads its neighbourhood at the same time, in the
        // second step all results are written.
        const gpuReading = current === 1;
        const gpuDone = current >= 2 ? pixels : 0;
        drawTitle(context, "GPU: alle Pixel zugleich", gpuLeft, padding);
        drawRaster(context, gpuLeft, top, cell, () => {
            if (gpuDone > 0) {
                return colors.done;
            }
            return gpuReading ? colors.current : colors.empty;
        });
        if (gpuReading) {
            for (let j = 0; j < rows; j++) {
                for (let i = 0; i < columns; i++) {
                    drawNeighbourhood(context, gpuLeft, top, cell, i, j, colors.neighbourhoods);
                }
            }
        }

        cells[0].textContent = `${current} von ${total}`;
        cells[1].textContent = `${cpuDone} von ${pixels}`;
        cells[2].textContent = `${gpuDone} von ${pixels}`;
        back.disabled = current === 0;
        next.disabled = current === total;
    }

    draw();
}

function drawTitle(
    context: CanvasRenderingContext2D,
    title: string,
    left: number,
    top: number,
): void {
    context.font = "15px system-ui, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillStyle = colors.text;
    context.fillText(title, left, top + 10);
}

/** Draws the raster with one colour per pixel, chosen by its index in scanline order. */
function drawRaster(
    context: CanvasRenderingContext2D,
    left: number,
    top: number,
    cell: number,
    colorOf: (index: number) => string,
): void {
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < columns; i++) {
            context.fillStyle = colorOf(j * columns + i);
            context.fillRect(left + i * cell, top + j * cell, cell, cell);
            context.strokeStyle = colors.grid;
            context.strokeRect(left + i * cell + 0.5, top + j * cell + 0.5, cell - 1, cell - 1);
        }
    }
}

/**
 * Outlines the 3 × 3 neighbourhood of pixel (i, j) that the box filter reads, cut at the border.
 * The outline lies a little inside the cells, so that overlapping outlines stay apart.
 */
function drawNeighbourhood(
    context: CanvasRenderingContext2D,
    left: number,
    top: number,
    cell: number,
    i: number,
    j: number,
    color: string,
): void {
    const inset = cell / 10;
    const i0 = Math.max(0, i - 1);
    const j0 = Math.max(0, j - 1);
    const i1 = Math.min(columns - 1, i + 1);
    const j1 = Math.min(rows - 1, j + 1);
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.strokeRect(
        left + i0 * cell + inset,
        top + j0 * cell + inset,
        (i1 - i0 + 1) * cell - 2 * inset,
        (j1 - j0 + 1) * cell - 2 * inset,
    );
    context.lineWidth = 1;
}
