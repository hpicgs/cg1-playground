import type { mat4 } from "gl-matrix";
import type { Geometry } from "./geometry";

// One body on the GPU: its buffers and the number of indices.
export type Mesh = {
    vertexArray: WebGLVertexArrayObject;
    positions: WebGLBuffer;
    normals: WebGLBuffer;
    indices: WebGLBuffer;
    count: number;
};

// The attribute locations in hierarchy.vert.
const positionLocation = 0;
const normalLocation = 1;

// The colour behind the scene.
const background = [0.08, 0.09, 0.11];

// How many local transformations a stack holds at most, as in hierarchy.vert.
const stackSize = 3;

// Unused levels of the stack are filled with this.
const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

let gl: WebGL2RenderingContext;
let program: WebGLProgram;

/** Creates the WebGL context and the shader program, and switches the depth test on. */
export function init(
    canvas: HTMLCanvasElement,
    sources: Record<string, string>,
): WebGL2RenderingContext {
    const context = canvas.getContext("webgl2");
    if (context === null) {
        throw new Error("WebGL 2 wird von diesem Browser nicht unterstützt");
    }
    gl = context;
    gl.enable(gl.DEPTH_TEST);
    build(sources);
    return gl;
}

/** Builds the shader program from new sources, after a change in the editor. */
export function build(sources: Record<string, string>): void {
    const vertexShader = compile(gl.VERTEX_SHADER, "hierarchy.vert", sources["hierarchy.vert"]);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, "hierarchy.frag", sources["hierarchy.frag"]);
    const built = gl.createProgram();
    gl.attachShader(built, vertexShader);
    gl.attachShader(built, fragmentShader);
    gl.bindAttribLocation(built, positionLocation, "a_position");
    gl.bindAttribLocation(built, normalLocation, "a_normal");
    gl.linkProgram(built);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(built, gl.LINK_STATUS)) {
        throw new Error(`Linken fehlgeschlagen: ${gl.getProgramInfoLog(built) ?? ""}`);
    }
    program = built;
}

// Compiles one shader. An error message starts with the file name.
function compile(type: GLenum, name: string, source: string | undefined): WebGLShader {
    if (source === undefined) {
        throw new Error(`${name} fehlt`);
    }
    const shader = gl.createShader(type);
    if (shader === null) {
        throw new Error(`${name}: Shader konnte nicht erzeugt werden`);
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader) ?? "";
        gl.deleteShader(shader);
        throw new Error(`${name}: ${log}`);
    }
    return shader;
}

/** Creates the buffers of one body and fills them with its geometry. */
export function createMesh(geometry: Geometry): Mesh {
    const mesh: Mesh = {
        vertexArray: gl.createVertexArray(),
        positions: gl.createBuffer(),
        normals: gl.createBuffer(),
        indices: gl.createBuffer(),
        count: 0,
    };
    gl.bindVertexArray(mesh.vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positions);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normals);
    gl.enableVertexAttribArray(normalLocation);
    gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
    uploadMesh(mesh, geometry);
    return mesh;
}

/** Replaces the geometry of a body, for example when the arm gets longer. */
export function uploadMesh(mesh: Mesh, geometry: Geometry): void {
    gl.bindVertexArray(mesh.vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positions);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.positions), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normals);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.normals), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.DYNAMIC_DRAW);
    mesh.count = geometry.indices.length;
}

/** Clears the colour and the depth buffer. */
export function clear(): void {
    gl.clearColor(background[0], background[1], background[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

/**
 * Draws one body with the transformation stack of its node.
 *
 * @param stack - The local transformations from the root down to the body's node, which the
 * vertex shader composes. Unused levels are the identity.
 * @param stripes - How many stripes per unit length the fragment shader draws.
 */
export function drawMesh(
    mesh: Mesh,
    stack: mat4[],
    viewProjection: mat4,
    color: number[],
    stripes: number,
): void {
    gl.useProgram(program);
    const entries = new Float32Array(16 * stackSize);
    for (let level = 0; level < stackSize; level++) {
        entries.set(stack[level] ?? identity, 16 * level);
    }
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_stack"), false, entries);
    gl.uniform1i(gl.getUniformLocation(program, "u_depth"), stack.length);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_viewProjection"), false, viewProjection);
    gl.uniform3f(gl.getUniformLocation(program, "u_color"), color[0], color[1], color[2]);
    gl.uniform1f(gl.getUniformLocation(program, "u_stripes"), stripes);
    gl.bindVertexArray(mesh.vertexArray);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
}
