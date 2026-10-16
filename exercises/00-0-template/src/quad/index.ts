import GUI from "lil-gui";
import * as renderer from "./renderer";

const params = {
    color: [0.88, 0.56, 0.36] as [number, number, number],
    size: 0.5,
    speed: 0,
};

let angle = 0;
let visible = false;
let animating = false;

export function start(
    canvas: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): void {
    const gl = renderer.init(canvas, sources);

    const gui = new GUI({ container: controls, title: "Quadrat" });
    gui.addColor(params, "color").name("Farbe");
    gui.add(params, "size").step(0.05).name("Größe");
    gui.add(params, "speed", 0, 3, 0.1).name("Drehgeschwindigkeit");
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

function draw(): void {
    renderer.draw({ color: params.color, size: params.size, angle });
}

// Rotates the square while the speed is above zero and the demo is in view.
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
        angle += params.speed * seconds;
        draw();
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}
