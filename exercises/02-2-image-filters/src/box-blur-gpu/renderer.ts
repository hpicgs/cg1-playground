// An image on the GPU: its texture and its size in pixels.
export type Layer = {
    texture: WebGLTexture;
    width: number;
    height: number;
};

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
let program: WebGLProgram | null = null;
let vertexArray: WebGLVertexArrayObject;

// Creates the WebGL context, the square of two triangles and the shader program.
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
    vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    setShaders(sources);
    return gl;
}

// Compiles both shaders and links them. If this fails, the old program stays.
export function setShaders(sources: Record<string, string>): void {
    const vertexShader = compile(gl.VERTEX_SHADER, "quad.vert", sources["quad.vert"]);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, "box-blur.frag", sources["box-blur.frag"]);

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

    gl.deleteProgram(program);
    program = next;
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

// Uploads an image as a texture. The top row of the image is uploaded first, so it lies at
// v = 0, where quad.vert puts the top of the drawn image.
export function createLayer(image: ImageData): Layer {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
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

    // One texel per pixel, without interpolation.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Outside the image, the edge pixel is repeated.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return { texture, width: image.width, height: image.height };
}

// Fills the whole canvas with the background colour.
export function clear(): void {
    gl.clearColor(0.08, 0.09, 0.11, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// Runs the shader for every canvas pixel inside rect, with the layer as its input image.
export function draw(layer: Layer, rect: Rect, radius: number): void {
    if (program === null) {
        return;
    }

    // WebGL measures the viewport from the bottom left of the canvas.
    const bottom = gl.drawingBufferHeight - rect.top - rect.height;
    gl.viewport(rect.left, bottom, rect.width, rect.height);
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, layer.texture);
    gl.uniform1i(gl.getUniformLocation(program, "image"), 0);
    gl.uniform2f(gl.getUniformLocation(program, "size"), layer.width, layer.height);
    gl.uniform1i(gl.getUniformLocation(program, "radius"), radius);

    // Two triangles with three vertices each.
    gl.bindVertexArray(vertexArray);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}
