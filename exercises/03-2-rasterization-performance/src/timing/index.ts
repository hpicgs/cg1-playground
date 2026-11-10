import GUI from "lil-gui";
import * as renderer from "./renderer";

// The raster: rasterSize × rasterSize pixels, independent of the size of the canvas.
const rasterSize = 1024;

// Limits on the work of one measurement: at most this many triangles, and a first measurement
// that takes longer than maxTime milliseconds stops the measuring.
const maxTriangles = 2 ** 25;
const maxTime = 250;

// How long the GPU warms up before measuring, in milliseconds, how many measurements give the
// median, and how long the frame rate is counted.
const warmUpTime = 500;
const sampleCount = 9;
const frameRateTime = 1000;

// Sizes in CSS pixels: the margin around the raster and the column on the right with the
// controls.
const padding = 16;
const sideWidth = 276;

const methods = ["Bildwiederholrate", "Ohne Warten", "Mit readPixels"];
const triangleCounts = [2, 8, 32, 128, 512, 2048, 8192, 32768, 131072];

const settings = {
    method: methods[0],
    squares: 16,
    side: 512,
    triangles: 2,
};

// The values shown read-only.
const readout = {
    fragments: "",
    triangles: "",
    measurement: "–",
    perSquare: "–",
    fps: "–",
    spread: "–",
    timerStep: "",
    status: "",
};

let canvas: HTMLCanvasElement;
let gui: GUI;
let visible = false;
let measured = false;
// Every measurement gets a new number; a measurement whose number is no longer current stops.
let current = 0;
// The smallest step of performance.now() in milliseconds.
let step = 0;

export function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): void {
    canvas = element;
    const gl = renderer.init(canvas, sources, rasterSize);
    step = timerStep();
    readout.timerStep = `${format(step, 3)} ms`;

    gui = new GUI({ container: controls, title: "Zeitmessung", width: 260 });
    gui.add(settings, "method", methods).name("Verfahren");
    gui.add(settings, "squares", 1, 4096, 1).name("Quadrate");
    gui.add(settings, "side", 8, 1024, 8).name("Seitenlänge");
    gui.add(settings, "triangles", triangleCounts).name("Dreiecke pro Quadrat");
    gui.add(readout, "fragments").name("Fragmente").disable();
    gui.add(readout, "triangles").name("Dreiecke").disable();
    gui.add(readout, "measurement").name("Zeit pro Messung").disable();
    gui.add(readout, "perSquare").name("Zeit pro Quadrat").disable();
    gui.add(readout, "fps").name("fps").disable();
    gui.add(readout, "spread").name("Streuung").disable();
    gui.add(readout, "timerStep").name("Zeitauflösung").disable();
    gui.add(readout, "status").name("Status").disable();
    gui.onFinishChange(() => void measure());

    canvas.addEventListener("webglcontextlost", () => {
        current += 1;
        readout.status = "Kontext verloren";
        updateReadout();
    });

    // Keep the drawing buffer at the canvas's displayed size (in device pixels).
    function resize(): void {
        const dpr = window.devicePixelRatio || 1;
        const w = Math.floor(canvas.clientWidth * dpr);
        const h = Math.floor(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
            renderer.showRaster(layout());
        }
    }
    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", resize);
    resize();
    showWork();
}

// The demo measures once it is in view, and stops a running measurement when it leaves the view.
export function setVisible(isVisible: boolean): void {
    visible = isVisible;
    if (visible && !measured) {
        void measure();
    }
    if (!visible && readout.status === "läuft") {
        current += 1;
        measured = false;
        readout.status = "angehalten";
        updateReadout();
    }
}

// Where the raster goes on the canvas, in device pixels: a square left of the controls.
function layout(): renderer.Rect {
    const dpr = window.devicePixelRatio || 1;
    const margin = Math.round(padding * dpr);
    const side = Math.round(sideWidth * dpr);
    const size = Math.min(canvas.width - side - 2 * margin, canvas.height - 2 * margin);
    return {
        left: margin,
        top: Math.round((canvas.height - size) / 2),
        width: size,
        height: size,
    };
}

// The vertex array of one square of the given side in the middle of the raster: a grid of
// cells × cells cells with two triangles each, x and y for each corner.
function squareVertices(side: number, cells: number): Float32Array {
    const vertices: number[] = [];
    const left = (rasterSize - side) / 2;
    const size = side / cells;
    for (let j = 0; j < cells; j++) {
        for (let i = 0; i < cells; i++) {
            const x0 = left + i * size;
            const y0 = left + j * size;
            const x1 = x0 + size;
            const y1 = y0 + size;
            vertices.push(x0, y0, x1, y0, x1, y1);
            vertices.push(x0, y0, x1, y1, x0, y1);
        }
    }
    return new Float32Array(vertices);
}

