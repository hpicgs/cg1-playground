// A rectangle on the canvas in device pixels, measured from the top left.
export type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

// The part of the plane that the rectangle shows: x from left to right, y from bottom to top.
export type View = {
    left: number;
    right: number;
    bottom: number;
    top: number;
};

// How drawShape uses its points: filled triangles, a triangle fan, line segments, a closed
// outline or single points.
export type ShapeMode = "triangles" | "fan" | "lines" | "loop" | "points";

// The attribute location of the vertex position in shape.vert.
const positionLocation = 0;

// The colour around the drawing area.
const canvasBackground = [0.08, 0.09, 0.11];

// The identity, used wherever a shape is drawn unchanged.
const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];

let gl: WebGL2RenderingContext;
let program: WebGLProgram;
let vertexArray: WebGLVertexArrayObject;
let buffer: WebGLBuffer;
let view: View;

/**
 * Creates the WebGL context, the buffer and the shader program.
 *
 * @param view - The part of the plane that every later draw call shows.
 */
export function init(
    canvas: HTMLCanvasElement,
    sources: Record<string, string>,
    shownView: View,
): WebGL2RenderingContext {
    const context = canvas.getContext("webgl2");
    if (context === null) {
        throw new Error("WebGL 2 wird von diesem Browser nicht unterstützt");
    }
    gl = context;
    view = shownView;

    vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const vertexShader = compile(gl.VERTEX_SHADER, "shape.vert", sources["shape.vert"]);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, "shape.frag", sources["shape.frag"]);
    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, positionLocation, "position");
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Linken fehlgeschlagen: ${gl.getProgramInfoLog(program) ?? ""}`);
    }
    return gl;
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

// Fills the whole canvas with the background colour.
export function clear(): void {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(canvasBackground[0], canvasBackground[1], canvasBackground[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

/**
 * Draws points of the plane inside rect.
 *
 * @param transform - The 3 × 3 matrix the vertex shader applies to every point, written row by
 * row as in the lecture; the default is the identity.
 * @param pointSize - Above 0, the diameter of round points in device pixels.
 * @param hatch - Above 0, the shape is drawn as diagonal stripes this many device pixels apart.
 */
export function drawShape(
    rect: Rect,
    mode: ShapeMode,
    points: number[],
    color: number[],
    transform: number[] = identity,
    pointSize = 0,
    hatch = 0,
): void {
    // WebGL measures the viewport from the bottom left of the canvas.
    const bottom = gl.drawingBufferHeight - rect.top - rect.height;
    gl.viewport(rect.left, bottom, rect.width, rect.height);
    gl.useProgram(program);
    gl.uniform2f(
        gl.getUniformLocation(program, "center"),
        (view.left + view.right) / 2,
        (view.bottom + view.top) / 2,
    );
    gl.uniform2f(
        gl.getUniformLocation(program, "halfSize"),
        (view.right - view.left) / 2,
        (view.top - view.bottom) / 2,
    );
    gl.uniform3f(gl.getUniformLocation(program, "color"), color[0], color[1], color[2]);
    gl.uniform1f(gl.getUniformLocation(program, "pointSize"), pointSize);
    gl.uniform1f(gl.getUniformLocation(program, "hatch"), hatch);

    // GLSL stores a matrix column by column, the lecture writes it row by row, so the upload
    // transposes it.
    gl.uniformMatrix3fv(gl.getUniformLocation(program, "transform"), true, transform);

    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.DYNAMIC_DRAW);
    const modes = {
        triangles: gl.TRIANGLES,
        fan: gl.TRIANGLE_FAN,
        lines: gl.LINES,
        loop: gl.LINE_LOOP,
        points: gl.POINTS,
    };
    gl.drawArrays(modes[mode], 0, points.length / 2);
}
