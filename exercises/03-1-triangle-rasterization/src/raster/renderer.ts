// A rectangle on the canvas in device pixels, measured from the top left.
export type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

// How drawShape connects its points: line segments, a closed outline or single points.
export type ShapeMode = "lines" | "loop" | "points";

// The attribute locations of the vertex position and the vertex colour.
const positionLocation = 0;
const colorLocation = 1;

// Background colours of the canvas and of the empty raster.
const canvasBackground = [0.08, 0.09, 0.11];
const rasterBackground = [0.13, 0.14, 0.17];

let gl: WebGL2RenderingContext;
let program: WebGLProgram | null = null;
let shapeProgram: WebGLProgram;
let framebuffer: WebGLFramebuffer;
let rasterWidth: number;
let rasterHeight: number;
let triangleArray: WebGLVertexArrayObject;
let triangleBuffer: WebGLBuffer;
let shapeArray: WebGLVertexArrayObject;
let shapeBuffer: WebGLBuffer;

// Creates the WebGL context, the raster of width × height pixels, the buffers and both shader
// programs.
export function init(
    canvas: HTMLCanvasElement,
    sources: Record<string, string>,
    width: number,
    height: number,
): WebGL2RenderingContext {
    // Without antialiasing, so the raster can be copied onto the canvas with blitFramebuffer.
    const context = canvas.getContext("webgl2", { antialias: false });
    if (context === null) {
        throw new Error("WebGL 2 wird von diesem Browser nicht unterstützt");
    }
    gl = context;
    rasterWidth = width;
    rasterHeight = height;

    // The raster: a framebuffer whose colour buffer has width × height pixels.
    const renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, width, height);
    framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // The triangle: one vertex array with x, y, r, g, b per corner.
    const stride = (2 + 3) * 4;
    triangleArray = gl.createVertexArray();
    gl.bindVertexArray(triangleArray);
    triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, stride, 2 * 4);

    // Grid, centres, outline and corners: x, y per point.
    shapeArray = gl.createVertexArray();
    gl.bindVertexArray(shapeArray);
    shapeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shapeBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    setShaders(sources);
    return gl;
}

// Compiles and links both programs. If raster.vert or raster.frag fails, the old program stays.
export function setShaders(sources: Record<string, string>): void {
    const nextShape = link(sources, "shape.vert", "shape.frag");
    gl.deleteProgram(shapeProgram);
    shapeProgram = nextShape;

    const next = link(sources, "raster.vert", "raster.frag");
    gl.deleteProgram(program);
    program = next;
}

// Compiles both shaders and links them into a program.
function link(
    sources: Record<string, string>,
    vertexName: string,
    fragmentName: string,
): WebGLProgram {
    const vertexShader = compile(gl.VERTEX_SHADER, vertexName, sources[vertexName]);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentName, sources[fragmentName]);

    const next = gl.createProgram();
    gl.attachShader(next, vertexShader);
    gl.attachShader(next, fragmentShader);
    gl.bindAttribLocation(next, positionLocation, "position");
    gl.bindAttribLocation(next, colorLocation, "color");
    gl.linkProgram(next);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(next, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(next) ?? "";
        gl.deleteProgram(next);
        throw new Error(`Linken fehlgeschlagen: ${log}`);
    }
    return next;
}

// Compiles one shader. An error message starts with the file name, so the editor can mark
// the line.
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

// Rasterizes the triangle into the raster. vertices holds x, y, r, g, b for each corner.
export function drawTriangle(vertices: Float32Array): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, rasterWidth, rasterHeight);
    gl.clearColor(rasterBackground[0], rasterBackground[1], rasterBackground[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (program !== null) {
        gl.useProgram(program);
        gl.uniform2f(gl.getUniformLocation(program, "size"), rasterWidth, rasterHeight);
        gl.bindVertexArray(triangleArray);
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// Clears the canvas and copies the raster into rect, enlarged without interpolation.
export function showRaster(rect: Rect): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(canvasBackground[0], canvasBackground[1], canvasBackground[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // WebGL measures from the bottom left of the canvas.
    const bottom = gl.drawingBufferHeight - rect.top - rect.height;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
    gl.blitFramebuffer(
        0,
        0,
        rasterWidth,
        rasterHeight,
        rect.left,
        bottom,
        rect.left + rect.width,
        bottom + rect.height,
        gl.COLOR_BUFFER_BIT,
        gl.NEAREST,
    );
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
}

// Draws points in pixel coordinates of the raster on top of the canvas, inside rect. A point
// size above 0 draws round points of that size in device pixels.
export function drawShape(
    rect: Rect,
    mode: ShapeMode,
    points: number[],
    color: number[],
    pointSize = 0,
): void {
    const bottom = gl.drawingBufferHeight - rect.top - rect.height;
    gl.viewport(rect.left, bottom, rect.width, rect.height);
    gl.useProgram(shapeProgram);
    gl.uniform2f(gl.getUniformLocation(shapeProgram, "size"), rasterWidth, rasterHeight);
    gl.uniform3f(gl.getUniformLocation(shapeProgram, "color"), color[0], color[1], color[2]);
    gl.uniform1f(gl.getUniformLocation(shapeProgram, "pointSize"), pointSize);

    gl.bindVertexArray(shapeArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, shapeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.DYNAMIC_DRAW);
    const modes = { lines: gl.LINES, loop: gl.LINE_LOOP, points: gl.POINTS };
    gl.drawArrays(modes[mode], 0, points.length / 2);
}

// The bytes R, G and B of pixel (i, j) of the raster, with j = 0 the top row.
export function readPixel(i: number, j: number): Uint8Array {
    const pixel = new Uint8Array(4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    // The framebuffer counts rows from the bottom.
    gl.readPixels(i, rasterHeight - 1 - j, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return pixel.slice(0, 3);
}
