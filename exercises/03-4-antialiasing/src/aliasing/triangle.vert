#version 300 es

// Runs once per corner. position is in pixel coordinates of the raster: x to the right, y down,
// (0, 0) at the top left.

in vec2 position;

uniform vec2 size;

void main() {
    // From pixel coordinates to NDC; y is turned around, because it points up in NDC.
    float x = 2.0 * position.x / size.x - 1.0;
    float y = 1.0 - 2.0 * position.y / size.y;
    gl_Position = vec4(x, y, 0.0, 1.0);
}
