import GUI from "lil-gui";
import { mat4, vec3 } from "gl-matrix";
import * as renderer from "./renderer";
import * as plane from "./plane";
import { labelImage } from "./label";
import states from "../../assets/interpolation.json";

// The three stored paths, in the order in which they stand next to each other.
const methods = [
    { key: "matrix", title: "Matrixkoeffizienten", lane: -2.0 },
    { key: "euler", title: "Eulerwinkel", lane: 0 },
    { key: "slerp", title: "Slerp", lane: 2.0 },
];

// How far a body travels along its lane between t = 0 and t = 1.
const travel = 0.8;

// How large the bodies are drawn, so that three of them fit next to each other.
const bodyScale = 0.68;

// Where the labels stand above their lane, and how high their text is drawn.
const labelHeight = 1.35;
const labelSize = 0.15;

// What the camera looks at. The scene sits a little left of the middle, so that the right body
// stays clear of the controls.
const target: vec3 = [0.45, 0, 0.3];

const params = {
    pair: "A",
    t: 0,
    tempo: 0,
};

const pairOptions = { A: "A", B: "B", C: "C" };

// The angles of the chosen pair and the determinant of the matrix path.
const readout = { start: "", end: "", determinant: "" };

const labelColor = [0.72, 0.76, 0.84];

// The camera orbits the middle of the scene at a fixed distance; dragging changes the angles.
// It stands far away and looks through a narrow angle, so that the three bodies are seen from
// almost the same direction and can be compared.
const distance = 11;
let azimuth = -90;
let elevation = 14;

let canvas: HTMLCanvasElement;
let gui: GUI;
let meshes: { mesh: renderer.Mesh; color: number[]; stripes: number }[];
let titles: renderer.Label[];
let visible = false;
let animating = false;
let forwards = true;

// The playback's own time. It runs continuously, while params.t sits on a stored state, so
// that a small tempo is not lost in the rounding.
let played = 0;

export function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): void {
    canvas = element;
    const gl = renderer.init(canvas, sources);

    meshes = [
        {
            mesh: renderer.createMesh(plane.fuselage),
            color: plane.fuselageColor,
            stripes: plane.fuselageStripes,
        },
        { mesh: renderer.createMesh(plane.leftWing), color: plane.leftWingColor, stripes: 0 },
        { mesh: renderer.createMesh(plane.rightWing), color: plane.rightWingColor, stripes: 0 },
        { mesh: renderer.createMesh(plane.fin), color: plane.finColor, stripes: 0 },
    ];
    titles = methods.map((method) => renderer.createLabel(labelImage(method.title)));

    gui = new GUI({ container: controls, title: "Interpolation", width: 250 });
    gui.add(params, "pair", pairOptions).name("Orientierungspaar");
    gui.add(params, "t", 0, 1, 0.01).name("t");
    gui.add(params, "tempo", 0, 2, 0.1).name("Tempo");
    gui.add(readout, "start").name("Start (α, β, γ)").disable();
    gui.add(readout, "end").name("Ziel (α, β, γ)").disable();
    gui.add(readout, "determinant").name("Determinante (Matrix)").disable();
    gui.onChange(() => {
        played = params.t;
        draw();
        animate();
    });

    orbitOnDrag();

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
    renderer.build(sources);
    draw();
}

// Called by the page when the demo scrolls in or out of view.
export function setVisible(isVisible: boolean): void {
    visible = isVisible;
    animate();
}

// Dragging on the canvas turns the camera around the scene.
function orbitOnDrag(): void {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    canvas.addEventListener("pointerdown", (event) => {
        dragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
        canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointerup", (event) => {
        dragging = false;
        canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
        if (!dragging) {
            return;
        }
        azimuth -= (event.clientX - lastX) * 0.4;
        elevation = Math.min(80, Math.max(-20, elevation + (event.clientY - lastY) * 0.4));
        lastX = event.clientX;
        lastY = event.clientY;
        draw();
    });
}

// Where the camera stands. The world is right-handed with z up.
function eye(): vec3 {
    const radiansAzimuth = radians(azimuth);
    const radiansElevation = radians(elevation);
    return [
        target[0] + distance * Math.cos(radiansElevation) * Math.cos(radiansAzimuth),
        target[1] + distance * Math.cos(radiansElevation) * Math.sin(radiansAzimuth),
        target[2] + distance * Math.sin(radiansElevation),
    ];
}

