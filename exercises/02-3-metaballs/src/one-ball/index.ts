import GUI from "lil-gui";
import { createBalls, moveBalls, type Ball } from "./balls";
import * as renderer from "./renderer";

const params = {
    lambda: 1,
    threshold: 1,
    insideColor: [1, 1, 1],
    outsideColor: [0.08, 0.09, 0.11],
    speed: 1,
};

let canvas: HTMLCanvasElement;
let balls: Ball[];
let visible = false;
let animating = false;

export function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): void {
    canvas = element;
    const gl = renderer.init(canvas, sources);
    balls = createBalls(1, domainWidth());

    const gui = new GUI({ container: controls, title: "Ein Ball" });
    gui.add(params, "lambda", 0.05, 2, 0.01).name("Radiusfaktor λ");
    gui.add(params, "threshold").step(0.01).name("Schwellwert T");
    gui.addColor(params, "insideColor").name("Farbe innen");
    gui.addColor(params, "outsideColor").name("Farbe außen");
    gui.add(params, "speed", 0, 2, 0.1).name("Geschwindigkeit");
    gui.onChange(() => {
        draw();
        animate();
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

// Called by the page when the demo scrolls in or out of view.
export function setVisible(isVisible: boolean): void {
    visible = isVisible;
    animate();
}

// The width of the domain in which the balls move, in units of its height.
function domainWidth(): number {
    return canvas.clientWidth / canvas.clientHeight;
}

function draw(): void {
    renderer.draw({
        ball: balls[0],
        lambda: params.lambda,
        threshold: params.threshold,
        insideColor: params.insideColor,
        outsideColor: params.outsideColor,
    });
}

// Moves the balls while the speed is above zero and the demo is in view.
function animate(): void {
    if (animating || !visible || params.speed === 0) {
        return;
    }
    animating = true;
    let lastTime = performance.now();
    function frame(time: number): void {
        if (!visible || params.speed === 0) {
            animating = false;
            return;
        }
        const seconds = (time - lastTime) / 1000;
        lastTime = time;
        moveBalls(balls, params.speed * seconds, domainWidth());
        draw();
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}
