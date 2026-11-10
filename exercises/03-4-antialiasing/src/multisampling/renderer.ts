// A rectangle on the canvas in device pixels, measured from the top left.
export type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

// A point in pixel coordinates of the raster.
export type Point = { x: number; y: number };

// What to draw at one resolution: the vertices (x, y) of the background, one triangle larger than
// the raster, followed by those of the thin rectangle, and the line that the shader draws on the
// background. Everything is in pixel coordinates of the raster.
export type Scene = {
    vertices: Float32Array;
    lineStart: Point;
    lineEnd: Point;
    lineWidth: number;
};

// A framebuffer with one colour buffer.
type Target = { framebuffer: WebGLFramebuffer; buffer: WebGLRenderbuffer };

// The framebuffers for one resolution of width × height pixels and count samples per pixel: one
// sample per pixel; MSAA with count samples per pixel and their means; supersampling with n × n
// texels per pixel (n × n = count) and the result of resolve.frag.
type Targets = {
    width: number;
    height: number;
    count: number;
    n: number;
    single: Target;
    multisample: Target;
    msaa: Target;
    samples: WebGLTexture;
    fine: WebGLFramebuffer;
    supersampled: Target;
};

// The attribute location of the vertex position.
const positionLocation = 0;

// The background has 3 vertices, the thin rectangle the 6 after them.
const backgroundVertices = 3;
const rectangleVertices = 6;

// Background colour of the canvas around the views. The views themselves are black.
const canvasBackground = [0.08, 0.09, 0.11];

let gl: WebGL2RenderingContext;
let sceneProgram: WebGLProgram;
let shapeProgram: WebGLProgram;
let quadSource: string | undefined;
// The student's resolve.frag from the demo "supersampling", or null if it does not compile.
let resolveProgram: WebGLProgram | null = null;
let rasterWidth: number;
let rasterHeight: number;

// The framebuffers for the raster and for the full resolution, which has the size of a view on
// the canvas. They are created when the first frame is drawn.
let raster: Targets | null = null;
let full: Targets | null = null;

let sceneArray: WebGLVertexArrayObject;
let sceneBuffer: WebGLBuffer;
let quadArray: WebGLVertexArrayObject;
let shapeArray: WebGLVertexArrayObject;
let shapeBuffer: WebGLBuffer;

// Creates the WebGL context, the buffers and the shader programs. The raster has width × height
// pixels.
export function init(
    canvas: HTMLCanvasElement,
    sources: Record<string, string>,
    width: number,
    height: number,
): WebGL2RenderingContext {
    // A canvas without multisampling, so the views can be copied onto it with blitFramebuffer.
    const context = canvas.getContext("webgl2", { antialias: false });
    if (context === null) {
        throw new Error("WebGL 2 wird von diesem Browser nicht unterstützt");
    }
    gl = context;
    rasterWidth = width;
    rasterHeight = height;

    // The scene and the grid: x, y per vertex.
    sceneArray = gl.createVertexArray();
    gl.bindVertexArray(sceneArray);
    sceneBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sceneBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    shapeArray = gl.createVertexArray();
    gl.bindVertexArray(shapeArray);
    shapeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shapeBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Two triangles that cover the whole view, for resolve.frag.
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

// A framebuffer whose colour buffer has width × height pixels and, if samples is above 0, that
// many samples per pixel.
function createTarget(width: number, height: number, samples: number): Target {
    const buffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, buffer);
    if (samples > 0) {
        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, width, height);
    } else {
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, width, height);
    }
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, buffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { framebuffer, buffer };
}

// All framebuffers for a resolution of width × height pixels with count samples per pixel.
function createTargets(width: number, height: number, count: number): Targets {
    const n = Math.round(Math.sqrt(count));
    const samples = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, samples);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, n * width, n * height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const fine = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fine);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, samples, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return {
        width,
        height,
        count,
        n,
        single: createTarget(width, height, 0),
        multisample: createTarget(width, height, count),
        msaa: createTarget(width, height, 0),
        samples,
        fine,
        supersampled: createTarget(width, height, 0),
    };
}

// Deletes all framebuffers of one resolution.
function deleteTargets(targets: Targets): void {
    for (const target of [
        targets.single,
        targets.multisample,
        targets.msaa,
        targets.supersampled,
    ]) {
        gl.deleteFramebuffer(target.framebuffer);
        gl.deleteRenderbuffer(target.buffer);
    }
    gl.deleteFramebuffer(targets.fine);
    gl.deleteTexture(targets.samples);
}

