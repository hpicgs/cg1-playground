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

// Background colour of the canvas around the raster. The raster itself is black.
const canvasBackground = [0.08, 0.09, 0.11];

let gl: WebGL2RenderingContext;
let program: WebGLProgram;
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
    // A canvas without multisampling, so the raster can be copied onto it with blitFramebuffer
    // and the lines on top stay sharp.
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

    // The triangle, and the grid, centres and outline on top: x, y per point.
    triangleArray = gl.createVertexArray();
    gl.bindVertexArray(triangleArray);
    triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    shapeArray = gl.createVertexArray();
    gl.bindVertexArray(shapeArray);
    shapeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shapeBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    setShaders(sources);
    return gl;
}

// Compiles and links both programs.
export function setShaders(sources: Record<string, string>): void {
    const nextShape = link(sources, "shape.vert", "shape.frag");
    gl.deleteProgram(shapeProgram);
    shapeProgram = nextShape;

    const next = link(sources, "triangle.vert", "triangle.frag");
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

// Rasterizes the triangle into the black raster. vertices holds x, y for each corner.
export function drawTriangle(vertices: Float32Array): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, rasterWidth, rasterHeight);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.uniform2f(gl.getUniformLocation(program, "size"), rasterWidth, rasterHeight);
    gl.bindVertexArray(triangleArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

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

// The number of pixels of the raster that the triangle has set.
export function countSetPixels(): number {
    const pixels = new Uint8Array(rasterWidth * rasterHeight * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.readPixels(0, 0, rasterWidth, rasterHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let count = 0;
    for (let k = 0; k < pixels.length; k += 4) {
        if (pixels[k] > 0) {
            count++;
        }
    }
    return count;
}
