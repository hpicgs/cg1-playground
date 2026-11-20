import GUI from "lil-gui";
import { mat4 } from "gl-matrix";
import * as renderer from "./renderer";
import { box, cylinder, merge, type Geometry } from "./geometry";

// The three nodes of the carousel and their controls.
const params = {
    platformAngle: 40,
    armLength: 1.4,
    gondolaAngle: -25,
    armOrder: "parent",
    node: "gondola",
};

const armOrderOptions = { "Eltern · lokal": "parent", "lokal · Eltern": "local" };
const nodeOptions = { Plattform: "platform", Arm: "arm", Gondel: "gondola" };

// The local transformation of the chosen node and the four rows of its total transformation.
const readout = { local: "", row0: "", row1: "", row2: "", row3: "" };

// One flat colour per body, and how many stripes per unit length it gets.
const platformColor = [0.36, 0.45, 0.62];
const armColor = [0.55, 0.57, 0.62];
const gondolaColor = [0.88, 0.56, 0.36];
const platformStripes = 1.0;
const armStripes = 2.5;
const gondolaStripes = 4.0;

// The camera orbits the origin at a fixed distance; dragging changes the two angles.
const distance = 7;
let azimuth = -65;
let elevation = 24;

let canvas: HTMLCanvasElement;
let gui: GUI;
let platformMesh: renderer.Mesh;
let armMesh: renderer.Mesh;
let gondolaMesh: renderer.Mesh;

export function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): void {
    canvas = element;
    const gl = renderer.init(canvas, sources);

    // The platform is the disc plus the mast that carries the arm.
    platformMesh = renderer.createMesh(
        merge(cylinder(1.8, 0.24, 48), box([0.22, 0.22, 1.0], [0, 0, 0.5])),
    );
    armMesh = renderer.createMesh(bar(params.armLength));
    gondolaMesh = renderer.createMesh(box([0.6, 0.6, 0.7], [0, 0, 0.55]));

    gui = new GUI({ container: controls, title: "Szenenhierarchie", width: 248 });
    gui.add(params, "platformAngle", -180, 180, 5).name("Plattform: Drehung");
    gui.add(params, "armLength", 0.5, 2, 0.1)
        .name("Arm: Länge r")
        .onChange(() => renderer.uploadMesh(armMesh, bar(params.armLength)));
    gui.add(params, "gondolaAngle", -180, 180, 5).name("Gondel: Drehung");
    gui.add(params, "armOrder", armOrderOptions).name("Verkettung im Arm");
    gui.add(params, "node", nodeOptions).name("Knoten");
    gui.add(readout, "local").name("Lokale Transformation").disable();

    const matrixFolder = gui.addFolder("Gesamttransformation");
    matrixFolder.domElement.classList.add("matrix");
    matrixFolder.add(readout, "row0").name("").disable();
    matrixFolder.add(readout, "row1").name("").disable();
    matrixFolder.add(readout, "row2").name("").disable();
    matrixFolder.add(readout, "row3").name("").disable();

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

// The arm as a bar from the platform's centre to the gondola, so its length is r.
function bar(length: number): Geometry {
    return box([length, 0.18, 0.16], [-length / 2, 0, 0.95]);
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
        elevation = Math.min(85, Math.max(-20, elevation + (event.clientY - lastY) * 0.4));
        lastX = event.clientX;
        lastY = event.clientY;
        draw();
    });
}

// Camera and projection, as one matrix. The world is right-handed with z up.
function viewProjection(): mat4 {
    const radiansAzimuth = radians(azimuth);
    const radiansElevation = radians(elevation);
    const eye: [number, number, number] = [
        distance * Math.cos(radiansElevation) * Math.cos(radiansAzimuth),
        distance * Math.cos(radiansElevation) * Math.sin(radiansAzimuth),
        distance * Math.sin(radiansElevation),
    ];
    const view = mat4.create();
    mat4.lookAt(view, eye, [0, 0, 0], [0, 0, 1]);
    const projection = mat4.create();
    mat4.perspective(projection, radians(40), canvas.width / canvas.height, 0.1, 100);
    const product = mat4.create();
    mat4.multiply(product, projection, view);
    return product;
}

/**
 * The transformation stack of each of the three nodes: the local transformations from the root
 * down to the node, in the order in which they are multiplied.
 */
function stacks(): Record<string, mat4[]> {
    const platformLocal = mat4.create();
    mat4.fromZRotation(platformLocal, radians(params.platformAngle));
    const armLocal = mat4.create();
    mat4.fromTranslation(armLocal, [params.armLength, 0, 0]);
    const gondolaLocal = mat4.create();
    mat4.fromZRotation(gondolaLocal, radians(params.gondolaAngle));

    // "Verkettung im Arm" decides whether the parent's or the arm's own transformation comes
    // first in the arm's part of the stack.
    const arm =
        params.armOrder === "parent" ? [platformLocal, armLocal] : [armLocal, platformLocal];
    return { platform: [platformLocal], arm, gondola: [...arm, gondolaLocal] };
}

// The total transformation of a node is the product of its stack, as the table on the page says.
function total(stack: mat4[]): mat4 {
    const product = mat4.create();
    for (const entry of stack) {
        mat4.multiply(product, product, entry);
    }
    return product;
}

function draw(): void {
    const camera = viewProjection();
    const paths = stacks();
    renderer.clear();
    renderer.drawMesh(platformMesh, paths.platform, camera, platformColor, platformStripes);
    renderer.drawMesh(armMesh, paths.arm, camera, armColor, armStripes);
    renderer.drawMesh(gondolaMesh, paths.gondola, camera, gondolaColor, gondolaStripes);
    showReadout(total(paths[params.node]));
}

// The local transformation of the chosen node as a symbol, and its total transformation row by
// row as in the lecture.
function showReadout(transformation: mat4): void {
    const locals = {
        platform: `Rz(${params.platformAngle}°)`,
        arm: `T(${params.armLength.toFixed(1)}, 0, 0)`,
        gondola: `Rz(${params.gondolaAngle}°)`,
    };
    readout.local = locals[params.node as keyof typeof locals];
    readout.row0 = row(transformation, 0);
    readout.row1 = row(transformation, 1);
    readout.row2 = row(transformation, 2);
    readout.row3 = row(transformation, 3);
    for (const controller of gui.controllersRecursive()) {
        controller.updateDisplay();
    }
}

// One row of the matrix. gl-matrix stores it column by column, the lecture writes it row by row.
function row(matrix: mat4, index: number): string {
    const entries = [matrix[index], matrix[index + 4], matrix[index + 8], matrix[index + 12]];
    return entries.map((value) => format(value).padStart(6)).join(" ");
}

// A number with at most two decimals, e.g. 1.4 or -0.77.
function format(value: number): string {
    return String(Number(value.toFixed(2)));
}

function radians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}
