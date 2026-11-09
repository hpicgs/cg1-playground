#version 300 es

// Lines on top of the LUT image, in units of the given size (y down).

in vec2 position;

uniform vec2 size;

void main() {
    float x = 2.0 * position.x / size.x - 1.0;
    float y = 1.0 - 2.0 * position.y / size.y;
    gl_Position = vec4(x, y, 0.0, 1.0);
}
