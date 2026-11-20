import GUI from "lil-gui";
import { mat4, vec3 } from "gl-matrix";
import * as renderer from "./renderer";
import settings from "../../config/deformations.json";

// The URL of every data file, by its path. Vite resolves the paths at build time, so no file
// list stands in this code.
const meshUrls = import.meta.glob<string>("../../assets/meshes/*.json", {
    eager: true,
    query: "?url",
    import: "default",
});
const stateUrls = import.meta.glob<string>("../../assets/deformations/*.json", {
    eager: true,
    query: "?url",
    import: "default",
});

// The tessellated body, in two levels of detail.
type MeshFile = {
    size: number[];
    positions: number[];
    triangles: number[];
    edges: number[];
};

// The stored positions of one deformation, one entry per strength step.
type StateFile = {
    strengths: number[];
    positions: number[][];
};

// What the camera looks at, and how far away it stands.
const target: vec3 = [0.5, 0, 0.95];
const distance = 6;

// "keine" shows the undeformed body and is where the demo starts.
const undeformed = "keine";

const params = {
    deformation: undeformed,
    strength: 1,
    detail: "fein",
    display: "Fläche",
};

let canvas: HTMLCanvasElement;

let mesh: renderer.Mesh | undefined;

// Which state is on the GPU, as "<deformation>-<detail>-<step>".
let shown = "";

// The body of each level of detail, created once.
const bodies = new Map<string, renderer.Mesh>();
let azimuth = -75;
let elevation = 12;

// The files already loaded, by their URL.
const files = new Map<string, MeshFile | StateFile>();

export function start(
    element: HTMLCanvasElement,
    controls: HTMLElement,
    sources: Record<string, string>,
): void {
    canvas = element;
    const gl = renderer.init(canvas, sources);

    const gui = new GUI({ container: controls, title: "Deformation", width: 230 });
    gui.add(params, "deformation", settings.deformations).name("Deformation");
    gui.add(params, "strength", 0, 1, 0.125).name("Stärke");
    gui.add(params, "detail", settings.levels).name("Feinheit");
    gui.add(params, "display", settings.displays).name("Darstellung");
    gui.onChange(() => {
        void update();
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

    void update();
}

export function rebuild(sources: Record<string, string>): void {
    renderer.build(sources);
    draw();
}

// Loads one file once and keeps it.
async function load<T extends MeshFile | StateFile>(url: string): Promise<T> {
    const held = files.get(url);
    if (held !== undefined) {
        return held as T;
    }
    const response = await fetch(url);
    const file = (await response.json()) as T;
    files.set(url, file);
    return file;
}

// Loads what the current controls need and shows that state.
async function update(): Promise<void> {
    const detail = params.detail;
    const deformation = params.deformation;
    const strength = params.strength;

    const file = await load<MeshFile>(meshUrls[`../../assets/meshes/saeule-${detail}.json`]);
    let body = bodies.get(detail);
    if (body === undefined) {
        body = renderer.createMesh(file.positions, file.triangles, file.edges);
        bodies.set(detail, body);
    }
    let positions = file.positions;
    let wanted = `${undeformed}-${detail}`;
    if (deformation !== undeformed) {
        const states = await load<StateFile>(
            stateUrls[`../../assets/deformations/${deformation}-${detail}.json`],
        );
        const step = nearest(states.strengths, strength);
        positions = states.positions[step];
        wanted = `${deformation}-${detail}-${step}`;
    }

    // Another control may have been used while a file was loading.
    if (params.detail !== detail || params.deformation !== deformation) {
        return;
    }
    if (wanted !== shown) {
        renderer.setPositions(body, positions);
        shown = wanted;
    }
    mesh = body;
    draw();
}

// The stored step that lies closest to a strength.
function nearest(strengths: number[], strength: number): number {
    let best = 0;
    for (let index = 1; index < strengths.length; index++) {
        if (Math.abs(strengths[index] - strength) < Math.abs(strengths[best] - strength)) {
            best = index;
        }
    }
    return best;
}

// Dragging on the canvas turns the camera around the body.
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
        elevation = Math.min(80, Math.max(-60, elevation + (event.clientY - lastY) * 0.4));
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
function viewProjection(): mat4 {
    const view = mat4.create();
    mat4.lookAt(view, eye(), target, [0, 0, 1]);
    const projection = mat4.create();
    mat4.perspective(projection, radians(35), canvas.width / canvas.height, 0.1, 100);
    const product = mat4.create();
    mat4.multiply(product, projection, view);
    return product;
}

function draw(): void {
    renderer.clear();
    if (mesh === undefined) {
        return;
    }
    const camera = viewProjection();
    const edges = params.display === settings.displays[1];
    renderer.drawFaces(mesh, camera, settings.stripes, edges);
    if (edges) {
        renderer.drawEdges(mesh, camera);
    }
}

function radians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}
