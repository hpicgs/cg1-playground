import GUI from "lil-gui";
import * as renderer from "./renderer";

const params = {
    maxIterations: 100,
    insideColor: [0, 0, 0],
};

// The smallest section the canvas shows: x from -2.2 on, y around 0. The whole set lies in its
// left part, and the right part stays free for the controls.
const xmin = -2.2;
const minWidth = 4;
const minHeight = 2.6;

let canvas: HTMLCanvasElement;

export function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): void {
    canvas = element;
    const gl = renderer.init(canvas, sources);

    const gui = new GUI({ container: controls, title: "Mandelbrot-Menge" });
    gui.add(params, "maxIterations", 1, 1000, 1).name("Iterationen N");
    gui.addColor(params, "insideColor").name("Farbe innen");
    gui.onChange(draw);

    // Keep the drawing buffer at the canvas's displayed size (in device pixels).
    function resize(): void {
        const dpr = window.devicePixelRatio || 1;
        const w = Math.floor(canvas.clientWidth * dpr);
        const h = Math.floor(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
            draw();
        }
    }
    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", resize);
    resize();
}

export function rebuild(sources: Record<string, string>): void {
    renderer.setShaders(sources);
    draw();
}

// The section for the current canvas: at least minWidth × minHeight, with the same unit on both
// axes, so a wider canvas shows more to the right and a taller canvas more above and below.
function section(): renderer.Section {
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const width = Math.max(minWidth, minHeight * aspect);
    const height = width / aspect;
    return { xmin, xmax: xmin + width, ymin: -height / 2, ymax: height / 2 };
}

function draw(): void {
    renderer.draw({
        section: section(),
        maxIterations: params.maxIterations,
        insideColor: params.insideColor,
    });
}
