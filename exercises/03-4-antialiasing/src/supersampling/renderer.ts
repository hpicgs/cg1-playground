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
let triangleProgram: WebGLProgram;
let resolveProgram: WebGLProgram;
let samplesProgram: WebGLProgram;
let shapeProgram: WebGLProgram;
let rasterWidth: number;
let rasterHeight: number;

// The samples: a texture with n × n texels per pixel of the raster, and its framebuffer.
let samples: WebGLTexture | null = null;
let sampleFramebuffer: WebGLFramebuffer;
let samplesPerAxis = 0;

// The raster that resolve.frag writes.
let resultFramebuffer: WebGLFramebuffer;

let triangleArray: WebGLVertexArrayObject;
let triangleBuffer: WebGLBuffer;
let quadArray: WebGLVertexArrayObject;
let shapeArray: WebGLVertexArrayObject;
let shapeBuffer: WebGLBuffer;

// Creates the WebGL context, the raster of width × height pixels, the buffers and the shader
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
    resultFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, resultFramebuffer);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    sampleFramebuffer = gl.createFramebuffer();

    // The triangle, and the grid, points and outline on top: x, y per point.
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

    // Two triangles that cover the whole raster, for resolve.frag.
    quadArray = gl.createVertexArray();
    gl.bindVertexArray(quadArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]),
        gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    setShaders(sources);
    return gl;
}

// Compiles and links the programs. If resolve.frag fails, the old program stays.
export function setShaders(sources: Record<string, string>): void {
    const nextShape = link(sources, "shape.vert", "shape.frag");
    gl.deleteProgram(shapeProgram);
    shapeProgram = nextShape;

    const nextTriangle = link(sources, "triangle.vert", "triangle.frag");
    gl.deleteProgram(triangleProgram);
    triangleProgram = nextTriangle;

    const nextSamples = link(sources, "quad.vert", "samples.frag");
    gl.deleteProgram(samplesProgram);
    samplesProgram = nextSamples;

    const nextResolve = link(sources, "quad.vert", "resolve.frag");
    gl.deleteProgram(resolveProgram);
    resolveProgram = nextResolve;
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

// Makes the texture of the samples n times as wide and as high as the raster.
function prepareSamples(n: number): void {
    if (n === samplesPerAxis) {
        return;
    }
    gl.deleteTexture(samples);
    samples = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, samples);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, n * rasterWidth, n * rasterHeight);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, sampleFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, samples, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    samplesPerAxis = n;
}

// Rasterizes the triangle with n × n samples per pixel, then lets resolve.frag write the
// raster. vertices holds x, y for each corner.
export function drawTriangle(vertices: Float32Array, n: number): void {
    // The samples: the GPU rasterizes the triangle into a raster n times as fine.
    prepareSamples(n);
    gl.bindFramebuffer(gl.FRAMEBUFFER, sampleFramebuffer);
    gl.viewport(0, 0, n * rasterWidth, n * rasterHeight);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(triangleProgram);
    gl.uniform2f(gl.getUniformLocation(triangleProgram, "size"), rasterWidth, rasterHeight);
    gl.bindVertexArray(triangleArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // The raster: resolve.frag runs once per pixel and reads the samples.
    gl.bindFramebuffer(gl.FRAMEBUFFER, resultFramebuffer);
    gl.viewport(0, 0, rasterWidth, rasterHeight);
    gl.useProgram(resolveProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, samples);
    gl.uniform1i(gl.getUniformLocation(resolveProgram, "samples"), 0);
    gl.uniform1i(gl.getUniformLocation(resolveProgram, "n"), n);
    gl.bindVertexArray(quadArray);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// Clears the canvas and copies the raster into rect, enlarged without interpolation.
export function showResult(rect: Rect): void {
    clearCanvas();

    // WebGL measures from the bottom left of the canvas.
    const bottom = gl.drawingBufferHeight - rect.top - rect.height;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, resultFramebuffer);
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

// Clears the canvas and shows the samples in rect, as dots if dots is true.
export function showSamples(rect: Rect, dots: boolean): void {
    clearCanvas();

    const bottom = gl.drawingBufferHeight - rect.top - rect.height;
    gl.viewport(rect.left, bottom, rect.width, rect.height);
    gl.useProgram(samplesProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, samples);
    gl.uniform1i(gl.getUniformLocation(samplesProgram, "samples"), 0);
    gl.uniform2f(gl.getUniformLocation(samplesProgram, "origin"), rect.left, bottom);
    gl.uniform1f(
        gl.getUniformLocation(samplesProgram, "scale"),
        rect.width / (rasterWidth * samplesPerAxis),
    );
    gl.uniform1i(gl.getUniformLocation(samplesProgram, "dots"), dots ? 1 : 0);
    gl.bindVertexArray(quadArray);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// Clears the whole canvas.
function clearCanvas(): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(canvasBackground[0], canvasBackground[1], canvasBackground[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
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
    gl.bindFramebuffer(gl.FRAMEBUFFER, resultFramebuffer);
    // The framebuffer counts rows from the bottom.
    gl.readPixels(i, rasterHeight - 1 - j, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return pixel.slice(0, 3);
}

// How many of the n × n samples of pixel (i, j) the rasterizer has set, with j = 0 the top row.
export function countSamples(i: number, j: number): number {
    const n = samplesPerAxis;
    const texels = new Uint8Array(4 * n * n);
    gl.bindFramebuffer(gl.FRAMEBUFFER, sampleFramebuffer);
    gl.readPixels(i * n, (rasterHeight - 1 - j) * n, n, n, gl.RGBA, gl.UNSIGNED_BYTE, texels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let count = 0;
    for (let k = 0; k < n * n; k++) {
        if (texels[4 * k] > 0) {
            count++;
        }
    }
    return count;
}
