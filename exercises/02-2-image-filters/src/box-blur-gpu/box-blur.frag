#version 300 es

// Box filter with radius r.

precision highp float;

uniform sampler2D image;
uniform vec2 size;
uniform int radius;

in vec2 uv;

out vec4 fragColor;

void main() {
    // TODO: implement your code here.
    fragColor = texture(image, uv);
}
