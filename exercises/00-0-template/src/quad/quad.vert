#version 300 es

in vec2 position;

uniform float angle;
uniform float size;
uniform float aspect;

out vec2 uv;

void main() {
    float c = cos(angle);
    float s = sin(angle);
    vec2 rotated = vec2(c * position.x - s * position.y, s * position.x + c * position.y);
    vec2 scaled = size * rotated;
    gl_Position = vec4(scaled.x / aspect, scaled.y, 0.0, 1.0);
    uv = position * 0.5 + 0.5;
}