// Camera and projection, as one matrix.
function viewProjection(position: vec3): mat4 {
    const view = mat4.create();
    mat4.lookAt(view, position, target, [0, 0, 1]);
    const projection = mat4.create();
    mat4.perspective(projection, radians(17), canvas.width / canvas.height, 0.1, 100);
    const product = mat4.create();
    mat4.multiply(product, projection, view);
    return product;
}

// The stored states of the chosen pair.
function pair(): (typeof states.pairs)[number] {
    return states.pairs.find((entry) => entry.name === params.pair) ?? states.pairs[0];
}

// The stored orientation of one method at the current t, as the three columns of its matrix.
function orientation(method: string): number[] {
    const paths: Record<string, number[][]> = pair().paths;
    const step = Math.round(params.t * (states.steps - 1));
    return paths[method][step];
}

// The transformation of one body: its stored orientation, placed in its lane.
function model(method: string, lane: number): mat4 {
    const [a, b, c, d, e, f, g, h, i] = orientation(method);
    const stored = mat4.fromValues(a, b, c, 0, d, e, f, 0, g, h, i, 0, 0, 0, 0, 1);
    const place = mat4.create();
    mat4.fromTranslation(place, [lane + (params.t - 0.5) * travel, 0, 0]);
    const product = mat4.create();
    mat4.multiply(product, place, stored);
    mat4.scale(product, product, [bodyScale, bodyScale, bodyScale]);
    return product;
}

function draw(): void {
    const position = eye();
    const camera = viewProjection(position);

    renderer.clear();
    for (const method of methods) {
        const transformation = model(method.key, method.lane);
        for (const part of meshes) {
            renderer.drawMesh(part.mesh, transformation, camera, part.color, part.stripes);
        }
    }

    // The labels stand on the quad spanned by the camera's right and up vectors.
    const forward = vec3.create();
    vec3.normalize(forward, vec3.subtract(forward, target, position));
    const right = vec3.create();
    vec3.normalize(right, vec3.cross(right, forward, [0, 0, 1]));
    const up = vec3.create();
    vec3.cross(up, right, forward);
    methods.forEach((method, index) => {
        renderer.drawLabel(
            titles[index],
            [method.lane, 0, labelHeight],
            camera,
            right,
            up,
            labelSize,
            labelColor,
        );
    });

    showReadout();
}

// The angles of the chosen pair and the determinant of the matrix path at the current t.
function showReadout(): void {
    const chosen = pair();
    readout.start = angles(chosen.start);
    readout.end = angles(chosen.end);
    readout.determinant = determinant(orientation("matrix")).toFixed(3);
    for (const controller of gui.controllersRecursive()) {
        controller.updateDisplay();
    }
}

// A triple of Euler angles in degrees, e.g. "0°, 45°, 0°".
function angles(values: number[]): string {
    return values.map((value) => `${value}°`).join(", ");
}

// The determinant of a 3 x 3 matrix given column by column.
function determinant(columns: number[]): number {
    const at = (row: number, column: number): number => columns[3 * column + row];
    return (
        at(0, 0) * (at(1, 1) * at(2, 2) - at(1, 2) * at(2, 1)) -
        at(0, 1) * (at(1, 0) * at(2, 2) - at(1, 2) * at(2, 0)) +
        at(0, 2) * (at(1, 0) * at(2, 1) - at(1, 1) * at(2, 0))
    );
}

// Runs t forth and back while the tempo is above zero and the demo is in view.
function animate(): void {
    if (animating || !visible || params.tempo === 0) {
        return;
    }
    animating = true;
    let lastTime = performance.now();
    function frame(time: number): void {
        if (!visible || params.tempo === 0) {
            animating = false;
            return;
        }
        const seconds = (time - lastTime) / 1000;
        lastTime = time;
        const step = params.tempo * seconds * 0.5;
        played = Math.min(1, Math.max(0, played + (forwards ? step : -step)));
        if (played >= 1) {
            forwards = false;
        } else if (played <= 0) {
            forwards = true;
        }
        params.t = Math.round(played * 100) / 100;
        draw();
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

function radians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}
