import type { mat4 } from "gl-matrix";

// The body on the GPU: its buffers, the number of triangle indices and the number of edge
// indices. The deformed positions are replaced whenever another state is shown.
export type Mesh = {
    vertexArray: WebGLVertexArrayObject;
    positions: WebGLBuffer;
    triangles: number;
    edges: number;
    edgeOffset: number;
};

// The attribute locations in the vertex shader.
const positionLocation = 0;
const restLocation = 1;

// The colour behind the scene.
const background = [0.08, 0.09, 0.11];

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
    const vertexShader = compile(gl.VERTEX_SHADER, "column.vert", sources["column.vert"]);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, "column.frag", sources["column.frag"]);
    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, positionLocation, "a_position");
    gl.bindAttribLocation(program, restLocation, "a_rest");
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Linken fehlgeschlagen: ${gl.getProgramInfoLog(program) ?? ""}`);
    }
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

/**
 * Creates the buffers of the body. The undeformed positions stay as they are; the deformed
 * ones are filled by `setPositions`.
 *
 * @param rest - The undeformed positions, three numbers per vertex.
 * @param triangles - The triangle indices, and after them the edge indices.
 */
export function createMesh(rest: number[], triangles: number[], edges: number[]): Mesh {
    const vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);

    const positions = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positions);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rest), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rest), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(restLocation);
    gl.vertexAttribPointer(restLocation, 3, gl.FLOAT, false, 0, 0);

    // Triangles and edges share one index buffer, the edges behind the triangles.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array([...triangles, ...edges]),
        gl.STATIC_DRAW,
    );

    return {
        vertexArray,
        positions,
        triangles: triangles.length,
        edges: edges.length,
        edgeOffset: triangles.length * 2,
    };
}

/** Replaces the deformed positions of the body with those of another stored state. */
export function setPositions(mesh: Mesh, positions: number[]): void {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positions);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(positions));
}

/** Clears the colour and the depth buffer. */
export function clear(): void {
    gl.clearColor(background[0], background[1], background[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

/**
 * Draws the faces of the body.
 *
 * @param offset - Whether the faces are pushed away from the camera, so that the edges drawn
 * over them do not fight with them for depth.
 */
export function drawFaces(
    mesh: Mesh,
    viewProjection: mat4,
    stripes: number,
    offset: boolean,
): void {
    gl.useProgram(program);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_viewProjection"), false, viewProjection);
    gl.uniform1f(gl.getUniformLocation(program, "u_stripes"), stripes);
    gl.uniform1i(gl.getUniformLocation(program, "u_edges"), 0);
    if (offset) {
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(1, 1);
    }
    gl.bindVertexArray(mesh.vertexArray);
    gl.drawElements(gl.TRIANGLES, mesh.triangles, gl.UNSIGNED_SHORT, 0);
    gl.disable(gl.POLYGON_OFFSET_FILL);
}

/** Draws the edges of the tessellation over the faces. */
export function drawEdges(mesh: Mesh, viewProjection: mat4): void {
    gl.useProgram(program);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_viewProjection"), false, viewProjection);
    gl.uniform1i(gl.getUniformLocation(program, "u_edges"), 1);
    gl.bindVertexArray(mesh.vertexArray);
    gl.drawElements(gl.LINES, mesh.edges, gl.UNSIGNED_SHORT, mesh.edgeOffset);
}
