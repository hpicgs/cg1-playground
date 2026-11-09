/** Step-throughs of this exercise, by the name used in `\stepper{name}`. */
export const steppers: Record<string, (element: HTMLElement) => void> = {
    circle: circleStepper,
};

/** Width and height of the raster in pixels. */
const columns = 14;
const rows = 12;

/** The circle: centre M = (xm, ym) and radius r, in pixel coordinates with y down. */
const xm = 7;
const ym = 6;
const r = 5;

/** The square around the circle, from (left, top) to (right, bottom). */
const left = xm - r;
const top = ym - r;
const right = xm + r;
const bottom = ym + r;

/** Milliseconds between two steps while playing. */
const playInterval = 100;

const colors = {
    background: "#15171c",
    empty: "#1d2027",
    grid: "#2e333d",
    fragment: "#3a3f4b",
    kept: "#5c9ded",
    discarded: "#4a2d33",
    current: "#e0905c",
    centre: "#73798a",
    shape: "#d9dce2",
    text: "#d9dce2",
    muted: "#9aa0ad",
};

/** One fragment of the square: its pixel (i, j) and F at its pixel centre. */
type Fragment = { i: number; j: number; f: number };

/**
 * Walks through the fragment shader that cuts a circle out of a square. Step 0 shows the square
 * and the circle, step 1 the fragments of the square, and every further step runs the fragment
 * shader for one fragment: it computes F at the pixel centre and discards the fragment if F > 0.
 *
 * @param element - The `.stepper` placeholder written by `markdown.ts`.
 */
function circleStepper(element: HTMLElement): void {
    // The fragments of the square, row by row.
    const fragments: Fragment[] = [];
    for (let j = top; j < bottom; j++) {
        for (let i = left; i < right; i++) {
            const x = i + 0.5;
            const y = j + 0.5;
            fragments.push({ i, j, f: (x - xm) ** 2 + (y - ym) ** 2 - r ** 2 });
        }
    }
    const total = fragments.length + 1;

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
        <tr><th>Schritt</th><th>Fragment-Shader-Aufrufe</th><th>verworfen</th><th>gesetzte Pixel</th></tr>
        <tr><td></td><td></td><td></td><td></td></tr>`;
    const cells = state.querySelectorAll("td");
    element.append(canvas, bar, state);

    // Step 0 is the start, step 1 the rasterized square, step k + 2 runs the fragment shader for
    // fragment k.
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

        // The raster on the left, the computation for the current fragment on the right.
        const padding = 16;
        const cell = (height - 2 * padding) / rows;
        if (cell <= 0) {
            return;
        }
        const x0 = padding;
        const y0 = padding;

        // Fragments run so far, the one running now included.
        const done = Math.max(0, current - 1);
        const running = current >= 2 ? fragments[current - 2] : undefined;
        for (let j = 0; j < rows; j++) {
            for (let i = 0; i < columns; i++) {
                context.fillStyle = colors.empty;
                context.fillRect(x0 + i * cell, y0 + j * cell, cell, cell);
            }
        }
        if (current >= 1) {
            fragments.forEach((fragment, k) => {
                let color = colors.fragment;
                if (k < done) {
                    color = fragment.f > 0 ? colors.discarded : colors.kept;
                }
                if (fragment === running) {
                    color = colors.current;
                }
                context.fillStyle = color;
                context.fillRect(x0 + fragment.i * cell, y0 + fragment.j * cell, cell, cell);
            });
        }

        // Grid lines and pixel centres.
        context.strokeStyle = colors.grid;
        context.lineWidth = 1;
        context.beginPath();
        for (let i = 0; i <= columns; i++) {
            context.moveTo(x0 + i * cell, y0);
            context.lineTo(x0 + i * cell, y0 + rows * cell);
        }
        for (let j = 0; j <= rows; j++) {
            context.moveTo(x0, y0 + j * cell);
            context.lineTo(x0 + columns * cell, y0 + j * cell);
        }
        context.stroke();
        context.fillStyle = colors.centre;
        for (let j = 0; j < rows; j++) {
            for (let i = 0; i < columns; i++) {
                context.beginPath();
                context.arc(x0 + (i + 0.5) * cell, y0 + (j + 0.5) * cell, 1.5, 0, 2 * Math.PI);
                context.fill();
            }
        }

        // The square as two triangles, the exact circle and its centre M.
        context.strokeStyle = colors.shape;
        context.lineWidth = 2;
        context.strokeRect(x0 + left * cell, y0 + top * cell, 2 * r * cell, 2 * r * cell);
        context.beginPath();
        context.moveTo(x0 + left * cell, y0 + top * cell);
        context.lineTo(x0 + right * cell, y0 + bottom * cell);
        context.stroke();
        context.beginPath();
        context.arc(x0 + xm * cell, y0 + ym * cell, r * cell, 0, 2 * Math.PI);
        context.stroke();
        context.fillStyle = colors.shape;
        context.beginPath();
        context.arc(x0 + xm * cell, y0 + ym * cell, 3, 0, 2 * Math.PI);
        context.fill();
        context.lineWidth = 1;

        drawText(context, running, x0 + columns * cell + 2 * padding, y0);

        const discarded = fragments.slice(0, done).filter((fragment) => fragment.f > 0).length;
        cells[0].textContent = `${current} von ${total}`;
        cells[1].textContent = String(done);
        cells[2].textContent = String(discarded);
        cells[3].textContent = String(done - discarded);
        back.disabled = current === 0;
        next.disabled = current === total;
    }

    // What happens in the current step, as lines of text.
    function drawText(
        context: CanvasRenderingContext2D,
        fragment: Fragment | undefined,
        x: number,
        y: number,
    ): void {
        const lines: string[] = [];
        if (current === 0) {
            lines.push(
                "Ein Quadrat aus zwei Dreiecken",
                `um den Kreis mit M = (${xm}, ${ym}), r = ${r}.`,
            );
        } else if (fragment === undefined) {
            lines.push(
                "Die GPU rasterisiert beide Dreiecke:",
                `${fragments.length} Fragmente, eines pro Pixelzentrum im Quadrat.`,
            );
        } else {
            const px = fragment.i + 0.5;
            const py = fragment.j + 0.5;
            lines.push(
                `Fragment-Shader für Pixel (${fragment.i}, ${fragment.j})`,
                `Pixelzentrum (x, y) = (${px}, ${py})`,
                "",
                "F(x, y) = (x − xₘ)² + (y − yₘ)² − r²",
                `        = ${(px - xm) ** 2} + ${(py - ym) ** 2} − ${r ** 2}`,
                `        = ${String(fragment.f).replace("-", "−")}`,
                "",
                fragment.f > 0 ? "F > 0: außerhalb, discard" : "F < 0: innen, Farbe schreiben",
            );
        }
        context.font = "13px ui-monospace, monospace";
        context.textAlign = "left";
        context.textBaseline = "top";
        lines.forEach((line, k) => {
            context.fillStyle = k === 0 || k === lines.length - 1 ? colors.text : colors.muted;
            context.fillText(line, x, y + k * 20);
        });
    }

    draw();
}
