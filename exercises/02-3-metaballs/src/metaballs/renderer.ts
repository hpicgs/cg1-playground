import type { Ball } from "./balls";

// What the shader gets as uniforms.
export type Scene = {
    balls: Ball[];
    lambda: number;
    threshold: number;
    insideColor: number[];
    outsideColor: number[];
};

// The length of the uniform array balls in metaballs.frag.
export const maxBalls = 8;

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
    const fragmentShader = compile(gl.FRAGMENT_SHADER, "metaballs.frag", sources["metaballs.frag"]);

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

// The centres and radii of the balls as x, y, r one after the other, padded with zeros to
// the length of the uniform array.
function ballArray(balls: Ball[]): Float32Array {
    const array = new Float32Array(3 * maxBalls);
    balls.forEach((ball, k) => {
        array.set([ball.x, ball.y, ball.r], 3 * k);
    });
    return array;
}

// Runs the shader once for every pixel of the canvas.
export function draw(scene: Scene): void {
    if (program === null) {
        return;
    }
    gl.useProgram(program);

    const size = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    gl.uniform2fv(gl.getUniformLocation(program, "size"), size);
    gl.uniform3fv(gl.getUniformLocation(program, "balls"), ballArray(scene.balls));
    gl.uniform1i(gl.getUniformLocation(program, "count"), scene.balls.length);
    gl.uniform1f(gl.getUniformLocation(program, "lambda"), scene.lambda);
    gl.uniform1f(gl.getUniformLocation(program, "threshold"), scene.threshold);
    gl.uniform3fv(gl.getUniformLocation(program, "insideColor"), scene.insideColor);
    gl.uniform3fv(gl.getUniformLocation(program, "outsideColor"), scene.outsideColor);

    // Two triangles with three vertices each.
    gl.bindVertexArray(vertexArray);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}