// Returns targets for width × height pixels and count samples per pixel: the given ones if they
// fit, else new ones.
function fitTargets(
    targets: Targets | null,
    width: number,
    height: number,
    count: number,
): Targets {
    if (
        targets !== null &&
        targets.width === width &&
        targets.height === height &&
        targets.count === count
    ) {
        return targets;
    }
    if (targets !== null) {
        deleteTargets(targets);
    }
    return createTargets(width, height, count);
}

// Compiles and links the programs of this demo.
export function setShaders(sources: Record<string, string>): void {
    const nextShape = link(sources, "shape.vert", "shape.frag");
    gl.deleteProgram(shapeProgram);
    shapeProgram = nextShape;

    const nextScene = link(sources, "scene.vert", "scene.frag");
    gl.deleteProgram(sceneProgram);
    sceneProgram = nextScene;
    quadSource = sources["quad.vert"];
}

// Compiles the student's resolve.frag. Returns false if it does not compile.
export function setResolve(resolveSource: string): boolean {
    gl.deleteProgram(resolveProgram);
    try {
        resolveProgram = link(
            { "quad.vert": quadSource, "resolve.frag": resolveSource },
            "quad.vert",
            "resolve.frag",
        );
    } catch {
        resolveProgram = null;
    }
    return resolveProgram !== null;
}

// Compiles both shaders and links them into a program.
function link(
    sources: Record<string, string | undefined>,
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

// Compiles one shader.
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

// The sample counts per pixel that the GPU offers for MSAA with RGBA8.
export function sampleCounts(): number[] {
    const counts = gl.getInternalformatParameter(
        gl.RENDERBUFFER,
        gl.RGBA8,
        gl.SAMPLES,
    ) as Int32Array;
    return Array.from(counts);
}

// How many samples per pixel the GPU really took for MSAA; it may take more than asked for.
export function msaaSamples(): number {
    if (raster === null) {
        return 0;
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, raster.multisample.buffer);
    return gl.getRenderbufferParameter(gl.RENDERBUFFER, gl.RENDERBUFFER_SAMPLES) as number;
}

// Clears a framebuffer of width × height pixels to black and draws the scene into it: first the
// background with the line from the shader, then the thin rectangle.
function rasterize(
    framebuffer: WebGLFramebuffer,
    width: number,
    height: number,
    scene: Scene,
): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(sceneProgram);
    const location = (name: string): WebGLUniformLocation | null =>
        gl.getUniformLocation(sceneProgram, name);
    gl.uniform2f(location("size"), rasterWidth, rasterHeight);
    gl.uniform2f(location("lineStart"), scene.lineStart.x, scene.lineStart.y);
    gl.uniform2f(location("lineEnd"), scene.lineEnd.x, scene.lineEnd.y);
    gl.uniform1f(location("lineWidth"), scene.lineWidth);
    gl.bindVertexArray(sceneArray);

    gl.uniform1i(location("shaderLine"), 1);
    gl.drawArrays(gl.TRIANGLES, 0, backgroundVertices);
    gl.uniform1i(location("shaderLine"), 0);
    gl.drawArrays(gl.TRIANGLES, backgroundVertices, rectangleVertices);
}

// Draws the scene with all three methods into the framebuffers of one resolution. The vertices
// stay in pixel coordinates of the raster; the viewport scales them to the resolution.
function drawInto(targets: Targets, scene: Scene): void {
    const { width, height, n } = targets;
    gl.bindBuffer(gl.ARRAY_BUFFER, sceneBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, scene.vertices, gl.DYNAMIC_DRAW);

    // One sample per pixel: the pixel centre.
    rasterize(targets.single.framebuffer, width, height, scene);

    // MSAA: the GPU rasterizes into the samples, and blitFramebuffer writes their mean.
    rasterize(targets.multisample.framebuffer, width, height, scene);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, targets.multisample.framebuffer);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, targets.msaa.framebuffer);
    gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);

    // Supersampling: the GPU rasterizes into a raster n times as fine, and the student's
    // resolve.frag writes the result.
    rasterize(targets.fine, n * width, n * height, scene);
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets.supersampled.framebuffer);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (resolveProgram !== null) {
        gl.useProgram(resolveProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, targets.samples);
        gl.uniform1i(gl.getUniformLocation(resolveProgram, "samples"), 0);
        gl.uniform1i(gl.getUniformLocation(resolveProgram, "n"), n);
        gl.bindVertexArray(quadArray);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// Clears a framebuffer of width × height pixels and draws triangle k of the scene into it, white.
function drawTriangle(
    framebuffer: WebGLFramebuffer,
    width: number,
    height: number,
    k: number,
): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(sceneProgram);
    gl.uniform2f(gl.getUniformLocation(sceneProgram, "size"), rasterWidth, rasterHeight);
    gl.uniform1i(gl.getUniformLocation(sceneProgram, "shaderLine"), 0);
    gl.bindVertexArray(sceneArray);
    gl.drawArrays(gl.TRIANGLES, 3 * k, 3);
}

