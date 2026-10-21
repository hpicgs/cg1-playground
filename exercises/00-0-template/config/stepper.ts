/** Step-throughs of this exercise, by the name used in `\stepper{name}`. */
export const steppers: Record<string, (element: HTMLElement) => void> = {
    line: lineStepper,
};

/** One state of the Bresenham loop. */
type Step = { x: number; y: number; d: number };

/**
 * Walks through Bresenham's algorithm for one fixed line, one pixel per step.
 *
 * @param element - The `.stepper` placeholder written by `markdown.ts`.
 */
function lineStepper(element: HTMLElement): void {
    // A line with slope between 0 and 1, so x advances in every step.
    const x0 = 1;
    const y0 = 1;
    const x1 = 14;
    const y1 = 6;
    const dx = x1 - x0;
    const dy = y1 - y0;

    // Record every step with its decision variable d.
    const steps: Step[] = [];
    let d = 2 * dy - dx;
    let y = y0;
    for (let x = x0; x <= x1; x++) {
        steps.push({ x, y, d });
        if (d > 0) {
            y += 1;
            d += 2 * (dy - dx);
        } else {
            d += 2 * dy;
        }
    }

    // Canvas and buttons.
    const canvas = document.createElement("canvas");
    const back = document.createElement("button");
    back.textContent = "Zurück";
    const next = document.createElement("button");
    next.textContent = "Weiter";
    const bar = document.createElement("div");
    bar.className = "stepper-bar";
    bar.append(back, next);

    // The current step as a table: each value under a label that says what it means.
    const state = document.createElement("table");
    state.className = "stepper-state";
    state.innerHTML = `
        <tr><th>Schritt</th><th>x (Spalte)</th><th>y (Zeile)</th><th>d (Entscheidungsvariable)</th></tr>
        <tr><td></td><td></td><td></td><td></td></tr>`;
    const cells = state.querySelectorAll("td");
    element.append(canvas, bar, state);

    let current = 0;
    back.addEventListener("click", () => {
        current = Math.max(0, current - 1);
        draw();
    });
    next.addEventListener("click", () => {
        current = Math.min(steps.length - 1, current + 1);
        draw();
    });
    window.addEventListener("resize", draw);

    function draw(): void {
        const context = canvas.getContext("2d");
        if (context === null) {
            return;
        }
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(canvas.clientWidth * dpr);
        canvas.height = Math.floor(canvas.clientHeight * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const columns = 16;
        const rows = 8;
        const cell = canvas.clientWidth / columns;
        context.fillStyle = "#15171c";
        context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

        // Pixels set so far; the current one is highlighted.
        steps.slice(0, current + 1).forEach((step, index) => {
            context.fillStyle = index === current ? "#e0905c" : "#5c9ded";
            context.fillRect(step.x * cell, (rows - 1 - step.y) * cell, cell, cell);
        });

        context.strokeStyle = "#2e333d";
        context.beginPath();
        for (let column = 0; column <= columns; column++) {
            context.moveTo(column * cell, 0);
            context.lineTo(column * cell, rows * cell);
        }
        for (let row = 0; row <= rows; row++) {
            context.moveTo(0, row * cell);
            context.lineTo(columns * cell, row * cell);
        }
        context.stroke();

        // The exact line through the pixel centres.
        context.strokeStyle = "#d9dce2";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo((x0 + 0.5) * cell, (rows - 0.5 - y0) * cell);
        context.lineTo((x1 + 0.5) * cell, (rows - 0.5 - y1) * cell);
        context.stroke();
        context.lineWidth = 1;

        const step = steps[current];
        cells[0].textContent = `${current + 1} von ${steps.length}`;
        cells[1].textContent = String(step.x);
        cells[2].textContent = String(step.y);
        cells[3].textContent = String(step.d);
        back.disabled = current === 0;
        next.disabled = current === steps.length - 1;
    }

    draw();
}
