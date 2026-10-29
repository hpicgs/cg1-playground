#version 300 es

// Laplace filter, shown as beta + alpha · L.

precision highp float;

uniform sampler2D image;
uniform vec2 size;
uniform float alpha;
uniform float beta;

in vec2 uv;

out vec4 fragColor;

void main() {
    // TODO: implement your code here.
    fragColor = texture(image, uv);
}
