#version 300 es

// One colour for every fragment.

precision highp float;

uniform vec3 color;

out vec4 fragColor;

void main() {
    fragColor = vec4(color, 1.0);
}
