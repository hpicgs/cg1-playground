import GUI from "lil-gui";
import { mat4, vec3 } from "gl-matrix";
import * as renderer from "./renderer";
import * as plane from "./plane";
import { axes } from "./axes";
import { labelImage } from "./label";

// The three Euler angles in degrees and the order in which they are applied.
const params = {
    alpha: 0,
    beta: 0,
    gamma: 0,
    order: "zyx",
};

const orderOptions = { "Z-Y-X": "zyx", "X-Y-Z": "xyz" };

// The three rows of the resulting rotation matrix.
const readout = { row0: "", row1: "", row2: "" };

// The world axes and their labels.
const axisLength = 1.9;
const axisColor = [0.5, 0.56, 0.68];

// The camera orbits the origin at a fixed distance; dragging changes the two angles.
const distance = 7.4;
let azimuth = -68;
let elevation = 18;

let canvas: HTMLCanvasElement;
let gui: GUI;
let meshes: { mesh: renderer.Mesh; color: number[]; stripes: number }[];
let axisMesh: renderer.Mesh;
let axisLabels: { label: renderer.Label; at: number[] }[];

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
    axisMesh = renderer.createMesh(axes(axisLength));
    axisLabels = [
        { label: renderer.createLabel(labelImage("x")), at: [axisLength + 0.2, 0, 0] },
        { label: renderer.createLabel(labelImage("y")), at: [0, axisLength + 0.2, 0] },
        { label: renderer.createLabel(labelImage("z")), at: [0, 0, axisLength + 0.2] },
    ];

    gui = new GUI({ container: controls, title: "Eulerwinkel", width: 250 });
    gui.add(params, "alpha", -180, 180, 5).name("Roll α (x)");
    gui.add(params, "beta", -180, 180, 5).name("Nick β (y)");
    gui.add(params, "gamma", -180, 180, 5).name("Gier γ (z)");
    gui.add(params, "order", orderOptions).name("Reihenfolge");

    const matrixFolder = gui.addFolder("Rotationsmatrix");
    matrixFolder.domElement.classList.add("matrix");
    matrixFolder.add(readout, "row0").name("").disable();
    matrixFolder.add(readout, "row1").name("").disable();
    matrixFolder.add(readout, "row2").name("").disable();

    gui.onChange(draw);

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
        elevation = Math.min(85, Math.max(-85, elevation + (event.clientY - lastY) * 0.4));
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
        distance * Math.cos(radiansElevation) * Math.cos(radiansAzimuth),
        distance * Math.cos(radiansElevation) * Math.sin(radiansAzimuth),
        distance * Math.sin(radiansElevation),
    ];
}

// Camera and projection, as one matrix.
function viewProjection(position: vec3): mat4 {
    const view = mat4.create();
    mat4.lookAt(view, position, [0, 0, 0], [0, 0, 1]);
    const projection = mat4.create();
    mat4.perspective(projection, radians(40), canvas.width / canvas.height, 0.1, 100);
    const product = mat4.create();
    mat4.multiply(product, projection, view);
    return product;
}

/**
 * The rotation matrix of the three Euler angles, as the lecture writes it: the order Z-Y-X
 * means R = Rz(gamma) Ry(beta) Rx(alpha).
 */
function rotation(): mat4 {
    const aroundX = mat4.create();
    mat4.fromXRotation(aroundX, radians(params.alpha));
    const aroundY = mat4.create();
    mat4.fromYRotation(aroundY, radians(params.beta));
    const aroundZ = mat4.create();
    mat4.fromZRotation(aroundZ, radians(params.gamma));

    const order =
        params.order === "zyx" ? [aroundZ, aroundY, aroundX] : [aroundX, aroundY, aroundZ];
    const product = mat4.create();
    for (const factor of order) {
        mat4.multiply(product, product, factor);
    }
    return product;
}

function draw(): void {
    const position = eye();
    const camera = viewProjection(position);
    const model = rotation();

    renderer.clear();
    const identity = mat4.create();
    renderer.drawLines(axisMesh, identity, camera, axisColor);
    for (const part of meshes) {
        renderer.drawMesh(part.mesh, model, camera, part.color, part.stripes);
    }

    // The labels stand on the quad spanned by the camera's right and up vectors.
    const forward = vec3.create();
    vec3.normalize(forward, vec3.negate(forward, position));
    const right = vec3.create();
    vec3.normalize(right, vec3.cross(right, forward, [0, 0, 1]));
    const up = vec3.create();
    vec3.cross(up, right, forward);
    for (const axis of axisLabels) {
        renderer.drawLabel(axis.label, axis.at, camera, right, up, 0.3, axisColor);
    }

    showReadout(model);
}

// The three rows of the rotation matrix, as the lecture writes them.
function showReadout(matrix: mat4): void {
    readout.row0 = row(matrix, 0);
    readout.row1 = row(matrix, 1);
    readout.row2 = row(matrix, 2);
    for (const controller of gui.controllersRecursive()) {
        controller.updateDisplay();
    }
}

// One row of the matrix. gl-matrix stores it column by column, the lecture writes it row by row.
function row(matrix: mat4, index: number): string {
    const entries = [matrix[index], matrix[index + 4], matrix[index + 8]];
    return entries.map((value) => format(value).padStart(6)).join(" ");
}

// A number with at most two decimals, e.g. 1 or -0.71.
function format(value: number): string {
    return String(Number(value.toFixed(2)));
}

function radians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}
