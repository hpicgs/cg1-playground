// A rectangle on the canvas in device pixels, measured from the top left.
export type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

// How drawShape connects its points: line segments or a closed outline.
export type ShapeMode = "lines" | "loop";

// The attribute location of the vertex position in both vertex shaders.
const positionLocation = 0;

let gl: WebGL2RenderingContext;
let atlasProgram: WebGLProgram;
let shapeProgram: WebGLProgram;
let quadArray: WebGLVertexArrayObject;
let shapeArray: WebGLVertexArrayObject;
let shapeBuffer: WebGLBuffer;
let lutTexture: WebGLTexture;

// Creates the WebGL context, the square of two triangles, the LUT texture and both shader
// programs.
export function init(
    canvas: HTMLCanvasElement,
    sources: Record<string, string>,
): WebGL2RenderingContext {
    const context = canvas.getContext("webgl2");
    if (context === null) {
        throw new Error("WebGL 2 wird von diesem Browser nicht unterstützt");
    }
    gl = context;

    // Two triangles that form a square from -1 to 1.
    const positions = new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);
    quadArray = gl.createVertexArray();
    gl.bindVertexArray(quadArray);
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    shapeArray = gl.createVertexArray();
    gl.bindVertexArray(shapeArray);
    shapeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shapeBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    lutTexture = gl.createTexture();
    atlasProgram = link(sources, "quad.vert", "atlas.frag");
    shapeProgram = link(sources, "shape.vert", "shape.frag");
    return gl;
}

function link(sources: Record<string, string>, vertex: string, fragment: string): WebGLProgram {
    const vertexShader = compile(gl.VERTEX_SHADER, vertex, sources[vertex]);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, fragment, sources[fragment]);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, positionLocation, "position");
    gl.linkProgram(program);
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
        throw new Error(`${name}: ${gl.getShaderInfoLog(shader) ?? ""}`);
    }
    return shader;
}

// Uploads the LUT image, top row first, read without interpolation.
export function setLut(image: ImageData): void {
    gl.bindTexture(gl.TEXTURE_2D, lutTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        image.width,
        image.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image.data,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

// Fills the whole canvas with the background colour.
export function clear(): void {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.08, 0.09, 0.11, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// Shows the part of the LUT image between the texture coordinates (u0, v0) and (u1, v1) in
// rect.
export function drawLut(rect: Rect, u0: number, v0: number, u1: number, v1: number): void {
    const bottom = gl.drawingBufferHeight - rect.top - rect.height;
    gl.viewport(rect.left, bottom, rect.width, rect.height);
    gl.useProgram(atlasProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, lutTexture);
    gl.uniform1i(gl.getUniformLocation(atlasProgram, "lut"), 0);
    gl.uniform4f(gl.getUniformLocation(atlasProgram, "region"), u0, v0, u1, v1);
    gl.bindVertexArray(quadArray);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// Draws lines in rect. Points are given as x, y in units of size, y from the top.
export function drawShape(
    rect: Rect,
    size: number[],
    mode: ShapeMode,
    points: number[],
    color: number[],
): void {
    const bottom = gl.drawingBufferHeight - rect.top - rect.height;
    gl.viewport(rect.left, bottom, rect.width, rect.height);
    gl.useProgram(shapeProgram);
    gl.uniform2f(gl.getUniformLocation(shapeProgram, "size"), size[0], size[1]);
    gl.uniform3f(gl.getUniformLocation(shapeProgram, "color"), color[0], color[1], color[2]);
    gl.bindVertexArray(shapeArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, shapeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.DYNAMIC_DRAW);
    gl.drawArrays(mode === "lines" ? gl.LINES : gl.LINE_LOOP, 0, points.length / 2);
}