// How many pixels of a framebuffer of width × height pixels are not black.
function countPixels(framebuffer: WebGLFramebuffer, width: number, height: number): number {
    const pixels = new Uint8Array(4 * width * height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let count = 0;
    for (let k = 0; k < width * height; k++) {
        if (pixels[4 * k] > 0) {
            count++;
        }
    }
    return count;
}

// How often the fragment shader of the scene runs on the raster with each method: one fragment
// per pixel and triangle whose pixel centre the triangle covers (1 Sample), per pixel and triangle
// with at least one covered sample (MSAA) and per covered sample (supersampling). Each triangle is
// drawn alone in white and the result is read back.
function countFragments(targets: Targets, scene: Scene): number[] {
    const { width, height, n } = targets;
    gl.bindBuffer(gl.ARRAY_BUFFER, sceneBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, scene.vertices, gl.DYNAMIC_DRAW);
    const totals = [0, 0, 0];
    for (let k = 0; k < (backgroundVertices + rectangleVertices) / 3; k++) {
        drawTriangle(targets.single.framebuffer, width, height, k);
        totals[0] += countPixels(targets.single.framebuffer, width, height);

        drawTriangle(targets.multisample.framebuffer, width, height, k);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, targets.multisample.framebuffer);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, targets.msaa.framebuffer);
        gl.blitFramebuffer(
            0,
            0,
            width,
            height,
            0,
            0,
            width,
            height,
            gl.COLOR_BUFFER_BIT,
            gl.NEAREST,
        );
        totals[1] += countPixels(targets.msaa.framebuffer, width, height);

        drawTriangle(targets.fine, n * width, n * height, k);
        totals[2] += countPixels(targets.fine, n * width, n * height);
    }
    return totals;
}

// Draws both scenes with all three methods and count samples per pixel: rasterScene on the
// raster, fullScene in full resolution of fullWidth × fullHeight pixels. Returns how often the
// fragment shader of the scene runs on the raster with 1 Sample, MSAA and supersampling.
export function drawScenes(
    rasterScene: Scene,
    fullScene: Scene,
    count: number,
    fullWidth: number,
    fullHeight: number,
): number[] {
    raster = fitTargets(raster, rasterWidth, rasterHeight, count);
    full = fitTargets(full, fullWidth, fullHeight, count);
    const fragments = countFragments(raster, rasterScene);
    drawInto(raster, rasterScene);
    drawInto(full, fullScene);
    return fragments;
}

// Clears the canvas and copies the results into rects, three per row: on the raster (enlarged
// without interpolation), then in full resolution (pixel for pixel).
export function showResults(rects: Rect[]): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(canvasBackground[0], canvasBackground[1], canvasBackground[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    [raster, full].forEach((targets, row) => {
        if (targets === null) {
            return;
        }
        [targets.single, targets.msaa, targets.supersampled].forEach((target, k) => {
            // WebGL measures from the bottom left of the canvas.
            const rect = rects[3 * row + k];
            const bottom = gl.drawingBufferHeight - rect.top - rect.height;
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, target.framebuffer);
            gl.blitFramebuffer(
                0,
                0,
                targets.width,
                targets.height,
                rect.left,
                bottom,
                rect.left + rect.width,
                bottom + rect.height,
                gl.COLOR_BUFFER_BIT,
                gl.NEAREST,
            );
        });
    });
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
}

// Draws lines between pairs of points in pixel coordinates of the raster, inside rect.
export function drawLines(rect: Rect, points: number[], color: number[]): void {
    const bottom = gl.drawingBufferHeight - rect.top - rect.height;
    gl.viewport(rect.left, bottom, rect.width, rect.height);
    gl.useProgram(shapeProgram);
    gl.uniform2f(gl.getUniformLocation(shapeProgram, "size"), rasterWidth, rasterHeight);
    gl.uniform3f(gl.getUniformLocation(shapeProgram, "color"), color[0], color[1], color[2]);
    gl.bindVertexArray(shapeArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, shapeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.LINES, 0, points.length / 2);
}
