let gl: WebGL2RenderingContext;
let program: WebGLProgram | null = null;
let vertexArray: WebGLVertexArrayObject;

export type QuadParams = {
    color: [number, number, number];
    size: number;
    angle: number;
};

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
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    setShaders(sources);
    return gl;
}

export function setShaders(sources: Record<string, string>): void {
    const vertexShader = compile(gl.VERTEX_SHADER, "quad.vert", sources["quad.vert"]);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, "quad.frag", sources["quad.frag"]);

    const next = gl.createProgram();
    gl.attachShader(next, vertexShader);
    gl.attachShader(next, fragmentShader);
    gl.bindAttribLocation(next, 0, "position");
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

export function draw(params: QuadParams): void {
    gl.clearColor(0.08, 0.09, 0.11, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (program === null) {
        return;
    }
    gl.useProgram(program);
    gl.uniform3fv(gl.getUniformLocation(program, "color"), params.color);
    gl.uniform1f(gl.getUniformLocation(program, "size"), params.size);
    gl.uniform1f(gl.getUniformLocation(program, "angle"), params.angle);
    gl.uniform1f(
        gl.getUniformLocation(program, "aspect"),
        gl.drawingBufferWidth / gl.drawingBufferHeight,
    );

    gl.bindVertexArray(vertexArray);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}
