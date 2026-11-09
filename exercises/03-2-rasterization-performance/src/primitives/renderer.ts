// A rectangle on the canvas in device pixels, measured from the top left.
export type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

// How drawShape connects its points: line segments, a closed outline or single points.
export type ShapeMode = "lines" | "loop" | "points";

// The attribute location of the vertex position.
const positionLocation = 0;

// Background colours of the canvas and of the empty raster.
const canvasBackground = [0.08, 0.09, 0.11];
const rasterBackground = [0.13, 0.14, 0.17];

// One colour per corner index: a triangle gets the colour of its last corner.
const triangleColors = [
    [0.36, 0.62, 0.93],
    [0.88, 0.56, 0.36],
    [0.45, 0.75, 0.48],
    [0.78, 0.47, 0.75],
    [0.89, 0.78, 0.38],
    [0.38, 0.76, 0.78],
];

// What each fragment adds to its pixel in the view "Fragmente pro Pixel".
const addColor = [0.26, 0.28, 0.33];

let gl: WebGL2RenderingContext;
let program: WebGLProgram;
let shapeProgram: WebGLProgram;
let framebuffer: WebGLFramebuffer;
let countFramebuffer: WebGLFramebuffer;
let rasterWidth: number;
let rasterHeight: number;
let cornerArray: WebGLVertexArrayObject;
let cornerBuffer: WebGLBuffer;
let shapeArray: WebGLVertexArrayObject;
let shapeBuffer: WebGLBuffer;

// Creates the WebGL context, two rasters of width × height pixels (one shown, one for counting
// fragments), the buffers and both shader programs.
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
    framebuffer = createRaster(width, height);
    countFramebuffer = createRaster(width, height);

    // The corners: x, y per corner.
    cornerArray = gl.createVertexArray();
    gl.bindVertexArray(cornerArray);
    cornerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Grid, centres, outline and corners: x, y per point.
    shapeArray = gl.createVertexArray();
    gl.bindVertexArray(shapeArray);
    shapeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shapeBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    program = link(sources, "triangles.vert", "triangles.frag");
    shapeProgram = link(sources, "shape.vert", "shape.frag");
    return gl;
}

// A framebuffer whose colour buffer has width × height pixels.
function createRaster(width: number, height: number): WebGLFramebuffer {
    const renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, width, height);
    const target = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return target;
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

// Draws the corners with one call of drawArrays into a raster. primitive is gl.TRIANGLES,
// gl.TRIANGLE_STRIP or gl.TRIANGLE_FAN. With adding, every fragment adds color to its pixel
// (Verblendung); otherwise each triangle gets its own colour.
function drawCorners(
    target: WebGLFramebuffer,
    corners: Float32Array,
    primitive: GLenum,
    adding: boolean,
    color: number[],
    background: number[],
): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, rasterWidth, rasterHeight);
    gl.clearColor(background[0], background[1], background[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.uniform2f(gl.getUniformLocation(program, "size"), rasterWidth, rasterHeight);
    gl.uniform3fv(gl.getUniformLocation(program, "colors"), triangleColors.flat());
    gl.uniform1i(gl.getUniformLocation(program, "adding"), adding ? 1 : 0);
    gl.uniform3f(gl.getUniformLocation(program, "addColor"), color[0], color[1], color[2]);
    if (adding) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
    }
    gl.bindVertexArray(cornerArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, corners, gl.DYNAMIC_DRAW);
    gl.drawArrays(primitive, 0, corners.length / 2);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// Draws the corners into the shown raster, coloured by triangle or by the number of fragments.
export function drawPrimitive(corners: Float32Array, primitive: GLenum, counting: boolean): void {
    drawCorners(framebuffer, corners, primitive, counting, addColor, rasterBackground);
}

// The number of fragments of every pixel, row by row from the top. Each fragment adds 1 to the
// red byte of its pixel in a second raster, which is then read back.
export function countFragments(corners: Float32Array, primitive: GLenum): number[] {
    drawCorners(countFramebuffer, corners, primitive, true, [1 / 255, 0, 0], [0, 0, 0]);
    const bytes = new Uint8Array(rasterWidth * rasterHeight * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, countFramebuffer);
    gl.readPixels(0, 0, rasterWidth, rasterHeight, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const counts: number[] = [];
    // The framebuffer counts rows from the bottom.
    for (let j = rasterHeight - 1; j >= 0; j--) {
        for (let i = 0; i < rasterWidth; i++) {
            counts.push(bytes[(j * rasterWidth + i) * 4]);
        }
    }
    return counts;
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
