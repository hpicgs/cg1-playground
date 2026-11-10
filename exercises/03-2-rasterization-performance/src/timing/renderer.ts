// A rectangle on the canvas in device pixels, measured from the top left.
export type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

// The attribute location of the vertex position.
const positionLocation = 0;

// Background colours of the canvas and of the empty raster.
const canvasBackground = [0.08, 0.09, 0.11];
const rasterBackground = [0.13, 0.14, 0.17];

let gl: WebGL2RenderingContext;
let program: WebGLProgram;
let framebuffer: WebGLFramebuffer;
let rasterSize: number;
let squareArray: WebGLVertexArrayObject;
let squareBuffer: WebGLBuffer;
let vertexCount = 0;
const pixel = new Uint8Array(4);

// Creates the WebGL context, a raster of size × size pixels, the buffer for one square and the
// shader program.
export function init(
    canvas: HTMLCanvasElement,
    sources: Record<string, string>,
    size: number,
): WebGL2RenderingContext {
    const context = canvas.getContext("webgl2", { antialias: false });
    if (context === null) {
        throw new Error("WebGL 2 wird von diesem Browser nicht unterstützt");
    }
    gl = context;
    rasterSize = size;

    // The raster: a framebuffer of fixed size, independent of the canvas.
    const renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, size, size);
    framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    squareArray = gl.createVertexArray();
    gl.bindVertexArray(squareArray);
    squareBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, squareBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const vertexShader = compile(gl.VERTEX_SHADER, "square.vert", sources["square.vert"]);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, "square.frag", sources["square.frag"]);
    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, positionLocation, "position");
    gl.linkProgram(program);
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
        throw new Error(`${name}: ${gl.getShaderInfoLog(shader) ?? ""}`);
    }
    return shader;
}

// Uploads the vertex array of one square: x, y for each corner of each triangle.
export function setSquare(vertices: Float32Array): void {
    gl.bindBuffer(gl.ARRAY_BUFFER, squareBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    vertexCount = vertices.length / 2;
}

// Clears the raster.
export function clear(): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.clearColor(rasterBackground[0], rasterBackground[1], rasterBackground[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// Draws the square count times into the raster, with one call of drawArrays per square and
// Verblendung on. The calls only queue commands; the GPU draws them later.
export function drawSquares(count: number): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, rasterSize, rasterSize);
    gl.useProgram(program);
    gl.uniform2f(gl.getUniformLocation(program, "size"), rasterSize, rasterSize);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(squareArray);
    for (let k = 0; k < count; k++) {
        gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    }
    gl.disable(gl.BLEND);
}

// Reads one pixel of the raster. readPixels returns only when the GPU has finished every
// command queued before it.
export function waitForGpu(): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
}

// Clears the canvas and copies the raster into rect, scaled down with interpolation.
export function showRaster(rect: Rect): void {
    if (rect.width <= 0 || rect.height <= 0) {
        return;
    }
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
        rasterSize,
        rasterSize,
        rect.left,
        bottom,
        rect.left + rect.width,
        bottom + rect.height,
        gl.COLOR_BUFFER_BIT,
        gl.LINEAR,
    );
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
}

// Whether the browser has lost the WebGL context, e.g. after too much work at once.
export function isLost(): boolean {
    return gl.isContextLost();
}
