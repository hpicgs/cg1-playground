#version 300 es

// Two triangles that cover the drawn image. uv runs from (0, 0) at the top left to (1, 1) at
// the bottom right, like the pixel (i, j) on the CPU.

in vec2 position;

out vec2 uv;

void main() {
    uv = vec2(0.5 + 0.5 * position.x, 0.5 - 0.5 * position.y);
    gl_Position = vec4(position, 0.0, 1.0);
}
