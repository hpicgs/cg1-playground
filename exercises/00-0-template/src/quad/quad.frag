#version 300 es

precision highp float;

uniform vec3 color;

in vec2 uv;

out vec4 fragColor;

void main() {
    fragColor = vec4(color, 1.0);
}
