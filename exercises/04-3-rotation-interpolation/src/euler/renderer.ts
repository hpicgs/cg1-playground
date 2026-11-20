import type { mat4, vec3 } from "gl-matrix";
import type { Geometry } from "./plane";
import type { LabelImage } from "./label";

// One body on the GPU: its buffers and the number of indices.
export type Mesh = {
    vertexArray: WebGLVertexArrayObject;
    count: number;
};

// One label on the GPU: its texture and how wide the text is in units of its height.
export type Label = {
    texture: WebGLTexture;
    ratio: number;
};

// The attribute locations in the two vertex shaders.
const positionLocation = 0;
const normalLocation = 1;
const cornerLocation = 0;

// The colour behind the scene.
const background = [0.08, 0.09, 0.11];

let gl: WebGL2RenderingContext;
let bodyProgram: WebGLProgram;
let labelProgram: WebGLProgram;
let quad: WebGLVertexArrayObject;

/** Creates the WebGL context and the shader programs, and switches the depth test on. */
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
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    build(sources);
    quad = createQuad();
    return gl;
}

/** Builds the shader programs from new sources, after a change in the editor. */
export function build(sources: Record<string, string>): void {
    bodyProgram = link("plane.vert", "plane.frag", sources, [
        ["a_position", positionLocation],
        ["a_normal", normalLocation],
    ]);
    labelProgram = link("label.vert", "label.frag", sources, [["a_corner", cornerLocation]]);
}

// Compiles and links one program and binds its attribute locations.
function link(
    vertexFile: string,
    fragmentFile: string,
    sources: Record<string, string>,
    attributes: [string, number][],
): WebGLProgram {
    const vertexShader = compile(gl.VERTEX_SHADER, vertexFile, sources[vertexFile]);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentFile, sources[fragmentFile]);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    for (const [name, location] of attributes) {
        gl.bindAttribLocation(program, location, name);
    }
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Linken fehlgeschlagen: ${gl.getProgramInfoLog(program) ?? ""}`);
    }
    return program;
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

// The quad every label is drawn on, with its corners from (-1, -1) to (1, 1).
function createQuad(): WebGLVertexArrayObject {
    const vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(cornerLocation);
    gl.vertexAttribPointer(cornerLocation, 2, gl.FLOAT, false, 0, 0);
    return vertexArray;
}

/** Creates the buffers of one body and fills them with its geometry. */
export function createMesh(geometry: Geometry): Mesh {
    const vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.normals), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(normalLocation);
    gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);
    return { vertexArray, count: geometry.indices.length };
}

/** Uploads the image of a label as a texture. */
export function createLabel(label: LabelImage): Label {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, label.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { texture, ratio: label.ratio };
}

/** Clears the colour and the depth buffer. */
export function clear(): void {
    gl.clearColor(background[0], background[1], background[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

/**
 * Draws one body with its transformation.
 *
 * @param stripes - How many rings per unit length the fragment shader draws.
 */
export function drawMesh(
    mesh: Mesh,
    model: mat4,
    viewProjection: mat4,
    color: number[],
    stripes: number,
): void {
    gl.useProgram(bodyProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(bodyProgram, "u_model"), false, model);
    gl.uniformMatrix4fv(
        gl.getUniformLocation(bodyProgram, "u_viewProjection"),
        false,
        viewProjection,
    );
    gl.uniform3f(gl.getUniformLocation(bodyProgram, "u_color"), color[0], color[1], color[2]);
    gl.uniform1f(gl.getUniformLocation(bodyProgram, "u_stripes"), stripes);
    gl.bindVertexArray(mesh.vertexArray);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
}

/** Draws a line geometry, such as the world axes. */
export function drawLines(mesh: Mesh, model: mat4, viewProjection: mat4, color: number[]): void {
    gl.useProgram(bodyProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(bodyProgram, "u_model"), false, model);
    gl.uniformMatrix4fv(
        gl.getUniformLocation(bodyProgram, "u_viewProjection"),
        false,
        viewProjection,
    );
    gl.uniform3f(gl.getUniformLocation(bodyProgram, "u_color"), color[0], color[1], color[2]);
    gl.uniform1f(gl.getUniformLocation(bodyProgram, "u_stripes"), 0);
    gl.bindVertexArray(mesh.vertexArray);
    gl.drawElements(gl.LINES, mesh.count, gl.UNSIGNED_SHORT, 0);
}

/**
 * Draws a label at a point in the scene, facing the camera.
 *
 * @param height - How high the text is drawn, in world units.
 */
export function drawLabel(
    label: Label,
    center: number[],
    viewProjection: mat4,
    right: vec3,
    up: vec3,
    height: number,
    color: number[],
): void {
    gl.useProgram(labelProgram);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, label.texture);
    gl.uniform1i(gl.getUniformLocation(labelProgram, "u_text"), 0);
    gl.uniform3f(gl.getUniformLocation(labelProgram, "u_center"), center[0], center[1], center[2]);
    gl.uniform3f(gl.getUniformLocation(labelProgram, "u_right"), right[0], right[1], right[2]);
    gl.uniform3f(gl.getUniformLocation(labelProgram, "u_up"), up[0], up[1], up[2]);
    gl.uniform2f(
        gl.getUniformLocation(labelProgram, "u_size"),
        (height * label.ratio) / 2,
        height / 2,
    );
    gl.uniformMatrix4fv(
        gl.getUniformLocation(labelProgram, "u_viewProjection"),
        false,
        viewProjection,
    );
    gl.uniform3f(gl.getUniformLocation(labelProgram, "u_color"), color[0], color[1], color[2]);
    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
}
