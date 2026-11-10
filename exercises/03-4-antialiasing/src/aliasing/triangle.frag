#version 300 es

// Runs once for every fragment of the triangle: the triangle is white.

precision highp float;

out vec4 fragColor;

void main() {
    fragColor = vec4(1.0, 1.0, 1.0, 1.0);
}
