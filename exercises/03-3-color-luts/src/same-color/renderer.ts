// A rectangle on the canvas in device pixels, measured from the top left.
export type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

// The attribute location of the vertex position in quad.vert.
const positionLocation = 0;

let gl: WebGL2RenderingContext;
let operationProgram: WebGLProgram;
let showProgram: WebGLProgram;
let vertexArray: WebGLVertexArrayObject;
let inputTexture: WebGLTexture;
let outputTexture: WebGLTexture;
let framebuffer: WebGLFramebuffer;
let imageWidth: number;
let imageHeight: number;

// Creates the WebGL context, the square of two triangles, both shader programs and the
// textures for an input and an output image of width × height pixels.
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
    imageWidth = width;
    imageHeight = height;

    // Two triangles that form a square from -1 to 1.
    const positions = new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);
    vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    operationProgram = link(sources, "quad.vert", "operation.frag");
    showProgram = link(sources, "quad.vert", "show.frag");

    // The input image with mipmaps, so the operation Glättung can read a coarser level. Shown
    // enlarged, it is read without interpolation.
    inputTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    gl.texStorage2D(gl.TEXTURE_2D, 4, gl.RGBA8, width, height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // The output image, written by operation.frag through a framebuffer.
    outputTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, outputTexture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Bytes are read back exactly.
    gl.disable(gl.DITHER);
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

// Uploads the input image, top row first, and builds its mipmaps.
export function setInput(image: ImageData): void {
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        image.width,
        image.height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image.data,
    );
    gl.generateMipmap(gl.TEXTURE_2D);
}

// Runs operation.frag once for every pixel of the output image and returns the output's
// bytes, top row first, four per pixel.
export function apply(operation: number): Uint8Array {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, imageWidth, imageHeight);
    gl.useProgram(operationProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    gl.uniform1i(gl.getUniformLocation(operationProgram, "image"), 0);
    gl.uniform2f(gl.getUniformLocation(operationProgram, "size"), imageWidth, imageHeight);
    gl.uniform1i(gl.getUniformLocation(operationProgram, "operation"), operation);
    gl.bindVertexArray(vertexArray);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Row y of the framebuffer is row y of the input, so the bytes come top row first.
    const bytes = new Uint8Array(4 * imageWidth * imageHeight);
    gl.readPixels(0, 0, imageWidth, imageHeight, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return bytes;
}

// Fills the whole canvas with the background colour.
export function clear(): void {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.08, 0.09, 0.11, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// Shows the input or the output image enlarged in rect. highlight is an input colour in [0, 1],
// or null.
export function show(which: "input" | "output", rect: Rect, highlight: number[] | null): void {
    const bottom = gl.drawingBufferHeight - rect.top - rect.height;
    gl.viewport(rect.left, bottom, rect.width, rect.height);
    gl.useProgram(showProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, which === "input" ? inputTexture : outputTexture);
    gl.uniform1i(gl.getUniformLocation(showProgram, "shown"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    gl.uniform1i(gl.getUniformLocation(showProgram, "inputImage"), 1);
    gl.uniform1i(gl.getUniformLocation(showProgram, "highlighting"), highlight === null ? 0 : 1);
    const color = highlight ?? [0, 0, 0];
    gl.uniform3f(gl.getUniformLocation(showProgram, "highlight"), color[0], color[1], color[2]);
    gl.bindVertexArray(vertexArray);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}
