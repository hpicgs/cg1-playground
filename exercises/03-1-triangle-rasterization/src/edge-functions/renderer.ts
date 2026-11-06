// A rectangle on the canvas in device pixels, measured from the top left.
export type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

// How drawShape uses its points: filled triangles, line segments, a closed outline or single
// points.
export type ShapeMode = "triangles" | "lines" | "loop" | "points";

// The attribute location of the vertex position in shape.vert.
const positionLocation = 0;

let gl: WebGL2RenderingContext;
let program: WebGLProgram;
let vertexArray: WebGLVertexArrayObject;
let buffer: WebGLBuffer;
let rasterWidth: number;
let rasterHeight: number;

// Creates the WebGL context, the buffer and the shader program. Points are given in pixel
// coordinates of a raster of width × height pixels.
export function init(
    canvas: HTMLCanvasElement,
    sources: Record<string, string>,
    width: number,
    height: number,
): WebGL2RenderingContext {
    const context = canvas.getContext("webgl2");
    if (context === null) {
        throw new Error("WebGL 2 wird von diesem Browser nicht unterstützt");
    }
    gl = context;
    rasterWidth = width;
    rasterHeight = height;

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
    gl.clearColor(0.08, 0.09, 0.11, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// Draws points in pixel coordinates of the raster, inside rect. The GPU rasterizes them like
// any other triangles, lines and points. A point size above 0 draws round points of that size in
// device pixels.
export function drawShape(
    rect: Rect,
    mode: ShapeMode,
    points: number[],
    color: number[],
    pointSize = 0,
): void {
    // WebGL measures the viewport from the bottom left of the canvas.
    const bottom = gl.drawingBufferHeight - rect.top - rect.height;
    gl.viewport(rect.left, bottom, rect.width, rect.height);
    gl.useProgram(program);
    gl.uniform2f(gl.getUniformLocation(program, "size"), rasterWidth, rasterHeight);
    gl.uniform3f(gl.getUniformLocation(program, "color"), color[0], color[1], color[2]);
    gl.uniform1f(gl.getUniformLocation(program, "pointSize"), pointSize);

    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.DYNAMIC_DRAW);
    const modes = {
        triangles: gl.TRIANGLES,
        lines: gl.LINES,
        loop: gl.LINE_LOOP,
        points: gl.POINTS,
    };
    gl.drawArrays(modes[mode], 0, points.length / 2);
}