// Shows how much work one measurement is.
function showWork(): void {
    readout.fragments = (settings.squares * settings.side ** 2).toLocaleString("de-DE");
    readout.triangles = (settings.squares * settings.triangles).toLocaleString("de-DE");
    updateReadout();
}

// The time in milliseconds for drawing the square count times, with or without waiting for
// the GPU.
function timeSquares(count: number, wait: boolean): number {
    const begin = performance.now();
    renderer.drawSquares(count);
    if (wait) {
        renderer.waitForGpu();
    }
    return performance.now() - begin;
}

// Measures the current settings with the chosen method, and stops when the settings change.
async function measure(): Promise<void> {
    current += 1;
    const id = current;
    measured = true;

    renderer.setSquare(squareVertices(settings.side, Math.sqrt(settings.triangles / 2)));
    readout.measurement = "–";
    readout.perSquare = "–";
    readout.fps = "–";
    readout.spread = "–";
    readout.status = "läuft";
    showWork();

    if (settings.squares * settings.triangles > maxTriangles) {
        readout.status = "zu viele Dreiecke";
        updateReadout();
        return;
    }

    // One measurement with readPixels first: if the GPU needs too long, the measuring stops.
    renderer.clear();
    const first = timeSquares(settings.squares, true);
    renderer.showRaster(layout());
    if (renderer.isLost()) {
        readout.status = "Kontext verloren";
    } else if (first > maxTime) {
        readout.status = "zu viel Arbeit";
    } else if (settings.method === "Bildwiederholrate") {
        await measureFrameRate(id);
    } else {
        await measureTimes(id, settings.method === "Mit readPixels");
    }
    updateReadout();
}

// Draws the squares once per animation frame for a while and counts the frames per second.
async function measureFrameRate(id: number): Promise<void> {
    const stamps: number[] = [];
    while (stamps.length < 2 || stamps[stamps.length - 1] - stamps[0] < frameRateTime) {
        stamps.push(await nextFrame());
        if (id !== current) {
            return;
        }
        renderer.drawSquares(settings.squares);
        renderer.showRaster(layout());
    }
    const seconds = (stamps[stamps.length - 1] - stamps[0]) / 1000;
    const fps = (stamps.length - 1) / seconds;
    readout.fps = format(fps, 1);
    readout.measurement = `${format(1000 / fps, 2)} ms`;
    readout.perSquare = `${format((1000 * 1000) / fps / settings.squares, 2)} us`;
    readout.status = isLostOr("fertig");
}

// Warms the GPU up, then measures several times, one measurement per animation frame, and
// subtracts the median of empty measurements (no squares, only the wait).
async function measureTimes(id: number, wait: boolean): Promise<void> {
    const begin = performance.now();
    while (performance.now() - begin < warmUpTime) {
        timeSquares(settings.squares, wait);
        renderer.waitForGpu();
        await nextFrame();
        if (id !== current) {
            return;
        }
    }

    const times: number[] = [];
    const emptyTimes: number[] = [];
    for (let k = 0; k < sampleCount; k++) {
        times.push(timeSquares(settings.squares, wait));
        // Without waiting, the GPU still finishes here, outside the measured time.
        renderer.waitForGpu();
        emptyTimes.push(timeSquares(0, wait));
        await nextFrame();
        if (id !== current) {
            return;
        }
    }
    renderer.showRaster(layout());

    // Times below the timer's step are not measurable; neither is a difference that is not
    // positive.
    const time = median(times);
    const perSquare = (time - median(emptyTimes)) / settings.squares;
    readout.measurement = time < step ? `unter ${format(step, 1)} ms` : `${format(time, 2)} ms`;
    readout.perSquare = perSquare > 0 ? `${format(1000 * perSquare, 2)} us` : "–";
    const spread = (100 * (Math.max(...times) - Math.min(...times))) / time;
    readout.spread = Number.isFinite(spread) ? `${format(spread, 0)} %` : "–";
    readout.status = isLostOr("fertig");
}

// The time stamp of the next animation frame.
function nextFrame(): Promise<number> {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

// The smallest step of performance.now() in milliseconds.
function timerStep(): number {
    let smallest = Infinity;
    let last = performance.now();
    for (let steps = 0; steps < 10;) {
        const now = performance.now();
        if (now !== last) {
            smallest = Math.min(smallest, now - last);
            last = now;
            steps += 1;
        }
    }
    return smallest;
}

function isLostOr(status: string): string {
    return renderer.isLost() ? "Kontext verloren" : status;
}

function format(value: number, digits: number): string {
    if (!Number.isFinite(value)) {
        return "–";
    }
    return value.toLocaleString("de-DE", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}

function updateReadout(): void {
    for (const controller of gui.controllersRecursive()) {
        controller.updateDisplay();
    }
}
